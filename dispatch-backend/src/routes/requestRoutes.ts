// src/routes/requestRoutes.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma/client";
import type { RequestStatus } from "@prisma/client";

// 🔹 JWT 유저 정보를 쓰기 위해
import type { AuthRequest } from "../middleware/authMiddleware";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
// 🔹 최근 N건 배차내역 (로그인한 유저 기준)
//    GET /requests/recent?limit=5
router.get(
  "/recent",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
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

      const list = await prisma.request.findMany({
        where: {
          createdById: userId,
        },
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
);

/**
 * 배차 요청 생성
 * POST /requests
 *
 * body 예시:
 * {
 *   "pickup": { ... },
 *   "dropoff": { ... },
 *   "vehicle": { ... },
 *   "cargo": { ... },
 *   "options": { ... },
 *   "payment": { ... }
 * }
 */
router.post(
  "/",
  authMiddleware,                // ✅ 토큰 검사
  async (req: AuthRequest, res: Response) => {
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
);


/**
 * 배차 요청 목록 조회 (상태/기간 + 페이지네이션)
 * GET /requests?status=&from=&to=&page=&pageSize=
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, from, to, page, pageSize } = req.query as {
      status?: string;
      from?: string;
      to?: string;
      page?: string;
      pageSize?: string;
    };

    const where: any = {};

    // 🔹 상태 필터 (ALL 이면 전체)
    if (status && status !== "ALL") {
      where.status = status as RequestStatus;
    }

    // 🔹 기간 필터 (createdAt 기준)
    if (from || to) {
      where.createdAt = {};
      if (from) {
        (where.createdAt as any).gte = new Date(`${from}T00:00:00.000Z`);
      }
      if (to) {
        (where.createdAt as any).lte = new Date(`${to}T23:59:59.999Z`);
      }
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
        },
      }),
      prisma.request.count({ where }),
    ]);

    return res.json({
      items,
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
});

// 🔹 특정 배차요청 상세 조회
router.get("/:id", async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id가 올바르지 않습니다." });
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id },
    });

    if (!request) {
      return res.status(404).json({ message: "해당 배차요청을 찾을 수 없습니다." });
    }

    res.json(request);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "배차요청 상세 조회 중 오류가 발생했습니다." });
  }
});

// 🔹 요청 상태 변경 API
router.patch("/:id/status", async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }

    const { status } = req.body as { status?: RequestStatus };

    if (!status) {
      return res.status(400).json({ message: "변경할 상태(status)가 필요합니다." });
    }

    const allowed: RequestStatus[] = [
      "PENDING",
      "DISPATCHING",
      "ASSIGNED",
      "IN_TRANSIT",
      "COMPLETED",
      "CANCELLED",
    ];

    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ message: `허용되지 않는 상태 값입니다: ${status}` });
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
});

export default router;