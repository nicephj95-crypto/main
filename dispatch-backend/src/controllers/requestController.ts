// src/controllers/requestController.ts
import { Response } from "express";
import { prisma } from "../prisma/client";
import type { RequestStatus } from "@prisma/client";
import * as XLSX from "xlsx";
import type { AuthRequest } from "../middleware/authMiddleware";
import { storageService } from "../services/storage";
import { buildListWhere, canAccessRequestByRole } from "../services/requestService";
import {
  normalizeMultipartFilename,
  ALL_REQUEST_STATUSES,
  canStaffChangeStatus,
  formatStatusLabel,
  formatStatusLabelForFile,
  formatDateTimeCell,
  MAX_REQUEST_IMAGES,
  requestImageUploader,
} from "../utils/requestUtils";

// 🔹 최근 N건 배차내역 (CLIENT는 회사 기준, 회사 없으면 본인 기준)
//    GET /requests/recent?limit=5
export async function getRecentRequests(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId || !req.user) {
      return res
        .status(401)
        .json({ message: "인증 정보가 없습니다." });
    }

    const limitRaw = req.query.limit;
    let limit = 5; // 기본 5건

    if (typeof limitRaw === "string") {
      const parsed = Number(limitRaw);
      if (!Number.isNaN(parsed) && parsed > 0 && parsed <= 50) {
        limit = parsed;
      }
    }

    const where: any = {};
    if (req.user.role === "CLIENT") {
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

    const list = await prisma.request.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
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

    return res.json(list);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "최근 배차 내역 조회 중 오류가 발생했습니다.",
    });
  }
}

/**
 * 배차 요청 생성
 * POST /requests
 */
export async function createRequest(req: AuthRequest, res: Response) {
  try {
    // authMiddleware에서 넣어준 유저 정보
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "로그인 정보가 없습니다.(req.user 없음)" });
    }

    const { pickup, dropoff, vehicle, cargo, options, payment } = req.body;

    // 1) 필수값 체크
    if (
      !pickup ||
      !pickup.placeName ||
      !pickup.address ||
      !pickup.method ||
      !dropoff ||
      !dropoff.placeName ||
      !dropoff.address ||
      !dropoff.method
    ) {
      return res.status(400).json({
        message:
          "pickup.placeName, pickup.address, pickup.method, dropoff.placeName, dropoff.address, dropoff.method 는 필수입니다.",
      });
    }

    // 2) enum 대문자 정리
    const methodValues = [
      "FORKLIFT",
      "MANUAL",
      "SUDOU_SUHAEJUNG",
      "HOIST",
      "CRANE",
      "CONVEYOR",
    ];

    const upperPickupMethod = String(pickup.method).toUpperCase();
    const upperDropoffMethod = String(dropoff.method).toUpperCase();

    if (!methodValues.includes(upperPickupMethod)) {
      return res.status(400).json({
        message: `pickup.method 는 ${methodValues.join(", ")} 중 하나여야 합니다.`,
      });
    }
    if (!methodValues.includes(upperDropoffMethod)) {
      return res.status(400).json({
        message: `dropoff.method 는 ${methodValues.join(", ")} 중 하나여야 합니다.`,
      });
    }

    const upperVehicleGroup = vehicle?.group
      ? String(vehicle.group).toUpperCase()
      : null;

    const upperRequestType = options?.requestType
      ? String(options.requestType).toUpperCase()
      : "NORMAL";

    const upperPaymentMethod = payment?.method
      ? String(payment.method).toUpperCase()
      : null;

    const created = await prisma.request.create({
      data: {
        // 출발지
        pickupPlaceName: pickup.placeName,
        pickupAddress: pickup.address,
        pickupAddressDetail: pickup.addressDetail ?? null,
        pickupContactName: pickup.contactName ?? null,
        pickupContactPhone: pickup.contactPhone ?? null,
        pickupMethod: upperPickupMethod as any,
        pickupIsImmediate: Boolean(pickup.isImmediate),
        pickupDatetime: pickup.datetime ? new Date(pickup.datetime) : null,

        // 도착지
        dropoffPlaceName: dropoff.placeName,
        dropoffAddress: dropoff.address,
        dropoffAddressDetail: dropoff.addressDetail ?? null,
        dropoffContactName: dropoff.contactName ?? null,
        dropoffContactPhone: dropoff.contactPhone ?? null,
        dropoffMethod: upperDropoffMethod as any,
        dropoffIsImmediate: Boolean(dropoff.isImmediate),
        dropoffDatetime: dropoff.datetime
          ? new Date(dropoff.datetime)
          : null,

        // 차량
        vehicleGroup: upperVehicleGroup as any,
        vehicleTonnage: vehicle?.tonnage ?? null,
        vehicleBodyType: vehicle?.bodyType ?? null,

        // 화물/옵션
        cargoDescription: cargo?.description ?? null,
        requestType: upperRequestType as any,
        driverNote: options?.driverNote ?? null,

        // 결제/거리/요금
        paymentMethod: upperPaymentMethod as any,
        distanceKm: payment?.distanceKm ?? null,
        quotedPrice: payment?.quotedPrice ?? null,

        // 🔥 생성자 — JWT 토큰에서 꺼낸 userId
        createdById: req.user.userId,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "배차 요청 생성 중 오류가 발생했습니다.",
    });
  }
}

/**
 * 배차 요청 목록 조회 (상태/기간 + 페이지네이션)
 * GET /requests?status=&from=&to=&page=&pageSize=
 */
export async function listRequests(req: AuthRequest, res: Response) {
  try {
    const { status, from, to, page, pageSize, pickupKeyword, dropoffKeyword } = req.query as {
      status?: string;
      from?: string;
      to?: string;
      page?: string;
      pageSize?: string;
      pickupKeyword?: string;
      dropoffKeyword?: string;
    };
    const where = await buildListWhere(req, {
      status,
      from,
      to,
      pickupKeyword,
      dropoffKeyword,
    });
    if (!where) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    // 🔹 페이지/페이지당 개수 (기본: 1페이지, 20개)
    const pageNum = Math.max(parseInt(page || "1", 10) || 1, 1);
    const pageSizeNum = Math.max(parseInt(pageSize || "20", 10) || 20, 1);
    const skip = (pageNum - 1) * pageSizeNum;

    // 🔹 목록 + 전체 개수
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
          _count: {
            select: {
              images: true,
            },
          },
        },
      }),
      prisma.request.count({ where }),
    ]);

    return res.json({
      items: items.map((item) => ({
        id: item.id,
        pickupPlaceName: item.pickupPlaceName,
        dropoffPlaceName: item.dropoffPlaceName,
        distanceKm: item.distanceKm,
        quotedPrice: item.quotedPrice,
        status: item.status,
        createdAt: item.createdAt,
        hasImages: item._count.images > 0,
        imageCount: item._count.images,
      })),
      total,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "배차 요청 목록 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 배차내역 엑셀 다운로드
//    GET /requests/export.xlsx?status=&from=&to=&pickupKeyword=&dropoffKeyword=
export async function exportRequestsXlsx(req: AuthRequest, res: Response) {
  try {
    const { status, from, to, pickupKeyword, dropoffKeyword } = req.query as {
      status?: string;
      from?: string;
      to?: string;
      pickupKeyword?: string;
      dropoffKeyword?: string;
    };

    const where = await buildListWhere(req, {
      status,
      from,
      to,
      pickupKeyword,
      dropoffKeyword,
    });
    if (!where) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

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
        createdBy: {
          select: {
            name: true,
            companyName: true,
          },
        },
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
    const buffer = XLSX.write(wb, {
      type: "buffer",
      bookType: "xlsx",
    });

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const statusLabel = formatStatusLabelForFile(status);
    const fromLabel = (from || `${yyyy}-${mm}-${dd}`).replace(/-/g, "");
    const toLabel = (to || `${yyyy}-${mm}-${dd}`).replace(/-/g, "");
    const fileName = `배차내역_${statusLabel}_${fromLabel}-${toLabel}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    const encodedFileName = encodeURIComponent(fileName);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="dispatch-requests.xlsx"; filename*=UTF-8''${encodedFileName}`
    );
    return res.send(buffer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "배차내역 엑셀 다운로드 생성 중 오류가 발생했습니다.",
    });
  }
}

// 🔹 상태별 카운트 조회 (기간 필터 포함)
//    GET /requests/status-counts?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function getStatusCounts(req: AuthRequest, res: Response) {
  try {
    const { from, to } = req.query as { from?: string; to?: string };

    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const baseWhere: any = {};

    if (req.user.role === "CLIENT") {
      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { companyName: true },
      });

      if (me?.companyName && me.companyName.trim() !== "") {
        baseWhere.createdBy = {
          companyName: me.companyName,
        };
      } else {
        baseWhere.createdById = req.user.userId;
      }
    }

    if (from || to) {
      baseWhere.createdAt = {};
      if (from) {
        (baseWhere.createdAt as any).gte = new Date(`${from}T00:00:00.000Z`);
      }
      if (to) {
        (baseWhere.createdAt as any).lte = new Date(`${to}T23:59:59.999Z`);
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

    const [total, ...countsArr] = await Promise.all([
      prisma.request.count({ where: baseWhere }),
      ...statuses.map((s) =>
        prisma.request.count({ where: { ...baseWhere, status: s } })
      ),
    ]);

    const counts = statuses.reduce<Record<string, number>>((acc, s, i) => {
      acc[s] = countsArr[i] ?? 0;
      return acc;
    }, {});

    return res.json({ total, counts });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "상태별 카운트 조회 중 오류가 발생했습니다.",
    });
  }
}

// 🔹 요청 이미지 목록 조회
export async function getRequestImages(req: AuthRequest, res: Response) {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id가 올바르지 않습니다." });
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { companyName: true },
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
    }

    if (!(await canAccessRequestByRole(req, request))) {
      return res.status(403).json({ message: "이 요청을 조회할 권한이 없습니다." });
    }

    const images = await prisma.requestImage.findMany({
      where: { requestId: id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return res.json(
      images.map((img) => ({
        ...img,
        url: img.publicUrl || storageService.getPublicUrl(img.storageKey),
      }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "이미지 목록 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 요청 이미지 업로드 (최대 5장)
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
        include: {
          createdBy: { select: { companyName: true } },
        },
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

      const currentCount = await prisma.requestImage.count({
        where: { requestId: id },
      });
      if (currentCount + files.length > MAX_REQUEST_IMAGES) {
        return res.status(400).json({
          message: `이미지는 요청당 최대 ${MAX_REQUEST_IMAGES}장까지 업로드할 수 있습니다.`,
        });
      }

      // kind 파라미터: "receipt"(인수증) 또는 "cargo"(화물, 기본값)
      const imageKind = (req as any).body?.kind === "receipt" ? "receipt" : "cargo";

      const created = await prisma.$transaction(async (tx) => {
        const rows = [];

        for (let i = 0; i < files.length; i += 1) {
          const file = files[i];
          const originalName = normalizeMultipartFilename(file.originalname);
          const stored = await storageService.saveObject({
            buffer: file.buffer,
            mimeType: file.mimetype,
            originalName,
            keyPrefix: `requests/${id}`,
          });

          const row = await tx.requestImage.create({
            data: {
              requestId: id,
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

        // 인수증(receipt) 업로드 시 자동으로 상태를 COMPLETED로 변경
        if (imageKind === "receipt") {
          await tx.request.update({
            where: { id },
            data: { status: "COMPLETED" },
          });
        }

        return rows;
      });

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
    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
        assignments: {
          include: {
            driver: true,
          },
          orderBy: { assignedAt: "desc" },
        },
        images: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        },
      },
    });

    if (!request) {
      return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
    }

    if (!(await canAccessRequestByRole(req, request))) {
      return res
        .status(403)
        .json({ message: "이 요청을 조회할 권한이 없습니다." });
    }

    res.json(request);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "배차요청 상세 조회 중 오류가 발생했습니다." });
  }
}

// 🔹 요청 상태 변경 API
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
      return res
        .status(400)
        .json({ message: `허용되지 않는 상태 값입니다: ${status}` });
    }

    const existing = await prisma.request.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }

    const role = req.user.role;

    if (role === "CLIENT") {
      const me = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { companyName: true },
      });

      const myCompany = me?.companyName?.trim();
      const requestCompany = existing.createdBy?.companyName?.trim();
      const sameCompany =
        !!myCompany && !!requestCompany && myCompany === requestCompany;

      if (!sameCompany && existing.createdById !== req.user.userId) {
        return res
          .status(403)
          .json({ message: "이 요청의 상태를 변경할 권한이 없습니다." });
      }

      if (status !== "CANCELLED") {
        return res.status(403).json({
          message: "고객 계정은 취소 상태로만 변경할 수 있습니다.",
        });
      }

      if (existing.status !== "PENDING") {
        return res.status(403).json({
          message: "고객 계정은 접수중 상태에서만 취소할 수 있습니다.",
        });
      }
    } else if (role === "ADMIN" || role === "DISPATCHER") {
      if (!canStaffChangeStatus(existing.status, status)) {
        return res.status(400).json({
          message: `허용되지 않는 상태 변경입니다. (${existing.status} -> ${status})`,
        });
      }
    } else {
      return res
        .status(403)
        .json({ message: "상태 변경 권한이 없습니다." });
    }

    const updated = await prisma.request.update({
      where: { id },
      data: { status },
    });

    res.json(updated);
  } catch (err: any) {
    console.error(err);

    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }

    res
      .status(500)
      .json({ message: "요청 상태 변경 중 오류가 발생했습니다." });
  }
}

// 🔹 배차정보 저장 + 자동 배차완료(ASSIGNED)
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

    const body = req.body as {
      driverName?: string;
      driverPhone?: string;
      vehicleNumber?: string;
      vehicleTonnage?: number | string | null;
      vehicleType?: string;
      actualFare?: number | string | null;
      billingPrice?: number | string | null;
    };

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
      return res.status(400).json({
        message: "이름, 전화번호, 차량번호, 차량종류를 모두 입력해주세요.",
      });
    }

    if (vehicleTonnage != null && Number.isNaN(vehicleTonnage)) {
      return res.status(400).json({ message: "차량 톤수 값이 올바르지 않습니다." });
    }

    const existing = await prisma.request.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }

    if (!(existing.status === "DISPATCHING" || existing.status === "ASSIGNED")) {
      return res.status(400).json({
        message: "배차정보는 배차중/배차완료 상태에서만 입력할 수 있습니다.",
      });
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
        data: {
          requestId: id,
          driverId: driver.id,
        },
      });

      const updateData: any = { status: "ASSIGNED" };
      if (body.actualFare != null) updateData.actualFare = Number(body.actualFare);
      if (body.billingPrice != null) updateData.billingPrice = Number(body.billingPrice);

      return tx.request.update({
        where: { id },
        data: updateData,
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          assignments: {
            include: {
              driver: true,
            },
            orderBy: { assignedAt: "desc" },
          },
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "배차정보 저장 중 오류가 발생했습니다.",
    });
  }
}

// 🔹 최근 배차정보 삭제 + 배차중 복귀
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

    const existing = await prisma.request.findUnique({
      where: { id },
      include: {
        assignments: {
          orderBy: { assignedAt: "desc" },
          include: { driver: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }

    const latest = existing.assignments[0];
    if (!latest) {
      return res.status(404).json({ message: "삭제할 배차정보가 없습니다." });
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.requestDriverAssignment.delete({
        where: { id: latest.id },
      });

      const remainCount = await tx.requestDriverAssignment.count({
        where: { driverId: latest.driverId },
      });

      if (remainCount === 0) {
        await tx.driver.delete({ where: { id: latest.driverId } });
      }

      return tx.request.update({
        where: { id },
        data: {
          status: "DISPATCHING",
          actualFare: null,
          billingPrice: null,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              companyName: true,
            },
          },
          assignments: {
            include: {
              driver: true,
            },
            orderBy: { assignedAt: "desc" },
          },
          images: {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
          },
        },
      });
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "배차정보 삭제 중 오류가 발생했습니다.",
    });
  }
}
