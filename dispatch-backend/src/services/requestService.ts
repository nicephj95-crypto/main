// src/services/requestService.ts
import { prisma } from "../prisma/client";
import type { RequestStatus } from "@prisma/client";
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

// ─────────────────────────────────────────────────────────────
// 기존 (유지)
// ─────────────────────────────────────────────────────────────

export async function buildListWhere(req: AuthRequest, query: {
  status?: string;
  from?: string;
  to?: string;
  pickupKeyword?: string;
  dropoffKeyword?: string;
}) {
  const { status, from, to, pickupKeyword, dropoffKeyword } = query;
  const where: any = {};

  if (!req.user) {
    return null;
  }

  if (req.user.role === "CLIENT") {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { companyName: true },
    });

    if (me?.companyName && me.companyName.trim() !== "") {
      where.createdBy = {
        companyName: me.companyName,
      };
    } else {
      where.createdById = req.user.userId;
    }
  }

  if (status && status !== "ALL") {
    where.status = status as RequestStatus;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      (where.createdAt as any).gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to) {
      (where.createdAt as any).lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  const andFilters: any[] = [];
  if (pickupKeyword?.trim()) {
    andFilters.push({
      pickupPlaceName: { contains: pickupKeyword.trim() },
    });
  }
  if (dropoffKeyword?.trim()) {
    andFilters.push({
      dropoffPlaceName: { contains: dropoffKeyword.trim() },
    });
  }
  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

export async function canAccessRequestByRole(
  req: AuthRequest,
  request: {
    createdById: number | null;
    createdBy?: { companyName: string | null } | null;
  }
) {
  if (!req.user) return false;
  if (req.user.role === "ADMIN" || req.user.role === "DISPATCHER") return true;
  if (req.user.role !== "CLIENT") return false;

  const me = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { companyName: true },
  });

  const myCompany = me?.companyName?.trim();
  const requestCompany = request.createdBy?.companyName?.trim();
  const sameCompany =
    !!myCompany && !!requestCompany && myCompany === requestCompany;

  return sameCompany || request.createdById === req.user.userId;
}

// ─────────────────────────────────────────────────────────────
// 신규 서비스 함수
// ─────────────────────────────────────────────────────────────

// GET /requests/recent
export async function fetchRecentRequestsList(req: AuthRequest, limit: number) {
  const userId = req.user!.userId;
  const where: any = {};

  if (req.user!.role === "CLIENT") {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { companyName: true },
    });
    if (me?.companyName && me.companyName.trim() !== "") {
      where.createdBy = { companyName: me.companyName.trim() };
    } else {
      where.createdById = userId;
    }
  }

  return prisma.request.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      pickupPlaceName: true,
      dropoffPlaceName: true,
      distanceKm: true,
      quotedPrice: true,
      status: true,
      createdAt: true,
    },
  });
}

// POST /requests
export async function createRequestRecord(userId: number, body: {
  pickup: any;
  dropoff: any;
  vehicle?: any;
  cargo?: any;
  options?: any;
  payment?: any;
}) {
  const { pickup, dropoff, vehicle, cargo, options, payment } = body;

  const upperPickupMethod = String(pickup.method).toUpperCase();
  const upperDropoffMethod = String(dropoff.method).toUpperCase();
  const upperVehicleGroup = vehicle?.group ? String(vehicle.group).toUpperCase() : null;
  const upperRequestType = options?.requestType ? String(options.requestType).toUpperCase() : "NORMAL";
  const upperPaymentMethod = payment?.method ? String(payment.method).toUpperCase() : null;

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

  return prisma.request.create({
    data: {
      pickupPlaceName: pickup.placeName,
      pickupAddress: pickup.address,
      pickupAddressDetail: pickup.addressDetail ?? null,
      pickupContactName: pickup.contactName ?? null,
      pickupContactPhone: pickup.contactPhone ?? null,
      pickupMethod: upperPickupMethod as any,
      pickupIsImmediate: Boolean(pickup.isImmediate),
      pickupDatetime: pickupDt,
      dropoffPlaceName: dropoff.placeName,
      dropoffAddress: dropoff.address,
      dropoffAddressDetail: dropoff.addressDetail ?? null,
      dropoffContactName: dropoff.contactName ?? null,
      dropoffContactPhone: dropoff.contactPhone ?? null,
      dropoffMethod: upperDropoffMethod as any,
      dropoffIsImmediate: Boolean(dropoff.isImmediate),
      dropoffDatetime: dropoffDt,
      vehicleGroup: upperVehicleGroup as any,
      vehicleTonnage: vehicle?.tonnage ?? null,
      vehicleBodyType: vehicle?.bodyType ?? null,
      cargoDescription: cargo?.description ?? null,
      requestType: upperRequestType as any,
      driverNote: options?.driverNote ?? null,
      paymentMethod: upperPaymentMethod as any,
      distanceKm: payment?.distanceKm ?? null,
      quotedPrice: payment?.quotedPrice ?? null,
      createdById: userId,
    },
  });
}

// GET /requests/export.xlsx
export async function buildRequestsXlsxPayload(
  where: any,
  status?: string,
  from?: string,
  to?: string
): Promise<{ buffer: Buffer; fileName: string }> {
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
      createdBy: { select: { name: true, companyName: true } },
    },
  });

  const sheetRows = rows.map((r) => ({
    요청ID: r.id,
    접수일시: formatDateTimeCell(r.createdAt),
    상태: formatStatusLabel(r.status),
    접수업체: r.createdBy?.companyName ?? "",
    접수자: r.createdBy?.name ?? "",
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
    const me = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyName: true },
    });
    if (me?.companyName && me.companyName.trim() !== "") {
      baseWhere.createdBy = { companyName: me.companyName };
    } else {
      baseWhere.createdById = req.user!.userId;
    }
  }

  if (from || to) {
    baseWhere.createdAt = {};
    if (from) (baseWhere.createdAt as any).gte = new Date(`${from}T00:00:00.000Z`);
    if (to) (baseWhere.createdAt as any).lte = new Date(`${to}T23:59:59.999Z`);
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
    include: { createdBy: { select: { companyName: true } } },
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

    if (imageKind === "receipt") {
      await tx.request.update({
        where: { id: requestId },
        data: { status: "COMPLETED" },
      });
    }

    return rows;
  });
}

// GET /:id
export async function fetchRequestDetail(req: AuthRequest, id: number) {
  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, companyName: true } },
      assignments: { include: { driver: true }, orderBy: { assignedAt: "desc" } },
      images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!request) {
    return { ok: false as const, status: 404, message: "해당 배차요청을 찾을 수 없습니다." };
  }
  if (!(await canAccessRequestByRole(req, request))) {
    return { ok: false as const, status: 403, message: "이 요청을 조회할 권한이 없습니다." };
  }

  return { ok: true as const, data: request };
}

// PATCH /:id/status
export async function processStatusChange(
  req: AuthRequest,
  id: number,
  status: RequestStatus
) {
  const existing = await prisma.request.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, companyName: true } } },
  });

  if (!existing) {
    return { ok: false as const, status: 404, message: "해당 ID의 요청을 찾을 수 없습니다." };
  }

  const role = req.user!.role;

  if (role === "CLIENT") {
    const me = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { companyName: true },
    });

    const myCompany = me?.companyName?.trim();
    const requestCompany = existing.createdBy?.companyName?.trim();
    const sameCompany =
      !!myCompany && !!requestCompany && myCompany === requestCompany;

    if (!sameCompany && existing.createdById !== req.user!.userId) {
      return { ok: false as const, status: 403, message: "이 요청의 상태를 변경할 권한이 없습니다." };
    }
    if (status !== "CANCELLED") {
      return { ok: false as const, status: 403, message: "고객 계정은 취소 상태로만 변경할 수 있습니다." };
    }
    if (existing.status !== "PENDING") {
      return { ok: false as const, status: 403, message: "고객 계정은 접수중 상태에서만 취소할 수 있습니다." };
    }
  } else if (role === "ADMIN" || role === "DISPATCHER") {
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

  const updated = await prisma.request.update({ where: { id }, data: { status } });
  return { ok: true as const, data: updated };
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

  const actualFareNum = body.actualFare != null ? Number(body.actualFare) : null;
  const billingPriceNum = body.billingPrice != null ? Number(body.billingPrice) : null;

  if (actualFareNum != null && (Number.isNaN(actualFareNum) || actualFareNum < 0 || actualFareNum > 100_000_000)) {
    return { ok: false as const, status: 400, message: "실운임 값이 올바르지 않습니다. (0~1억)" };
  }
  if (billingPriceNum != null && (Number.isNaN(billingPriceNum) || billingPriceNum < 0 || billingPriceNum > 100_000_000)) {
    return { ok: false as const, status: 400, message: "청구가 값이 올바르지 않습니다. (0~1억)" };
  }

  const existing = await prisma.request.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!existing) {
    return { ok: false as const, status: 404, message: "해당 ID의 요청을 찾을 수 없습니다." };
  }
  if (!(existing.status === "DISPATCHING" || existing.status === "ASSIGNED")) {
    return {
      ok: false as const,
      status: 400,
      message: "배차정보는 배차중/배차완료 상태에서만 입력할 수 있습니다.",
    };
  }

  const updated = await prisma.$transaction(async (tx) => {
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
      data: { requestId: id, driverId: driver.id },
    });

    const updateData: any = { status: "ASSIGNED" };
    if (actualFareNum != null) updateData.actualFare = actualFareNum;
    if (billingPriceNum != null) updateData.billingPrice = billingPriceNum;

    return tx.request.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, companyName: true } },
        assignments: { include: { driver: true }, orderBy: { assignedAt: "desc" } },
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  });

  return { ok: true as const, data: updated };
}

// DELETE /:id/assignment
export async function processDeleteAssignment(id: number) {
  const existing = await prisma.request.findUnique({
    where: { id },
    include: {
      assignments: { orderBy: { assignedAt: "desc" }, include: { driver: true } },
    },
  });

  if (!existing) {
    return { ok: false as const, status: 404, message: "해당 ID의 요청을 찾을 수 없습니다." };
  }

  const latest = existing.assignments[0];
  if (!latest) {
    return { ok: false as const, status: 404, message: "삭제할 배차정보가 없습니다." };
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.requestDriverAssignment.delete({ where: { id: latest.id } });

    const remainCount = await tx.requestDriverAssignment.count({
      where: { driverId: latest.driverId },
    });
    if (remainCount === 0) {
      await tx.driver.delete({ where: { id: latest.driverId } });
    }

    return tx.request.update({
      where: { id },
      data: { status: "DISPATCHING", actualFare: null, billingPrice: null },
      include: {
        createdBy: { select: { id: true, name: true, companyName: true } },
        assignments: { include: { driver: true }, orderBy: { assignedAt: "desc" } },
        images: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  });

  return { ok: true as const, data: updated };
}
