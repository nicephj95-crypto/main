import { Response } from "express";
import { prisma } from "../../prisma/client";
import { Prisma, type RequestStatus } from "@prisma/client";
import type { AuthRequest } from "../../middleware/authMiddleware";
import {
  buildListWhere,
  buildRequestsXlsxPayload,
  createRequestRecord,
  fetchRecentRequestsList,
  fetchRequestDetail,
  fetchStatusCounts,
  hasRequestAddressBookReferenceColumns,
  hasRequestCompanyContactColumns,
} from "../../services/requestService";
import { writeAuditLog } from "../../services/auditLogService";
import { logError } from "../../utils/logger";
import { collectDisplayMemos, sanitizeDisplayMemo } from "../../utils/displayMemo";

function getEffectivePickupSortTime(item: {
  pickupIsImmediate: boolean;
  pickupDatetime: Date | string | null;
  createdAt: Date | string;
}) {
  if (!item.pickupIsImmediate && item.pickupDatetime) {
    return new Date(item.pickupDatetime).getTime();
  }
  return new Date(item.createdAt).getTime();
}

function parseAuditDetail(detail: unknown): Record<string, unknown> | null {
  if (!detail) return null;
  if (typeof detail === "object" && !Array.isArray(detail)) {
    return detail as Record<string, unknown>;
  }
  if (typeof detail !== "string") return null;
  try {
    const parsed = JSON.parse(detail) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function isDispatchingStatusAudit(detail: Record<string, unknown> | null) {
  if (!detail) return false;
  const after = detail.after;
  if (after && typeof after === "object" && !Array.isArray(after)) {
    const afterStatus = (after as Record<string, unknown>).status;
    if (afterStatus === "DISPATCHING") {
      return true;
    }
  }

  const changes = detail.changes;
  if (!Array.isArray(changes)) return false;
  return changes.some((change) => {
    if (!change || typeof change !== "object" || Array.isArray(change)) return false;
    const typedChange = change as Record<string, unknown>;
    return typedChange.field === "status" && typedChange.after === "DISPATCHING";
  });
}

export async function getRecentRequests(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId || !req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const limitRaw = req.query.limit;
    let limit = 5;
    if (typeof limitRaw === "string") {
      const parsed = Number(limitRaw);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 50) {
        limit = parsed;
      }
    }

    const list = await fetchRecentRequestsList(req, limit);
    return res.json(list);
  } catch (err) {
    logError("getRecentRequests", err);
    return res.status(500).json({ message: "최근 배차 내역 조회 중 오류가 발생했습니다." });
  }
}

export async function createRequest(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "로그인 정보가 없습니다.(req.user 없음)" });
    }

    const { pickup, dropoff, vehicle, cargo, options, payment } = req.body;

    if (
      !pickup || !pickup.placeName || !pickup.address || !pickup.method ||
      !dropoff || !dropoff.placeName || !dropoff.address || !dropoff.method
    ) {
      return res.status(400).json({
        message:
          "pickup.placeName, pickup.address, pickup.method, dropoff.placeName, dropoff.address, dropoff.method 는 필수입니다.",
      });
    }

    const methodValues = ["FORKLIFT", "MANUAL", "SUDOU_SUHAEJUNG", "HOIST", "CRANE", "CONVEYOR"];
    const upperPickupMethod = String(pickup.method).toUpperCase();
    const upperDropoffMethod = String(dropoff.method).toUpperCase();

    if (!methodValues.includes(upperPickupMethod)) {
      return res.status(400).json({ message: `pickup.method 는 ${methodValues.join(", ")} 중 하나여야 합니다.` });
    }
    if (!methodValues.includes(upperDropoffMethod)) {
      return res.status(400).json({ message: `dropoff.method 는 ${methodValues.join(", ")} 중 하나여야 합니다.` });
    }

    const {
      sourceRequestId,
      orderNumber,
      targetCompanyName,
      targetCompanyContactName,
      targetCompanyContactPhone,
      pickupAddressBookId,
      dropoffAddressBookId,
      pickupNotify,
      dropoffNotify,
    } = req.body;
    const created = await createRequestRecord(req.user.userId, {
      pickup,
      dropoff,
      vehicle,
      cargo,
      options,
      payment,
      sourceRequestId:
        sourceRequestId == null || sourceRequestId === ""
          ? null
          : Number(sourceRequestId),
      orderNumber,
      pickupAddressBookId,
      dropoffAddressBookId,
      targetCompanyName,
      targetCompanyContactName,
      targetCompanyContactPhone,
      pickupNotify,
      dropoffNotify,
    });
    void writeAuditLog({
      req,
      action: "CREATE",
      resource: "REQUEST",
      resourceId: created.id,
      detail: { targetCompanyName, targetCompanyContactName, targetCompanyContactPhone },
    });
    return res.status(201).json(created);
  } catch (err: any) {
    if (err?.statusCode === 400) {
      return res.status(400).json({ message: err.message });
    }
    logError("createRequest", err);
    return res.status(500).json({ message: "배차 요청 생성 중 오류가 발생했습니다." });
  }
}

export async function listRequests(req: AuthRequest, res: Response) {
  try {
    const { status, from, to, dateType, page, pageSize, pickupKeyword, dropoffKeyword, companyKeyword } = req.query as {
      status?: string; from?: string; to?: string; dateType?: string;
      page?: string; pageSize?: string;
      pickupKeyword?: string; dropoffKeyword?: string;
      companyKeyword?: string;
    };

    const where = await buildListWhere(req, { status, from, to, dateType, pickupKeyword, dropoffKeyword, companyKeyword });
    if (!where) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const pageNum = Math.max(parseInt(page || "1", 10) || 1, 1);
    const pageSizeNum = Math.max(parseInt(pageSize || "20", 10) || 20, 1);
    const skip = (pageNum - 1) * pageSizeNum;

    const orderBy =
      dateType === "PICKUP_DATE"
        ? [{ createdAt: "desc" as const }]
        : [{ createdAt: "desc" as const }];

    const isStaffUser = req.user?.role === "ADMIN" || req.user?.role === "DISPATCHER" || req.user?.role === "SALES";
    const supportsCompanyContactColumns = await hasRequestCompanyContactColumns();
    const supportsAddressBookReferenceColumns = await hasRequestAddressBookReferenceColumns();

    const requestListSelect = Prisma.validator<Prisma.RequestSelect>()({
          id: true,
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
          dropoffIsImmediate: true,
          dropoffDatetime: true,
          distanceKm: true,
          quotedPrice: true,
          orderNumber: true,
          status: true,
          createdAt: true,
          requestType: true,
          paymentMethod: true,
          cargoDescription: true,
          driverNote: true,
          vehicleGroup: true,
          vehicleTonnage: true,
          vehicleBodyType: true,
          actualFare: true,
          billingPrice: true,
          ownerCompany: { select: { id: true, name: true } },
          createdBy: { select: { name: true, companyName: true } },
          targetCompanyName: true,
          ...(supportsCompanyContactColumns
            ? {
                targetCompanyContactName: true,
                targetCompanyContactPhone: true,
              }
            : {}),
          assignments: {
            where: { isActive: true },
            take: 1,
            orderBy: [{ assignedAt: "desc" }, { id: "desc" }],
            select: {
              id: true,
              isActive: true,
              actualFare: true,
              billingPrice: true,
              extraFare: true,
              extraFareReason: true,
              customerMemo: true,
              internalMemo: true,
              driver: {
                select: {
                  name: true,
                  phone: true,
                  vehicleNumber: true,
                  vehicleTonnage: true,
                  vehicleBodyType: true,
                },
              },
            },
          },
          _count: { select: { images: true } },
          images: { where: { kind: "receipt" }, take: 1, select: { id: true } },
        });

    const [fetchedItems, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy,
        ...(dateType === "PICKUP_DATE" ? {} : { skip, take: pageSizeNum }),
        select: requestListSelect,
      }),
      prisma.request.count({ where }),
    ]);

    const items =
      dateType === "PICKUP_DATE"
        ? [...fetchedItems]
            .sort((a, b) => {
              const effectiveDiff =
                getEffectivePickupSortTime(b) - getEffectivePickupSortTime(a);
              if (effectiveDiff !== 0) return effectiveDiff;

              const createdDiff =
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
              if (createdDiff !== 0) return createdDiff;

              return b.id - a.id;
            })
            .slice(skip, skip + pageSizeNum)
        : fetchedItems;

    const companyNames = Array.from(
      new Set(
        items
          .map((item) => item.ownerCompany?.name?.trim())
          .filter((value): value is string => !!value)
      )
    );

    const pickupLookupTargets = items.map((item) => ({
      companyName: item.ownerCompany?.name?.trim() || null,
      placeName: item.pickupPlaceName,
      address: item.pickupAddress,
    }));
    const dropoffLookupTargets = items.map((item) => ({
      companyName: item.ownerCompany?.name?.trim() || null,
      placeName: item.dropoffPlaceName,
      address: item.dropoffAddress,
    }));
    const addressTargets = [...pickupLookupTargets, ...dropoffLookupTargets];

    const uniqueAddressTargets = Array.from(
      new Map(
        addressTargets.map((t) => [`${t.placeName}::${t.address}`, t])
      ).values()
    );

    const addressBookRows =
      uniqueAddressTargets.length > 0
        ? await prisma.addressBook.findMany({
            where: {
              OR: uniqueAddressTargets.map((target) => ({
                placeName: target.placeName,
                address: target.address,
              })),
              memo: { not: null },
            },
            select: {
              placeName: true,
              address: true,
              type: true,
              memo: true,
            },
            orderBy: { createdAt: "desc" },
          })
        : [];

    const addressMemoMap = new Map<string, string>();
    const buildMemoKey = (_companyName: string | null | undefined, placeName: string, address: string) =>
      `${placeName}::${address}`;

    for (const row of addressBookRows) {
      const key = buildMemoKey(null, row.placeName, row.address);
      const memo = sanitizeDisplayMemo(row.memo);
      if (!addressMemoMap.has(key) && memo) {
        addressMemoMap.set(key, memo);
      }
    }

    // 배차자: "배차중으로 만든 사람" 또는 "배차정보를 마지막으로 저장한 사람" 중
    // 가장 최근의 작업자를 사용한다. assignment 저장이 있으면 일반적으로 그 작업자가
    // 이후 시점이므로 배차중 변경자보다 우선된다.
    const latestAssignmentActorMap = new Map<number, string>();
    const requestIds = items.map((it) => it.id);
    if (requestIds.length > 0) {
      const relevantLogs = await prisma.auditLog.findMany({
        where: {
          resource: "REQUEST",
          resourceId: { in: requestIds },
          OR: [
            {
              target: "assignment",
              action: { in: ["CREATE", "UPDATE"] },
            },
            {
              target: "request_status",
              action: "STATUS_CHANGE",
            },
          ],
        },
        orderBy: [{ resourceId: "asc" }, { createdAt: "desc" }, { id: "desc" }],
        select: { resourceId: true, userName: true, target: true, detail: true },
      });
      for (const log of relevantLogs) {
        if (log.resourceId == null || !log.userName) continue;
        if (latestAssignmentActorMap.has(log.resourceId)) continue;
        if (
          log.target === "request_status" &&
          !isDispatchingStatusAudit(parseAuditDetail(log.detail))
        ) {
          continue;
        }
        if (!latestAssignmentActorMap.has(log.resourceId)) {
          latestAssignmentActorMap.set(log.resourceId, log.userName);
        }
      }
    }

    const statuses: RequestStatus[] = [
      "PENDING",
      "DISPATCHING",
      "ASSIGNED",
      "IN_TRANSIT",
      "COMPLETED",
      "CANCELLED",
    ];
    let statusCounts: Record<RequestStatus, number> = {
      PENDING: 0, DISPATCHING: 0, ASSIGNED: 0,
      IN_TRANSIT: 0, COMPLETED: 0, CANCELLED: 0,
    };
    try {
      const countsArr = await Promise.all(
        statuses.map((s) => prisma.request.count({ where: { ...where, status: s } }))
      );
      statuses.forEach((s, i) => { statusCounts[s] = countsArr[i] ?? 0; });
    } catch {
      // 카운트 쿼리 실패 시 기본값(0) 유지
    }

    return res.json({
      items: items.map((item) => {
        const activeAssignment = item.assignments?.[0] ?? null;
        const pickupAddressBookRef = supportsAddressBookReferenceColumns
          ? ((item as any).pickupAddressBook as { memo?: string | null; type: "PICKUP" | "DROPOFF" | "BOTH" } | null | undefined)
          : null;
        const dropoffAddressBookRef = supportsAddressBookReferenceColumns
          ? ((item as any).dropoffAddressBook as { memo?: string | null; type: "PICKUP" | "DROPOFF" | "BOTH" } | null | undefined)
          : null;
        const pickupMemo =
          sanitizeDisplayMemo(pickupAddressBookRef?.memo) ||
          addressMemoMap.get(
            buildMemoKey(item.ownerCompany?.name, item.pickupPlaceName, item.pickupAddress)
          ) ||
          null;
        const dropoffMemo =
          sanitizeDisplayMemo(dropoffAddressBookRef?.memo) ||
          addressMemoMap.get(
            buildMemoKey(item.ownerCompany?.name, item.dropoffPlaceName, item.dropoffAddress)
          ) ||
          null;
        const driverNote = sanitizeDisplayMemo(item.driverNote);
        const specialMemo = collectDisplayMemos([
          driverNote,
          activeAssignment?.customerMemo,
          ...(isStaffUser ? [activeAssignment?.internalMemo, activeAssignment?.extraFareReason] : []),
        ]);
        const baseItem = {
          id: item.id,
          pickupPlaceName: item.pickupPlaceName,
          pickupAddress: item.pickupAddress,
          pickupAddressDetail: item.pickupAddressDetail ?? null,
          pickupContactName: item.pickupContactName ?? null,
          pickupContactPhone: item.pickupContactPhone ?? null,
          pickupAddressBookId:
            supportsAddressBookReferenceColumns ? (item.pickupAddressBookId ?? null) : null,
          pickupIsImmediate: item.pickupIsImmediate,
          pickupDatetime: item.pickupDatetime,
          pickupMemo,
          dropoffPlaceName: item.dropoffPlaceName,
          dropoffAddress: item.dropoffAddress,
          dropoffAddressDetail: item.dropoffAddressDetail ?? null,
          dropoffContactName: item.dropoffContactName ?? null,
          dropoffContactPhone: item.dropoffContactPhone ?? null,
          dropoffAddressBookId:
            supportsAddressBookReferenceColumns ? (item.dropoffAddressBookId ?? null) : null,
          dropoffIsImmediate: item.dropoffIsImmediate,
          dropoffDatetime: item.dropoffDatetime,
          dropoffMemo,
          distanceKm: item.distanceKm,
          quotedPrice: item.quotedPrice,
          orderNumber: item.orderNumber ?? null,
          status: item.status,
          createdAt: item.createdAt,
          requestType: item.requestType,
          paymentMethod: item.paymentMethod,
          cargoDescription: item.cargoDescription,
          driverNote,
          specialMemo,
          vehicleGroup: item.vehicleGroup ?? null,
          vehicleTonnage: item.vehicleTonnage ?? null,
          vehicleBodyType: item.vehicleBodyType ?? null,
          billingPrice: activeAssignment?.billingPrice ?? item.billingPrice ?? null,
          ownerCompany: item.ownerCompany ?? null,
          ownerCompanyName: item.ownerCompany?.name ?? item.targetCompanyName ?? null,
          targetCompanyName: item.targetCompanyName ?? null,
          targetCompanyContactName: supportsCompanyContactColumns ? (item.targetCompanyContactName ?? null) : null,
          targetCompanyContactPhone: supportsCompanyContactColumns ? (item.targetCompanyContactPhone ?? null) : null,
          createdByName: supportsCompanyContactColumns
            ? (item.targetCompanyContactName ?? item.createdBy?.name ?? null)
            : (item.createdBy?.name ?? null),
          createdByCompany: item.ownerCompany?.name ?? item.targetCompanyName ?? item.createdBy?.companyName ?? null,
          assignedByName: latestAssignmentActorMap.get(item.id) ?? null,
          driverName: activeAssignment?.driver?.name ?? null,
          driverPhone: activeAssignment?.driver?.phone ?? null,
          driverVehicleNumber: activeAssignment?.driver?.vehicleNumber ?? null,
          driverVehicleTonnage: activeAssignment?.driver?.vehicleTonnage ?? null,
          driverVehicleBodyType: activeAssignment?.driver?.vehicleBodyType ?? null,
          hasImages: item._count.images > 0,
          imageCount: item._count.images,
          hasReceiptImage: item.images.length > 0,
        };

        if (isStaffUser) {
          return {
            ...baseItem,
            actualFare: activeAssignment?.actualFare ?? item.actualFare ?? null,
            extraFare: activeAssignment?.extraFare ?? null,
          };
        }

        return baseItem;
      }),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      statusCounts,
    });
  } catch (err) {
    logError("listRequests", err);
    return res.status(500).json({ message: "배차 요청 목록 조회 중 오류가 발생했습니다." });
  }
}

export async function exportRequestsXlsx(req: AuthRequest, res: Response) {
  try {
    const { status, from, to, dateType, pickupKeyword, dropoffKeyword, companyKeyword } = req.query as {
      status?: string; from?: string; to?: string; dateType?: string;
      pickupKeyword?: string; dropoffKeyword?: string;
      companyKeyword?: string;
    };

    const where = await buildListWhere(req, { status, from, to, dateType, pickupKeyword, dropoffKeyword, companyKeyword });
    if (!where) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const { buffer, fileName } = await buildRequestsXlsxPayload(where, status, from, to);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dispatch-requests.xlsx"; filename*=UTF-8''${encodedFileName}`
    );
    return res.send(buffer);
  } catch (err) {
    logError("exportRequestsXlsx", err);
    return res.status(500).json({ message: "배차내역 엑셀 다운로드 생성 중 오류가 발생했습니다." });
  }
}

export async function getStatusCounts(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    const { from, to } = req.query as { from?: string; to?: string };
    const result = await fetchStatusCounts(req, from, to);
    return res.json(result);
  } catch (err) {
    logError("getStatusCounts", err);
    return res.status(500).json({ message: "상태별 카운트 조회 중 오류가 발생했습니다." });
  }
}

export async function getRequestDetail(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id가 올바르지 않습니다." });
  }

  try {
    const result = await fetchRequestDetail(req, id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    logError("getRequestDetail", err);
    return res.status(500).json({ message: "배차요청 상세 조회 중 오류가 발생했습니다." });
  }
}
