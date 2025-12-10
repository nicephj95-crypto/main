// src/routes/requestRoutes.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma/client";
import type { RequestStatus } from "@prisma/client";

const router = Router();

/**
 * 배차 요청 생성
 * POST /requests
 * 
 * body 예시:
 * {
 *   "pickupPlaceName": "출발 센터",
 *   "pickupAddress": "인천 서구 OO로 123",
 *   "pickupAddressDetail": "1층 상차장",
 *   "pickupContactName": "홍길동",
 *   "pickupContactPhone": "010-0000-0000",
 *   "pickupMethod": "MANUAL",
 *   "pickupIsImmediate": true,
 *   "pickupDatetime": "2025-12-02T15:00:00.000Z",
 * 
 *   "dropoffPlaceName": "도착 물류창고",
 *   "dropoffAddress": "서울 강남구 OO로 456",
 *   "dropoffAddressDetail": "지하 하차장",
 *   "dropoffContactName": "김철수",
 *   "dropoffContactPhone": "010-1111-2222",
 *   "dropoffMethod": "MANUAL",
 *   "dropoffIsImmediate": false,
 *   "dropoffDatetime": "2025-12-02T18:00:00.000Z",
 * 
 *   "vehicleGroup": "ONE_TON_PLUS",
 *   "vehicleTonnage": 1.4,
 *   "vehicleBodyType": "탑차",
 * 
 *   "cargoDescription": "전자제품 10파렛트",
 *   "requestType": "NORMAL",
 *   "driverNote": "파렛트있음, 역주행주의",
 * 
 *   "paymentMethod": "CARD",
 *   "distanceKm": 32.5,
 *   "quotedPrice": 55000
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
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

    // 로그인 붙기 전 임시: 항상 userId 1번이 생성한 것으로
    const createdById = 1;

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

        // 생성자
        createdById,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "배차 요청 생성 중 오류가 발생했습니다.",
    });
  }
});

/**
 * 간단 목록 조회
 * GET /requests
 * (나중에 query로 기간/상태/검색조건 추가 예정)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, from, to } = req.query;

    // where 조건을 담을 객체
    const where: any = {};

    // 🔹 상태 필터
    if (typeof status === "string" && status.length > 0) {
      where.status = status as RequestStatus;
    }

    // 🔹 기간 필터 (createdAt 기준)
    // 프론트에서 type="date"로 넘기면 "YYYY-MM-DD" 형식일 거라고 가정
    if (typeof from === "string" || typeof to === "string") {
      where.createdAt = {};

      if (typeof from === "string" && from.length > 0) {
        // 그 날짜의 00:00:00 부터
        where.createdAt.gte = new Date(`${from}T00:00:00`);
      }

      if (typeof to === "string" && to.length > 0) {
        // 그 날짜의 23:59:59.999 까지
        where.createdAt.lte = new Date(`${to}T23:59:59.999`);
      }
    }

    const list = await prisma.request.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(list);
  } catch (err) {
    console.error(err);
    res
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

    // 상태 값이 enum에 해당하는지 간단 체크 (문자열 기반)
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

    // 존재하지 않는 ID인 경우 등
    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 ID의 요청을 찾을 수 없습니다." });
    }

    res
      .status(500)
      .json({ message: "요청 상태 변경 중 오류가 발생했습니다." });
  }
});


export default router;