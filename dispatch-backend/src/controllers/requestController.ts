// src/controllers/requestController.ts
import { Response } from "express";
import { prisma } from "../prisma/client";
import type { RequestStatus } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { storageService } from "../services/storage";
import {
  buildListWhere,
  canAccessRequestByRole,
  fetchRecentRequestsList,
  createRequestRecord,
  buildRequestsXlsxPayload,
  fetchStatusCounts,
  fetchRequestImagesList,
  saveRequestImageRecords,
  fetchRequestDetail,
  processStatusChange,
  processSaveAssignment,
  processDeleteAssignment,
} from "../services/requestService";
import {
  ALL_REQUEST_STATUSES,
  requestImageUploader,
  MAX_REQUEST_IMAGES,
} from "../utils/requestUtils";

// 🔹 최근 N건 배차내역
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
    console.error(err);
    return res.status(500).json({ message: "최근 배차 내역 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 배차 요청 생성
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

    const created = await createRequestRecord(req.user.userId, { pickup, dropoff, vehicle, cargo, options, payment });
    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "배차 요청 생성 중 오류가 발생했습니다." });
  }
}

// 🔹 배차 요청 목록 조회
export async function listRequests(req: AuthRequest, res: Response) {
  try {
    const { status, from, to, page, pageSize, pickupKeyword, dropoffKeyword } = req.query as {
      status?: string; from?: string; to?: string;
      page?: string; pageSize?: string;
      pickupKeyword?: string; dropoffKeyword?: string;
    };

    const where = await buildListWhere(req, { status, from, to, pickupKeyword, dropoffKeyword });
    if (!where) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const pageNum = Math.max(parseInt(page || "1", 10) || 1, 1);
    const pageSizeNum = Math.max(parseInt(pageSize || "20", 10) || 20, 1);
    const skip = (pageNum - 1) * pageSizeNum;

    const [items, total] = await Promise.all([
      prisma.request.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSizeNum,
        select: {
          id: true,
          pickupPlaceName: true,
          dropoffPlaceName: true,
          distanceKm: true,
          quotedPrice: true,
          status: true,
          createdAt: true,
          requestType: true,
          cargoDescription: true,
          driverNote: true,
          vehicleTonnage: true,
          vehicleBodyType: true,
          actualFare: true,
          billingPrice: true,
          createdBy: { select: { name: true, companyName: true } },
          assignments: {
            take: 1,
            orderBy: { assignedAt: "desc" as const },
            select: {
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
        },
      }),
      prisma.request.count({ where }),
    ]);

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
      // 카운트 쿼리 실패 시 기본값(0) 유지 — 목록 반환은 계속
    }

    return res.json({
      items: items.map((item) => ({
        id: item.id,
        pickupPlaceName: item.pickupPlaceName,
        dropoffPlaceName: item.dropoffPlaceName,
        distanceKm: item.distanceKm,
        quotedPrice: item.quotedPrice,
        status: item.status,
        createdAt: item.createdAt,
        requestType: item.requestType,
        cargoDescription: item.cargoDescription,
        driverNote: item.driverNote,
        vehicleTonnage: item.vehicleTonnage ?? null,
        vehicleBodyType: item.vehicleBodyType ?? null,
        actualFare: item.actualFare ?? null,
        billingPrice: item.billingPrice ?? null,
        createdByName: item.createdBy?.name ?? null,
        createdByCompany: item.createdBy?.companyName ?? null,
        driverName: item.assignments?.[0]?.driver?.name ?? null,
        driverPhone: item.assignments?.[0]?.driver?.phone ?? null,
        driverVehicleNumber: item.assignments?.[0]?.driver?.vehicleNumber ?? null,
        driverVehicleTonnage: item.assignments?.[0]?.driver?.vehicleTonnage ?? null,
        driverVehicleBodyType: item.assignments?.[0]?.driver?.vehicleBodyType ?? null,
        hasImages: item._count.images > 0,
        imageCount: item._count.images,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      statusCounts,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "배차 요청 목록 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 배차내역 엑셀 다운로드
export async function exportRequestsXlsx(req: AuthRequest, res: Response) {
  try {
    const { status, from, to, pickupKeyword, dropoffKeyword } = req.query as {
      status?: string; from?: string; to?: string;
      pickupKeyword?: string; dropoffKeyword?: string;
    };

    const where = await buildListWhere(req, { status, from, to, pickupKeyword, dropoffKeyword });
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
    console.error(err);
    return res.status(500).json({ message: "배차내역 엑셀 다운로드 생성 중 오류가 발생했습니다." });
  }
}

// 🔹 상태별 카운트 조회
export async function getStatusCounts(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    const { from, to } = req.query as { from?: string; to?: string };
    const result = await fetchStatusCounts(req, from, to);
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "상태별 카운트 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 요청 이미지 목록 조회
export async function getRequestImages(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id가 올바르지 않습니다." });
  }

  try {
    const result = await fetchRequestImagesList(req, id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });

    return res.json(
      result.data.map((img) => ({
        ...img,
        url: img.publicUrl || storageService.getPublicUrl(img.storageKey),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "이미지 목록 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 요청 이미지 업로드
export function uploadRequestImages(req: AuthRequest, res: Response): void {
  requestImageUploader.array("images", MAX_REQUEST_IMAGES)(req as any, res as any, async (uploadErr: any) => {
    if (uploadErr) {
      return res.status(400).json({
        message: uploadErr?.message || "이미지 업로드 요청 처리 중 오류가 발생했습니다.",
      });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "id가 올바르지 않습니다." });
    }

    try {
      const request = await prisma.request.findUnique({
        where: { id },
        include: { createdBy: { select: { companyName: true } } },
      });

      if (!request) {
        return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
      }
      if (!(await canAccessRequestByRole(req, request))) {
        return res.status(403).json({ message: "이 요청에 이미지를 업로드할 권한이 없습니다." });
      }

      const files = ((req as any).files || []) as Express.Multer.File[];
      if (!files.length) {
        return res.status(400).json({ message: "업로드할 이미지 파일이 없습니다." });
      }

      const currentCount = await prisma.requestImage.count({ where: { requestId: id } });
      if (currentCount + files.length > MAX_REQUEST_IMAGES) {
        return res.status(400).json({
          message: `이미지는 요청당 최대 ${MAX_REQUEST_IMAGES}장까지 업로드할 수 있습니다.`,
        });
      }

      const imageKind = (req as any).body?.kind === "receipt" ? "receipt" : "cargo";
      const created = await saveRequestImageRecords(id, files, imageKind, currentCount);

      return res.status(201).json(
        created.map((img) => ({
          ...img,
          url: img.publicUrl || storageService.getPublicUrl(img.storageKey),
          autoCompleted: imageKind === "receipt",
        }))
      );
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: "이미지 업로드 중 오류가 발생했습니다." });
    }
  });
}

// 🔹 특정 배차요청 상세 조회
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
    console.error(err);
    return res.status(500).json({ message: "배차요청 상세 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 요청 상태 변경
export async function changeRequestStatus(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }

    const { status } = req.body as { status?: RequestStatus };
    if (!status) {
      return res.status(400).json({ message: "변경할 상태(status)가 필요합니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    if (!ALL_REQUEST_STATUSES.includes(status)) {
      return res.status(400).json({ message: `허용되지 않는 상태 값입니다: ${status}` });
    }

    const result = await processStatusChange(req, id, status);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err: any) {
    console.error(err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }
    return res.status(500).json({ message: "요청 상태 변경 중 오류가 발생했습니다." });
  }
}

// 🔹 배차정보 저장
export async function saveAssignment(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    if (!(req.user.role === "ADMIN" || req.user.role === "DISPATCHER")) {
      return res.status(403).json({ message: "배차정보 입력 권한이 없습니다." });
    }

    const result = await processSaveAssignment(id, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "배차정보 저장 중 오류가 발생했습니다." });
  }
}

// 🔹 최근 배차정보 삭제
export async function deleteAssignment(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }
    if (!(req.user.role === "ADMIN" || req.user.role === "DISPATCHER")) {
      return res.status(403).json({ message: "배차정보 삭제 권한이 없습니다." });
    }

    const result = await processDeleteAssignment(id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "배차정보 삭제 중 오류가 발생했습니다." });
  }
}
