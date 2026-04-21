// src/services/requestService.ts
import { prisma } from "../prisma/client";
import { Prisma, type RequestStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import type { AuthRequest } from "../middleware/authMiddleware";
import { storageService } from "./storage";
import {
  canStaffChangeStatus,
  formatStatusLabel,
  formatStatusLabelForFile,
  formatDateTimeCell,
  normalizeMultipartFilename,
} from "../utils/requestUtils";
import {
  canAccessOwnedRequest,
  isStaffRole,
} from "./request/requestAccessPolicies";
import {
  determineAssignmentSaveMode,
  getAssignmentDeleteNextStatus,
} from "./request/requestAssignmentPolicies";
import {
  decorateRequestDetailRecord,
  sanitizeRequestDetailForRole,
} from "./request/requestVisibility";
import { buildAuditChanges } from "./auditLogService";
import { normalizeVehicleBodyTypeForStorage } from "./vehicleCatalog";

let requestCompanyContactColumnsSupported: boolean | null = null;
let requestAddressBookReferenceColumnsSupported: boolean | null = null;
const ASSIGNMENT_TRANSACTION_RETRY_LIMIT = 3;

function isRetryableAssignmentWriteError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function isActiveAssignmentUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function runAssignmentWriteTransaction<T>(
  operation: () => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= ASSIGNMENT_TRANSACTION_RETRY_LIMIT; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        isRetryableAssignmentWriteError(error) &&
        attempt < ASSIGNMENT_TRANSACTION_RETRY_LIMIT
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("배차정보 저장 중 재시도 한도를 초과했습니다.");
}

export async function hasRequestCompanyContactColumns() {
  if (requestCompanyContactColumnsSupported !== null) {
    return requestCompanyContactColumnsSupported;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'Request'
       AND column_name IN ('targetCompanyContactName', 'targetCompanyContactPhone')`
  );

  requestCompanyContactColumnsSupported = rows.length === 2;
  return requestCompanyContactColumnsSupported;
}

export async function hasRequestAddressBookReferenceColumns() {
  if (requestAddressBookReferenceColumnsSupported !== null) {
    return requestAddressBookReferenceColumnsSupported;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{ column_name: string }>>(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'Request'
       AND column_name IN ('pickupAddressBookId', 'dropoffAddressBookId')`
  );

  requestAddressBookReferenceColumnsSupported = rows.length === 2;
  return requestAddressBookReferenceColumnsSupported;
}

function isAddressBookTypeAllowed(
  type: "PICKUP" | "DROPOFF" | "BOTH",
  direction: "pickup" | "dropoff"
) {
  if (type === "BOTH") {
    return true;
  }

  return direction === "pickup" ? type === "PICKUP" : type === "DROPOFF";
}

async function resolveSelectedAddressBookReference(
  addressBookId: number | string | null | undefined,
  direction: "pickup" | "dropoff",
  placeName: string,
  address: string
) {
  if (addressBookId == null || addressBookId === "") {
    return null;
  }

  const normalizedAddressBookId = Number(addressBookId);
  if (!Number.isInteger(normalizedAddressBookId) || normalizedAddressBookId <= 0) {
    throw Object.assign(new Error("선택한 주소록 참조값이 올바르지 않습니다."), {
      statusCode: 400,
    });
  }

  const addressBook = await prisma.addressBook.findUnique({
    where: { id: normalizedAddressBookId },
    select: {
      id: true,
      placeName: true,
      address: true,
      type: true,
    },
  });

  if (!addressBook) {
    throw Object.assign(new Error("선택한 주소록 항목을 찾을 수 없습니다."), {
      statusCode: 400,
    });
  }

  if (!isAddressBookTypeAllowed(addressBook.type, direction)) {
    throw Object.assign(
      new Error(
        direction === "pickup"
          ? "선택한 주소록 항목은 출발지에 사용할 수 없습니다."
          : "선택한 주소록 항목은 도착지에 사용할 수 없습니다."
      ),
      { statusCode: 400 }
    );
  }

  if (addressBook.placeName !== placeName || addressBook.address !== address) {
    throw Object.assign(
      new Error("선택한 주소록 항목과 요청 장소 정보가 일치하지 않습니다."),
      { statusCode: 400 }
    );
  }

  return addressBook.id;
}

async function resolveFallbackAddressMemo(params: {
  companyName?: string | null;
  placeName: string;
  address: string;
  direction: "pickup" | "dropoff";
}) {
  const { companyName, placeName, address, direction } = params;
  const allowedTypes =
    direction === "pickup" ? (["PICKUP", "BOTH"] as const) : (["DROPOFF", "BOTH"] as const);

  const row = await prisma.addressBook.findFirst({
    where: {
      placeName,
      address,
      type: { in: [...allowedTypes] },
      ...(companyName?.trim()
        ? {
            user: {
              companyName: companyName.trim(),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    select: {
      memo: true,
    },
  });

  return row?.memo?.trim() || null;
}

async function appendRequestAddressMemos<
  T extends {
    ownerCompany?: { name: string } | null;
    pickupAddressBook?: { memo?: string | null; type: "PICKUP" | "DROPOFF" | "BOTH" } | null;
    dropoffAddressBook?: { memo?: string | null; type: "PICKUP" | "DROPOFF" | "BOTH" } | null;
    pickupPlaceName: string;
    pickupAddress: string;
    dropoffPlaceName: string;
    dropoffAddress: string;
  }
>(request: T) {
  const {
    pickupAddressBook,
    dropoffAddressBook,
    ...rest
  } = request;
  const pickupMemoFromReference =
    pickupAddressBook && isAddressBookTypeAllowed(pickupAddressBook.type, "pickup")
      ? pickupAddressBook.memo?.trim() || null
      : null;
  const dropoffMemoFromReference =
    dropoffAddressBook && isAddressBookTypeAllowed(dropoffAddressBook.type, "dropoff")
      ? dropoffAddressBook.memo?.trim() || null
      : null;

  const pickupMemo =
    pickupMemoFromReference ??
    (await resolveFallbackAddressMemo({
      companyName: request.ownerCompany?.name,
      placeName: request.pickupPlaceName,
      address: request.pickupAddress,
      direction: "pickup",
    }));
  const dropoffMemo =
    dropoffMemoFromReference ??
    (await resolveFallbackAddressMemo({
      companyName: request.ownerCompany?.name,
      placeName: request.dropoffPlaceName,
      address: request.dropoffAddress,
      direction: "dropoff",
    }));

  return {
    ...rest,
    pickupMemo,
    dropoffMemo,
  };
}

async function findCompanyByUser(userId: number) {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyName: true },
  });

  const normalizedCompanyName = me?.companyName?.trim();
  if (!normalizedCompanyName) {
    return null;
  }

  const company = await prisma.companyName.findUnique({
    where: { name: normalizedCompanyName },
    select: { id: true, name: true },
  });

  return company;
}

function parseLocalDateBoundary(value: string, endOfDay: boolean) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return new Date(value);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0);
}

async function resolveRequestOwnerCompany(userId: number, targetCompanyName?: string | null) {
  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, companyName: true },
  });

  if (!creator) {
    throw Object.assign(new Error("요청 생성 사용자를 찾을 수 없습니다."), { statusCode: 404 });
  }

  const isStaff =
    creator.role === "ADMIN" || creator.role === "DISPATCHER" || creator.role === "SALES";
  const requestedCompanyName = targetCompanyName?.trim() || "";
  const ownerCompanyName = isStaff
    ? requestedCompanyName
    : creator.companyName?.trim() || "";

  if (!ownerCompanyName) {
    throw Object.assign(
      new Error(
        isStaff
          ? "직원 계정은 배차 접수 시 업체를 반드시 선택해야 합니다."
          : "고객 계정은 소속 업체 정보가 있어야 배차를 접수할 수 있습니다."
      ),
      { statusCode: 400 }
    );
  }

  const ownerCompany = await prisma.companyName.upsert({
    where: { name: ownerCompanyName },
    update: {},
    create: { name: ownerCompanyName },
    select: { id: true, name: true },
  });

  return ownerCompany;
}

function formatAuditValue(value: unknown) {
  if (value == null || value === "") return "-";
  if (typeof value === "boolean") return value ? "예" : "아니오";
  return String(value);
}

function pushAuditChange(changes: string[], label: string, before: unknown, after: unknown) {
  const normalizedBefore = before ?? null;
  const normalizedAfter = after ?? null;
  if (normalizedBefore === normalizedAfter) return;
  changes.push(`${label}: ${formatAuditValue(normalizedBefore)} -> ${formatAuditValue(normalizedAfter)}`);
}

// ─────────────────────────────────────────────────────────────
// 기존 (유지)
// ─────────────────────────────────────────────────────────────

export async function buildListWhere(req: AuthRequest, query: {
  status?: string;
  from?: string;
  to?: string;
  dateType?: string;
  pickupKeyword?: string;
  dropoffKeyword?: string;
}) {
  const { status, from, to, dateType, pickupKeyword, dropoffKeyword } = query;
  const where: any = {};

  if (!req.user) {
    return null;
  }

  if (req.user.role === "CLIENT") {
    const company = await findCompanyByUser(req.user.userId);
    if (!company) {
      where.id = -1;
    } else {
      where.ownerCompanyId = company.id;
    }
  }

  if (status && status !== "ALL") {
    where.status = status as RequestStatus;
  }

  if (from || to) {
    if (dateType === "PICKUP_DATE") {
      // 상차일 기준: 예약상차는 pickupDatetime, 바로상차(pickupIsImmediate=true)는 createdAt 사용
      const fromDt = from ? parseLocalDateBoundary(from, false) : null;
      const toDt = to ? parseLocalDateBoundary(to, true) : null;

      const pickupRange: any = {};
      if (fromDt) pickupRange.gte = fromDt;
      if (toDt) pickupRange.lte = toDt;

      const createdAtRange: any = {};
      if (fromDt) createdAtRange.gte = fromDt;
      if (toDt) createdAtRange.lte = toDt;

      const andFiltersPickup: any[] = [
        {
          OR: [
            // 예약상차: pickupDatetime 범위
            { pickupIsImmediate: false, pickupDatetime: pickupRange },
            // 바로상차: createdAt을 상차일로 취급
            { pickupIsImmediate: true, createdAt: createdAtRange },
          ],
        },
      ];
      where.AND = [...(where.AND ?? []), ...andFiltersPickup];
    } else {
      where.createdAt = {};
      if (from) (where.createdAt as any).gte = parseLocalDateBoundary(from, false);
      if (to) (where.createdAt as any).lte = parseLocalDateBoundary(to, true);
    }
  }

  const MAX_KEYWORD_LEN = 100;
  const andFilters: any[] = [];
  if (pickupKeyword?.trim()) {
    andFilters.push({
      pickupPlaceName: { contains: pickupKeyword.trim().slice(0, MAX_KEYWORD_LEN) },
    });
  }
  if (dropoffKeyword?.trim()) {
    andFilters.push({
      dropoffPlaceName: { contains: dropoffKeyword.trim().slice(0, MAX_KEYWORD_LEN) },
    });
  }
  if (andFilters.length > 0) {
    where.AND = [...(where.AND ?? []), ...andFilters];
  }

  return where;
}

export async function canAccessRequestByRole(
  req: AuthRequest,
  request: {
    ownerCompanyId: number | null;
  }
) {
  if (!req.user) return false;

  const company = await findCompanyByUser(req.user.userId);
  return canAccessOwnedRequest(req.user.role, company?.id, request.ownerCompanyId);
}

export function canManageRequestImagesByRole(req: AuthRequest) {
  return isStaffRole(req.user?.role);
}

// ─────────────────────────────────────────────────────────────
// 신규 서비스 함수
// ─────────────────────────────────────────────────────────────

// GET /requests/recent
export async function fetchRecentRequestsList(req: AuthRequest, limit: number) {
  const userId = req.user!.userId;
  const where: any = {};

  if (req.user!.role === "CLIENT") {
    const company = await findCompanyByUser(userId);
    if (!company) {
      where.id = -1;
    } else {
      where.ownerCompanyId = company.id;
    }
  }

  return prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      orderNumber: true,
      pickupPlaceName: true,
      dropoffPlaceName: true,
      distanceKm: true,
      quotedPrice: true,
      status: true,
      createdAt: true,
    },
  });
}

type RequestWriteBody = {
  pickup: any;
  dropoff: any;
  vehicle?: any;
  cargo?: any;
  options?: any;
  payment?: any;
  sourceRequestId?: number | null;
  orderNumber?: string | null;
  pickupAddressBookId?: number | null;
  dropoffAddressBookId?: number | null;
  targetCompanyName?: string | null;
  targetCompanyContactName?: string | null;
  targetCompanyContactPhone?: string | null;
  pickupNotify?: boolean;
  dropoffNotify?: boolean;
};

async function buildRequestWriteData(userId: number, body: RequestWriteBody) {
  const supportsCompanyContactColumns = await hasRequestCompanyContactColumns();
  const supportsAddressBookReferenceColumns = await hasRequestAddressBookReferenceColumns();
  const {
    pickup,
    dropoff,
    vehicle,
    cargo,
    options,
    payment,
    sourceRequestId,
    orderNumber,
    pickupAddressBookId,
    dropoffAddressBookId,
    targetCompanyName,
    targetCompanyContactName,
    targetCompanyContactPhone,
    pickupNotify,
    dropoffNotify,
  } = body;

  const ownerCompany = await resolveRequestOwnerCompany(userId, targetCompanyName);
  const normalizedOrderNumber = orderNumber?.trim().slice(0, 100) || null;

  const upperPickupMethod = String(pickup.method).toUpperCase();
  const upperDropoffMethod = String(dropoff.method).toUpperCase();
  const upperVehicleGroup = vehicle?.group ? String(vehicle.group).toUpperCase() : null;
  const upperRequestType = options?.requestType ? String(options.requestType).toUpperCase() : "NORMAL";
  const upperPaymentMethod = payment?.method ? String(payment.method).toUpperCase() : null;
  const normalizedVehicleTonnage = vehicle?.tonnage ?? null;
  const normalizedVehicleBodyType = normalizeVehicleBodyTypeForStorage({
    vehicleGroup: upperVehicleGroup as any,
    vehicleTonnage: normalizedVehicleTonnage,
    vehicleBodyType: vehicle?.bodyType ?? null,
  });

  // 날짜/시간 범위 검증
  const validateDatetime = (value: unknown, fieldName: string) => {
    if (!value) return null;
    const d = new Date(String(value));
    if (Number.isNaN(d.getTime())) {
      throw Object.assign(new Error(`${fieldName}의 날짜 형식이 올바르지 않습니다.`), { statusCode: 400 });
    }
    const now = Date.now();
    const PAST_LIMIT = 30 * 24 * 60 * 60 * 1000; // 30일
    const FUTURE_LIMIT = 365 * 24 * 60 * 60 * 1000; // 1년
    if (d.getTime() < now - PAST_LIMIT) {
      throw Object.assign(new Error(`${fieldName}은 30일 이전 날짜를 사용할 수 없습니다.`), { statusCode: 400 });
    }
    if (d.getTime() > now + FUTURE_LIMIT) {
      throw Object.assign(new Error(`${fieldName}은 1년 이후 날짜를 사용할 수 없습니다.`), { statusCode: 400 });
    }
    return d;
  };

  const pickupDt = validateDatetime(pickup.datetime, "픽업 일시");
  const dropoffDt = validateDatetime(dropoff.datetime, "하차 일시");
  const validatedPickupAddressBookId = supportsAddressBookReferenceColumns
    ? await resolveSelectedAddressBookReference(
        pickupAddressBookId,
        "pickup",
        pickup.placeName,
        pickup.address
      )
    : null;
  const validatedDropoffAddressBookId = supportsAddressBookReferenceColumns
    ? await resolveSelectedAddressBookReference(
        dropoffAddressBookId,
        "dropoff",
        dropoff.placeName,
        dropoff.address
      )
    : null;

  return {
    data: {
      pickupPlaceName: pickup.placeName,
      pickupAddress: pickup.address,
      pickupAddressDetail: pickup.addressDetail ?? null,
      pickupContactName: pickup.contactName ?? null,
      pickupContactPhone: pickup.contactPhone ?? null,
      ...(supportsAddressBookReferenceColumns
        ? {
            pickupAddressBookId: validatedPickupAddressBookId,
          }
        : {}),
      pickupMethod: upperPickupMethod as any,
      pickupIsImmediate: Boolean(pickup.isImmediate),
      pickupDatetime: pickupDt,
      dropoffPlaceName: dropoff.placeName,
      dropoffAddress: dropoff.address,
      dropoffAddressDetail: dropoff.addressDetail ?? null,
      dropoffContactName: dropoff.contactName ?? null,
      dropoffContactPhone: dropoff.contactPhone ?? null,
      ...(supportsAddressBookReferenceColumns
        ? {
            dropoffAddressBookId: validatedDropoffAddressBookId,
          }
        : {}),
      dropoffMethod: upperDropoffMethod as any,
      dropoffIsImmediate: Boolean(dropoff.isImmediate),
      dropoffDatetime: dropoffDt,
      vehicleGroup: upperVehicleGroup as any,
      vehicleTonnage: normalizedVehicleTonnage,
      vehicleBodyType: normalizedVehicleBodyType,
      cargoDescription: cargo?.description ?? null,
      requestType: upperRequestType as any,
      driverNote: options?.driverNote ?? null,
      orderNumber: normalizedOrderNumber,
      paymentMethod: upperPaymentMethod as any,
      distanceKm: payment?.distanceKm ?? null,
      quotedPrice: payment?.quotedPrice ?? null,
      ownerCompanyId: ownerCompany.id,
      targetCompanyName: ownerCompany.name,
      ...(supportsCompanyContactColumns
        ? {
            targetCompanyContactName: targetCompanyContactName ?? null,
            targetCompanyContactPhone: targetCompanyContactPhone ?? null,
          }
        : {}),
      pickupNotify: typeof pickupNotify === "boolean" ? pickupNotify : true,
      dropoffNotify: typeof dropoffNotify === "boolean" ? dropoffNotify : true,
    },
    sourceRequestId,
    normalizedOrderNumber,
  };
}

// POST /requests
export async function createRequestRecord(userId: number, body: RequestWriteBody) {
  const actor = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!actor) {
    throw Object.assign(new Error("사용자 정보를 찾을 수 없습니다."), {
      statusCode: 401,
    });
  }

  if (body.sourceRequestId != null) {
    const sourceRequest = await prisma.request.findUnique({
      where: { id: body.sourceRequestId },
      select: {
        id: true,
        status: true,
        ownerCompanyId: true,
      },
    });

    if (!sourceRequest) {
      throw Object.assign(new Error("수정할 원본 요청을 찾을 수 없습니다."), {
        statusCode: 404,
      });
    }

    if (!isStaffRole(actor.role)) {
      const actorCompany = await findCompanyByUser(userId);
      const canAccessSourceRequest = canAccessOwnedRequest(
        actor.role,
        actorCompany?.id,
        sourceRequest.ownerCompanyId
      );

      if (!canAccessSourceRequest) {
        throw Object.assign(new Error("이 요청을 수정할 권한이 없습니다."), {
          statusCode: 403,
        });
      }

      if (sourceRequest.status !== "PENDING") {
        throw Object.assign(
          new Error("고객은 접수중 상태의 요청만 수정할 수 있습니다."),
          { statusCode: 403 }
        );
      }
    }
  }

  const { data } = await buildRequestWriteData(userId, body);

  return prisma.request.create({
    data: {
      ...data,
      createdById: userId,
    },
  });
}

export async function updateRequestRecord(
  req: AuthRequest,
  id: number,
  body: RequestWriteBody
) {
  if (!req.user) {
    return { ok: false as const, status: 401, message: "인증 정보가 없습니다." };
  }

  const existing = await prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      ownerCompanyId: true,
      pickupPlaceName: true,
      pickupAddress: true,
      pickupAddressDetail: true,
      pickupContactName: true,
      pickupContactPhone: true,
      pickupMethod: true,
      pickupIsImmediate: true,
      pickupDatetime: true,
      dropoffPlaceName: true,
      dropoffAddress: true,
      dropoffAddressDetail: true,
      dropoffContactName: true,
      dropoffContactPhone: true,
      dropoffMethod: true,
      dropoffIsImmediate: true,
      dropoffDatetime: true,
      vehicleGroup: true,
      vehicleTonnage: true,
      vehicleBodyType: true,
      cargoDescription: true,
      requestType: true,
      driverNote: true,
      orderNumber: true,
      paymentMethod: true,
      distanceKm: true,
      quotedPrice: true,
      targetCompanyName: true,
      targetCompanyContactName: true,
      targetCompanyContactPhone: true,
      pickupNotify: true,
      dropoffNotify: true,
    },
  });

  if (!existing) {
    return { ok: false as const, status: 404, message: "수정할 요청을 찾을 수 없습니다." };
  }

  if (!(await canAccessRequestByRole(req, existing))) {
    return { ok: false as const, status: 403, message: "이 요청을 수정할 권한이 없습니다." };
  }

  if (!isStaffRole(req.user.role) && existing.status !== "PENDING") {
    return {
      ok: false as const,
      status: 403,
      message: "고객은 접수중 상태의 요청만 수정할 수 있습니다.",
    };
  }

  const { data, normalizedOrderNumber } = await buildRequestWriteData(req.user.userId, body);
  const updated = await prisma.request.update({
    where: { id },
    data,
  });

  const diff = buildAuditChanges([
    { field: "pickupPlaceName", label: "출발지명", before: existing.pickupPlaceName, after: data.pickupPlaceName },
    { field: "pickupAddress", label: "출발지주소", before: existing.pickupAddress, after: data.pickupAddress },
    { field: "pickupAddressDetail", label: "출발지상세주소", before: existing.pickupAddressDetail, after: data.pickupAddressDetail ?? null },
    { field: "pickupContactName", label: "출발지담당자", before: existing.pickupContactName, after: data.pickupContactName ?? null },
    { field: "pickupContactPhone", label: "출발지연락처", before: existing.pickupContactPhone, after: data.pickupContactPhone ?? null },
    { field: "pickupMethod", label: "상차방법", before: existing.pickupMethod, after: data.pickupMethod },
    { field: "pickupIsImmediate", label: "상차즉시여부", before: existing.pickupIsImmediate, after: data.pickupIsImmediate },
    { field: "pickupDatetime", label: "상차예약일시", before: existing.pickupDatetime, after: data.pickupDatetime ?? null },
    { field: "dropoffPlaceName", label: "도착지명", before: existing.dropoffPlaceName, after: data.dropoffPlaceName },
    { field: "dropoffAddress", label: "도착지주소", before: existing.dropoffAddress, after: data.dropoffAddress },
    { field: "dropoffAddressDetail", label: "도착지상세주소", before: existing.dropoffAddressDetail, after: data.dropoffAddressDetail ?? null },
    { field: "dropoffContactName", label: "도착지담당자", before: existing.dropoffContactName, after: data.dropoffContactName ?? null },
    { field: "dropoffContactPhone", label: "도착지연락처", before: existing.dropoffContactPhone, after: data.dropoffContactPhone ?? null },
    { field: "dropoffMethod", label: "하차방법", before: existing.dropoffMethod, after: data.dropoffMethod },
    { field: "dropoffIsImmediate", label: "하차즉시여부", before: existing.dropoffIsImmediate, after: data.dropoffIsImmediate },
    { field: "dropoffDatetime", label: "하차예약일시", before: existing.dropoffDatetime, after: data.dropoffDatetime ?? null },
    { field: "vehicleGroup", label: "차량그룹", before: existing.vehicleGroup, after: data.vehicleGroup ?? null },
    { field: "vehicleTonnage", label: "톤수", before: existing.vehicleTonnage, after: data.vehicleTonnage ?? null },
    { field: "vehicleBodyType", label: "차종", before: existing.vehicleBodyType, after: data.vehicleBodyType ?? null },
    { field: "cargoDescription", label: "화물정보", before: existing.cargoDescription, after: data.cargoDescription ?? null },
    { field: "requestType", label: "요청구분", before: existing.requestType, after: data.requestType },
    { field: "driverNote", label: "기사메모", before: existing.driverNote, after: data.driverNote ?? null },
    { field: "orderNumber", label: "오더번호", before: existing.orderNumber, after: normalizedOrderNumber },
    { field: "paymentMethod", label: "결제방법", before: existing.paymentMethod, after: data.paymentMethod ?? null },
    { field: "distanceKm", label: "거리", before: existing.distanceKm, after: data.distanceKm ?? null },
    { field: "quotedPrice", label: "예상요금", before: existing.quotedPrice, after: data.quotedPrice ?? null },
    { field: "targetCompanyName", label: "업체명", before: existing.targetCompanyName, after: data.targetCompanyName },
    { field: "targetCompanyContactName", label: "업체담당자명", before: existing.targetCompanyContactName, after: data.targetCompanyContactName ?? null },
    { field: "targetCompanyContactPhone", label: "업체담당자연락처", before: existing.targetCompanyContactPhone, after: data.targetCompanyContactPhone ?? null },
    { field: "pickupNotify", label: "상차알림", before: existing.pickupNotify, after: data.pickupNotify },
    { field: "dropoffNotify", label: "하차알림", before: existing.dropoffNotify, after: data.dropoffNotify },
  ]);

  return {
    ok: true as const,
    data: updated,
    audit: {
      action: "UPDATE",
      target: "request_edit",
      detail: {
        summary: "배차 요청 수정",
        before: diff.before,
        after: diff.after,
        changes: diff.changes,
      },
    },
  };
}

// GET /requests/export.xlsx
export async function buildRequestsXlsxPayload(
  where: any,
  status?: string,
  from?: string,
  to?: string
): Promise<{ buffer: Buffer; fileName: string }> {
  const supportsCompanyContactColumns = await hasRequestCompanyContactColumns();
  const rows = await prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      pickupPlaceName: true,
      pickupAddress: true,
      pickupAddressDetail: true,
      pickupContactName: true,
      pickupContactPhone: true,
      dropoffPlaceName: true,
      dropoffAddress: true,
      dropoffAddressDetail: true,
      dropoffContactName: true,
      dropoffContactPhone: true,
      vehicleTonnage: true,
      vehicleBodyType: true,
      cargoDescription: true,
      requestType: true,
      driverNote: true,
      distanceKm: true,
      quotedPrice: true,
      orderNumber: true,
      targetCompanyName: true,
      ...(supportsCompanyContactColumns
        ? {
            targetCompanyContactName: true,
            targetCompanyContactPhone: true,
          }
        : {}),
      ownerCompany: { select: { id: true, name: true } },
      createdBy: { select: { name: true, companyName: true } },
      assignments: {
        where: { isActive: true },
        take: 1,
        orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          isActive: true,
          assignedAt: true,
          endedAt: true,
          endedReason: true,
          extraFare: true,
          extraFareReason: true,
          codRevenue: true,
          customerMemo: true,
          internalMemo: true,
          driver: {
            select: {
              id: true,
              name: true,
              phone: true,
              vehicleNumber: true,
              vehicleTonnage: true,
              vehicleBodyType: true,
            },
          },
        },
      },
    },
  });

  const sheetRows = rows.map((r) => ({
    요청ID: r.id,
    오더번호: r.orderNumber ?? "",
    접수일시: formatDateTimeCell(r.createdAt),
    상태: formatStatusLabel(r.status),
    접수업체: r.ownerCompany?.name ?? r.targetCompanyName ?? r.createdBy?.companyName ?? "",
    접수자: r.targetCompanyContactName ?? r.createdBy?.name ?? "",
    출발지명: r.pickupPlaceName ?? "",
    출발지주소: r.pickupAddress ?? "",
    출발지상세주소: r.pickupAddressDetail ?? "",
    출발지담당자: r.pickupContactName ?? "",
    출발지연락처: r.pickupContactPhone ?? "",
    도착지명: r.dropoffPlaceName ?? "",
    도착지주소: r.dropoffAddress ?? "",
    도착지상세주소: r.dropoffAddressDetail ?? "",
    도착지담당자: r.dropoffContactName ?? "",
    도착지연락처: r.dropoffContactPhone ?? "",
    차량톤수: r.vehicleTonnage ?? "",
    차량종류: r.vehicleBodyType ?? "",
    요청유형: r.requestType ?? "",
    화물내용: r.cargoDescription ?? "",
    기사요청사항: r.driverNote ?? "",
    거리_km: r.distanceKm ?? "",
    요금_원: r.quotedPrice ?? "",
  }));

  const ws = XLSX.utils.json_to_sheet(sheetRows);
  ws["!cols"] = [
    { wch: 10 }, { wch: 18 }, { wch: 10 }, { wch: 16 }, { wch: 12 },
    { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 12 }, { wch: 14 },
    { wch: 18 }, { wch: 32 }, { wch: 20 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 26 }, { wch: 30 },
    { wch: 10 }, { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "배차내역");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const statusLabel = formatStatusLabelForFile(status);
  const fromLabel = (from || `${yyyy}-${mm}-${dd}`).replace(/-/g, "");
  const toLabel = (to || `${yyyy}-${mm}-${dd}`).replace(/-/g, "");
  const fileName = `배차내역_${statusLabel}_${fromLabel}-${toLabel}.xlsx`;

  return { buffer, fileName };
}

// GET /requests/status-counts
export async function fetchStatusCounts(req: AuthRequest, from?: string, to?: string) {
  const baseWhere: any = {};

  if (req.user!.role === "CLIENT") {
    const company = await findCompanyByUser(req.user!.userId);
    if (!company) {
      baseWhere.id = -1;
    } else {
      baseWhere.ownerCompanyId = company.id;
    }
  }

  if (from || to) {
    baseWhere.createdAt = {};
    if (from) (baseWhere.createdAt as any).gte = parseLocalDateBoundary(from, false);
    if (to) (baseWhere.createdAt as any).lte = parseLocalDateBoundary(to, true);
  }

  const statuses: RequestStatus[] = [
    "PENDING", "DISPATCHING", "ASSIGNED", "IN_TRANSIT", "COMPLETED", "CANCELLED",
  ];

  const [total, ...countsArr] = await Promise.all([
    prisma.request.count({ where: baseWhere }),
    ...statuses.map((s) => prisma.request.count({ where: { ...baseWhere, status: s } })),
  ]);

  const counts = statuses.reduce<Record<string, number>>((acc, s, i) => {
    acc[s] = countsArr[i] ?? 0;
    return acc;
  }, {});

  return { total, counts };
}

// GET /:id/images
export async function fetchRequestImagesList(req: AuthRequest, requestId: number) {
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: { id: true, ownerCompanyId: true },
  });

  if (!request) {
    return { ok: false as const, status: 404, message: "해당 배차요청을 찾을 수 없습니다." };
  }
  if (!(await canAccessRequestByRole(req, request))) {
    return { ok: false as const, status: 403, message: "이 요청을 조회할 권한이 없습니다." };
  }

  const images = await prisma.requestImage.findMany({
    where: { requestId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return { ok: true as const, data: images };
}

async function fetchRequestDetailRecord(id: number) {
  const supportsCompanyContactColumns = await hasRequestCompanyContactColumns();
  const supportsAddressBookReferenceColumns = await hasRequestAddressBookReferenceColumns();

  return prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      status: true,
      pickupPlaceName: true,
      pickupAddress: true,
      pickupAddressDetail: true,
      pickupContactName: true,
      pickupContactPhone: true,
      ...(supportsAddressBookReferenceColumns
        ? {
            pickupAddressBookId: true,
            pickupAddressBook: {
              select: {
                id: true,
                memo: true,
                type: true,
              },
            },
          }
        : {}),
      pickupMethod: true,
      pickupIsImmediate: true,
      pickupDatetime: true,
      dropoffPlaceName: true,
      dropoffAddress: true,
      dropoffAddressDetail: true,
      dropoffContactName: true,
      dropoffContactPhone: true,
      ...(supportsAddressBookReferenceColumns
        ? {
            dropoffAddressBookId: true,
            dropoffAddressBook: {
              select: {
                id: true,
                memo: true,
                type: true,
              },
            },
          }
        : {}),
      dropoffMethod: true,
      dropoffIsImmediate: true,
      dropoffDatetime: true,
      vehicleGroup: true,
      vehicleTonnage: true,
      vehicleBodyType: true,
      cargoDescription: true,
      requestType: true,
      driverNote: true,
      paymentMethod: true,
      distanceKm: true,
      quotedPrice: true,
      orderNumber: true,
      actualFare: true,
      billingPrice: true,
      targetCompanyName: true,
      ...(supportsCompanyContactColumns
        ? {
            targetCompanyContactName: true,
            targetCompanyContactPhone: true,
          }
        : {}),
      pickupNotify: true,
      dropoffNotify: true,
      ownerCompanyId: true,
      ownerCompany: { select: { id: true, name: true } },
      createdById: true,
      createdBy: { select: { id: true, name: true, companyName: true } },
      assignments: {
        include: { driver: true },
        orderBy: [{ isActive: "desc" }, { assignedAt: "desc" }, { id: "desc" }],
      },
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

// POST /:id/images — 트랜잭션 부분
export async function saveRequestImageRecords(
  requestId: number,
  files: Express.Multer.File[],
  imageKind: "cargo" | "receipt",
  currentCount: number
) {
  return prisma.$transaction(async (tx) => {
    const rows = [];

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i];
      const originalName = normalizeMultipartFilename(file.originalname);
      const stored = await storageService.saveObject({
        buffer: file.buffer,
        mimeType: file.mimetype,
        originalName,
        keyPrefix: `requests/${requestId}`,
      });

      const row = await tx.requestImage.create({
        data: {
          requestId,
          storageProvider: stored.storageProvider,
          storageKey: stored.storageKey,
          publicUrl: stored.publicUrl ?? null,
          originalName,
          mimeType: file.mimetype,
          sizeBytes: file.size,
          kind: imageKind,
          sortOrder: currentCount + i,
        },
      });
      rows.push(row);
    }

    return rows;
  });
}

// GET /:id
export async function fetchRequestDetail(req: AuthRequest, id: number) {
  const request = await fetchRequestDetailRecord(id);

  if (!request) {
    return { ok: false as const, status: 404, message: "해당 배차요청을 찾을 수 없습니다." };
  }
  if (!(await canAccessRequestByRole(req, request))) {
    return { ok: false as const, status: 403, message: "이 요청을 조회할 권한이 없습니다." };
  }

  const requestWithMemos = await appendRequestAddressMemos(request);

  // CLIENT 역할은 대외비 필드 제외
  return {
    ok: true as const,
    data: sanitizeRequestDetailForRole(req.user?.role, requestWithMemos),
  };
}

// PATCH /:id/status
export async function processStatusChange(
  req: AuthRequest,
  id: number,
  status: RequestStatus
) {
  const existing = await prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      ownerCompanyId: true,
      assignments: {
        where: { isActive: true },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!existing) {
    return { ok: false as const, status: 404, message: "해당 ID의 요청을 찾을 수 없습니다." };
  }

  const role = req.user!.role;

  if (role === "CLIENT") {
    const company = await findCompanyByUser(req.user!.userId);
    if (!company || existing.ownerCompanyId !== company.id) {
      return { ok: false as const, status: 403, message: "이 요청의 상태를 변경할 권한이 없습니다." };
    }
    if (status !== "CANCELLED") {
      return { ok: false as const, status: 403, message: "고객 계정은 취소 상태로만 변경할 수 있습니다." };
    }
    if (existing.status !== "PENDING") {
      return { ok: false as const, status: 403, message: "고객 계정은 접수중 상태에서만 취소할 수 있습니다." };
    }
  } else if (role === "ADMIN" || role === "SALES") {
    if (!canStaffChangeStatus(existing.status, status)) {
      return {
        ok: false as const,
        status: 400,
        message: `허용되지 않는 상태 변경입니다. (${existing.status} -> ${status})`,
      };
    }
  } else {
    return { ok: false as const, status: 403, message: "상태 변경 권한이 없습니다." };
  }

  // 활성 배차정보 자동 삭제: ASSIGNED → DISPATCHING (롤백) 또는 → CANCELLED
  if (existing.assignments.length > 0 && (
    (existing.status === "ASSIGNED" && status === "DISPATCHING") ||
    status === "CANCELLED"
  )) {
    const assignmentId = existing.assignments[0].id;
    await prisma.requestDriverAssignment.update({
      where: { id: assignmentId },
      data: {
        isActive: false,
        endedAt: new Date(),
        endedReason: status === "CANCELLED" ? "CANCELLED" : "ROLLBACK",
      },
    });
  }

  const updated = await prisma.request.update({ where: { id }, data: { status } });
  const diff = buildAuditChanges([
    {
      field: "status",
      label: "상태",
      before: existing.status,
      after: status,
    },
  ]);
  return {
    ok: true as const,
    data: updated,
    audit: {
      action: "STATUS_CHANGE",
      target: "request_status",
      detail: {
        summary: "요청 상태 변경",
        before: diff.before,
        after: diff.after,
        changes: diff.changes,
      },
    },
  };
}

export async function processOrderNumberUpdate(
  req: AuthRequest,
  id: number,
  orderNumber: string | null | undefined
) {
  const existing = await prisma.request.findUnique({
    where: { id },
    select: {
      id: true,
      orderNumber: true,
      ownerCompanyId: true,
    },
  });

  if (!existing) {
    return { ok: false as const, status: 404, message: "해당 ID의 요청을 찾을 수 없습니다." };
  }

  if (!(await canAccessRequestByRole(req, existing))) {
    return { ok: false as const, status: 403, message: "이 요청을 수정할 권한이 없습니다." };
  }

  const normalizedOrderNumber = orderNumber?.trim().slice(0, 100) || null;
  const updated = await prisma.request.update({
    where: { id },
    data: { orderNumber: normalizedOrderNumber },
  });
  const diff = buildAuditChanges([
    {
      field: "orderNumber",
      label: "오더번호",
      before: existing.orderNumber ?? null,
      after: normalizedOrderNumber,
    },
  ]);

  return {
    ok: true as const,
    data: updated,
    audit: {
      action: "UPDATE",
      target: "request_order_number",
      detail: {
        summary: "요청 오더번호 수정",
        before: diff.before,
        after: diff.after,
        changes: diff.changes,
      },
    },
  };
}

// POST /:id/assignment
export async function processSaveAssignment(
  id: number,
  body: {
    driverName?: string;
    driverPhone?: string;
    vehicleNumber?: string;
    vehicleTonnage?: number | string | null;
    vehicleType?: string;
    actualFare?: number | string | null;
    billingPrice?: number | string | null;
    extraFare?: number | string | null;
    extraFareReason?: string | null;
    codRevenue?: number | string | null;
    customerMemo?: string | null;
    internalMemo?: string | null;
  }
) {
  const driverName = body.driverName?.trim() ?? "";
  const driverPhone = body.driverPhone?.trim() ?? "";
  const vehicleNumber = body.vehicleNumber?.trim() ?? "";
  const rawVehicleTonnage = body.vehicleTonnage;
  const vehicleType = body.vehicleType?.trim() ?? "";
  const vehicleTonnage =
    rawVehicleTonnage === null || rawVehicleTonnage === undefined || rawVehicleTonnage === ""
      ? null
      : Number(rawVehicleTonnage);

  if (!driverName || !driverPhone || !vehicleNumber || !vehicleType) {
    return {
      ok: false as const,
      status: 400,
      message: "이름, 전화번호, 차량번호, 차량종류를 모두 입력해주세요.",
    };
  }
  if (vehicleTonnage != null && Number.isNaN(vehicleTonnage)) {
    return { ok: false as const, status: 400, message: "차량 톤수 값이 올바르지 않습니다." };
  }
  if (vehicleTonnage != null && (vehicleTonnage < 0 || vehicleTonnage > 100)) {
    return { ok: false as const, status: 400, message: "차량 톤수는 0~100 범위여야 합니다." };
  }

  const toIntOrNull = (v: number | string | null | undefined): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : Math.round(n);
  };

  const actualFareNum = toIntOrNull(body.actualFare);
  const billingPriceNum = toIntOrNull(body.billingPrice);
  const extraFareNum = toIntOrNull(body.extraFare);
  const codRevenueNum = toIntOrNull(body.codRevenue);

  const validateFare = (n: number | null, label: string) => {
    if (n != null && (n < 0 || n > 100_000_000)) {
      return { ok: false as const, status: 400, message: `${label} 값이 올바르지 않습니다. (0~1억)` };
    }
    return null;
  };
  const fareErr = validateFare(actualFareNum, "실운임")
    ?? validateFare(billingPriceNum, "청구가")
    ?? validateFare(extraFareNum, "추가요금")
    ?? validateFare(codRevenueNum, "착불수익");
  if (fareErr) return fareErr;

  const extraFareReason = body.extraFareReason?.trim().slice(0, 200) ?? null;
  const customerMemo = body.customerMemo?.trim().slice(0, 1000) ?? null;
  const internalMemo = body.internalMemo?.trim().slice(0, 1000) ?? null;

  try {
    const mutation = await runAssignmentWriteTransaction(() =>
      prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Request" WHERE "id" = ${id} FOR UPDATE`;

          const existing = await tx.request.findUnique({
            where: { id },
            select: {
              id: true,
              status: true,
              actualFare: true,
              billingPrice: true,
              assignments: {
                where: { isActive: true },
                take: 1,
                include: { driver: true },
                orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
              },
            },
          });

          if (!existing) {
            return {
              ok: false as const,
              status: 404,
              message: "해당 ID의 요청을 찾을 수 없습니다.",
            };
          }
          if (!(existing.status === "DISPATCHING" || existing.status === "ASSIGNED")) {
            return {
              ok: false as const,
              status: 400,
              message: "배차정보는 배차중/배차완료 상태에서만 입력할 수 있습니다.",
            };
          }

          const activeAssignment = existing.assignments[0] ?? null;
          const now = new Date();
          const changes: string[] = [];
          const assignmentMode = determineAssignmentSaveMode(
            activeAssignment
              ? {
                  id: activeAssignment.id,
                  driver: {
                    name: activeAssignment.driver.name,
                    phone: activeAssignment.driver.phone,
                    vehicleNumber: activeAssignment.driver.vehicleNumber ?? null,
                    vehicleBodyType: activeAssignment.driver.vehicleBodyType ?? null,
                    vehicleTonnage: activeAssignment.driver.vehicleTonnage ?? null,
                  },
                }
              : null,
            {
              driverName,
              driverPhone,
              vehicleNumber,
              vehicleType,
              vehicleTonnage,
            }
          );

          pushAuditChange(changes, "기사명", activeAssignment?.driver.name ?? null, driverName);
          pushAuditChange(changes, "기사연락처", activeAssignment?.driver.phone ?? null, driverPhone);
          pushAuditChange(changes, "차량번호", activeAssignment?.driver.vehicleNumber ?? null, vehicleNumber);
          pushAuditChange(changes, "차종", activeAssignment?.driver.vehicleBodyType ?? null, vehicleType);
          pushAuditChange(changes, "톤수", activeAssignment?.driver.vehicleTonnage ?? null, vehicleTonnage);
          pushAuditChange(changes, "실운임", activeAssignment?.actualFare ?? null, actualFareNum);
          pushAuditChange(changes, "청구가", activeAssignment?.billingPrice ?? null, billingPriceNum);
          pushAuditChange(changes, "추가요금", activeAssignment?.extraFare ?? null, extraFareNum);
          pushAuditChange(changes, "추가사유", activeAssignment?.extraFareReason ?? null, extraFareReason || null);
          pushAuditChange(changes, "착불수익", activeAssignment?.codRevenue ?? null, codRevenueNum);
          pushAuditChange(changes, "고객메모", activeAssignment?.customerMemo ?? null, customerMemo || null);
          pushAuditChange(changes, "내부메모", activeAssignment?.internalMemo ?? null, internalMemo || null);

          if (assignmentMode === "create") {
            const driver = await tx.driver.create({
              data: {
                name: driverName,
                phone: driverPhone,
                vehicleNumber,
                vehicleTonnage,
                vehicleBodyType: vehicleType,
              },
            });

            await tx.requestDriverAssignment.create({
              data: {
                requestId: id,
                driverId: driver.id,
                isActive: true,
                actualFare: actualFareNum,
                billingPrice: billingPriceNum,
                extraFare: extraFareNum,
                extraFareReason: extraFareReason || null,
                codRevenue: codRevenueNum,
                customerMemo: customerMemo || null,
                internalMemo: internalMemo || null,
              },
            });
          } else if (assignmentMode === "reassign") {
            await tx.requestDriverAssignment.update({
              where: { id: activeAssignment.id },
              data: {
                isActive: false,
                endedAt: now,
                endedReason: "REASSIGNED",
              },
            });

            const driver = await tx.driver.create({
              data: {
                name: driverName,
                phone: driverPhone,
                vehicleNumber,
                vehicleTonnage,
                vehicleBodyType: vehicleType,
              },
            });

            await tx.requestDriverAssignment.create({
              data: {
                requestId: id,
                driverId: driver.id,
                isActive: true,
                actualFare: actualFareNum,
                billingPrice: billingPriceNum,
                extraFare: extraFareNum,
                extraFareReason: extraFareReason || null,
                codRevenue: codRevenueNum,
                customerMemo: customerMemo || null,
                internalMemo: internalMemo || null,
              },
            });
          } else {
            await tx.driver.update({
              where: { id: activeAssignment.driverId },
              data: {
                name: driverName,
                phone: driverPhone,
                vehicleNumber,
                vehicleTonnage,
                vehicleBodyType: vehicleType,
              },
            });

            await tx.requestDriverAssignment.update({
              where: { id: activeAssignment.id },
              data: {
                actualFare: actualFareNum,
                billingPrice: billingPriceNum,
                extraFare: extraFareNum,
                extraFareReason: extraFareReason || null,
                codRevenue: codRevenueNum,
                customerMemo: customerMemo || null,
                internalMemo: internalMemo || null,
              },
            });
          }

          await tx.request.update({
            where: { id },
            data: {
              status: "ASSIGNED",
              actualFare: actualFareNum,
              billingPrice: billingPriceNum,
            },
          });

          return {
            ok: true as const,
            previousStatus: existing.status,
            assignmentMode,
            changes,
            before: {
              driverName: activeAssignment?.driver.name ?? null,
              driverPhone: activeAssignment?.driver.phone ?? null,
              vehicleNumber: activeAssignment?.driver.vehicleNumber ?? null,
              vehicleType: activeAssignment?.driver.vehicleBodyType ?? null,
              vehicleTonnage: activeAssignment?.driver.vehicleTonnage ?? null,
              actualFare: activeAssignment?.actualFare ?? null,
              billingPrice: activeAssignment?.billingPrice ?? null,
              extraFare: activeAssignment?.extraFare ?? null,
              extraFareReason: activeAssignment?.extraFareReason ?? null,
              codRevenue: activeAssignment?.codRevenue ?? null,
              customerMemo: activeAssignment?.customerMemo ?? null,
              internalMemo: activeAssignment?.internalMemo ?? null,
            },
            after: {
              driverName,
              driverPhone,
              vehicleNumber,
              vehicleType,
              vehicleTonnage,
              actualFare: actualFareNum,
              billingPrice: billingPriceNum,
              extraFare: extraFareNum,
              extraFareReason: extraFareReason || null,
              codRevenue: codRevenueNum,
              customerMemo: customerMemo || null,
              internalMemo: internalMemo || null,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );

    if (!mutation.ok) {
      return mutation;
    }

    const updated = await fetchRequestDetailRecord(id);
    const auditChanges = [...mutation.changes];
    pushAuditChange(auditChanges, "요청상태", mutation.previousStatus, "ASSIGNED");

    return {
      ok: true as const,
      data: decorateRequestDetailRecord(updated!),
      audit: {
        action: mutation.assignmentMode === "create" ? "CREATE" : "UPDATE",
        target: "assignment",
        detail: {
          summary: "배차 정보 저장",
          assignmentMode: mutation.assignmentMode,
          before: mutation.before,
          after: mutation.after,
          changes: auditChanges.length > 0 ? auditChanges : ["배차정보 저장"],
        },
      },
    };
  } catch (error) {
    if (isActiveAssignmentUniqueViolation(error) || isRetryableAssignmentWriteError(error)) {
      return {
        ok: false as const,
        status: 409,
        message: "동시에 다른 배차 변경이 반영되었습니다. 최신 상태를 확인한 뒤 다시 시도해주세요.",
      };
    }
    throw error;
  }
}

// DELETE /:id/assignment
export async function processDeleteAssignment(id: number) {
  try {
    const mutation = await runAssignmentWriteTransaction(() =>
      prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT "id" FROM "Request" WHERE "id" = ${id} FOR UPDATE`;

          const existing = await tx.request.findUnique({
            where: { id },
            select: {
              id: true,
              status: true,
              assignments: {
                where: { isActive: true },
                take: 1,
                include: { driver: true },
                orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
              },
            },
          });

          if (!existing) {
            return {
              ok: false as const,
              status: 404,
              message: "해당 ID의 요청을 찾을 수 없습니다.",
            };
          }

          const latest = existing.assignments[0] ?? null;
          if (!latest) {
            return {
              ok: false as const,
              status: 404,
              message: "현재 활성 배차정보가 없습니다.",
            };
          }

          if (!(existing.status === "DISPATCHING" || existing.status === "ASSIGNED")) {
            return {
              ok: false as const,
              status: 400,
              message: "배차정보 삭제는 배차중/배차완료 상태에서만 가능합니다.",
            };
          }

          const nextStatus = getAssignmentDeleteNextStatus(existing.status);

          await tx.requestDriverAssignment.update({
            where: { id: latest.id },
            data: {
              isActive: false,
              endedAt: new Date(),
              endedReason: "REMOVED",
            },
          });

          await tx.request.update({
            where: { id },
            data: {
              status: nextStatus as RequestStatus,
              actualFare: null,
              billingPrice: null,
            },
          });

          return {
            ok: true as const,
            latest,
            previousStatus: existing.status,
            nextStatus,
            before: {
              driverName: latest.driver.name,
              driverPhone: latest.driver.phone,
              vehicleNumber: latest.driver.vehicleNumber ?? null,
              actualFare: latest.actualFare ?? null,
              billingPrice: latest.billingPrice ?? null,
              extraFare: latest.extraFare ?? null,
              extraFareReason: latest.extraFareReason ?? null,
              codRevenue: latest.codRevenue ?? null,
              customerMemo: latest.customerMemo ?? null,
              internalMemo: latest.internalMemo ?? null,
              status: existing.status,
            },
            after: {
              status: nextStatus,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      )
    );

    if (!mutation.ok) {
      return mutation;
    }

    const updated = await fetchRequestDetailRecord(id);
    return {
      ok: true as const,
      data: decorateRequestDetailRecord(updated!),
      audit: {
        action: "DELETE",
        target: "assignment",
        detail: {
          summary: "배차 정보 삭제",
          assignmentId: mutation.latest.id,
          endedReason: "REMOVED",
          before: mutation.before,
          after: mutation.after,
          changes: [
            `기사명: ${mutation.latest.driver.name}`,
            `기사연락처: ${mutation.latest.driver.phone}`,
            `차량번호: ${mutation.latest.driver.vehicleNumber || "-"}`,
            `청구가: ${mutation.latest.billingPrice != null ? formatAuditValue(mutation.latest.billingPrice) : "-"}`,
            `실운임: ${mutation.latest.actualFare != null ? formatAuditValue(mutation.latest.actualFare) : "-"}`,
            `상태: ${formatStatusLabel(mutation.previousStatus)} -> ${formatStatusLabel(mutation.nextStatus as RequestStatus)}`,
            "활성 배차: 해제",
          ],
        },
      },
    };
  } catch (error) {
    if (isActiveAssignmentUniqueViolation(error) || isRetryableAssignmentWriteError(error)) {
      return {
        ok: false as const,
        status: 409,
        message: "동시에 다른 배차 변경이 반영되었습니다. 최신 상태를 확인한 뒤 다시 시도해주세요.",
      };
    }
    throw error;
  }
}
