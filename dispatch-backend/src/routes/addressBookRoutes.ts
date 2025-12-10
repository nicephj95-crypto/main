// src/routes/addressBookRoutes.ts
import { Router, Request, Response } from "express";
import { prisma } from "../prisma/client";

const router = Router();

/**
 * 주소록 목록 조회
 * GET /address-book?type=PICKUP|DROPOFF|BOTH
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { type } = req.query;

    const where: any = {};
    if (type && typeof type === "string") {
      // 대문자로 변환해서 enum 값과 맞춰줌
      const upper = type.toUpperCase();
      if (upper === "PICKUP" || upper === "DROPOFF" || upper === "BOTH") {
        where.type = upper;
      }
    }

    // TODO: 나중에 로그인 붙이면 userId = 로그인한 유저 id
    const userId = 1;
    where.userId = userId;

    const list = await prisma.addressBook.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "주소록 조회 중 오류가 발생했습니다." });
  }
});

/**
 * 주소록 추가
 * POST /address-book
 * body 예시:
 * {
 *   "placeName": "ABC물류센터",
 *   "type": "PICKUP",
 *   "address": "인천 서구 OO로 123",
 *   "addressDetail": "3층 입고장",
 *   "contactName": "홍길동",
 *   "contactPhone": "010-0000-0000"
 * }
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      placeName,
      type,
      address,
      addressDetail,
      contactName,
      contactPhone,
    } = req.body;

    if (!placeName || !type || !address) {
      return res.status(400).json({
        message: "placeName, type, address 는 필수입니다.",
      });
    }

    const upperType = String(type).toUpperCase();
    if (
      upperType !== "PICKUP" &&
      upperType !== "DROPOFF" &&
      upperType !== "BOTH"
    ) {
      return res.status(400).json({
        message: "type 은 PICKUP / DROPOFF / BOTH 중 하나여야 합니다.",
      });
    }

    // 나중에 로그인 붙이면 여기서 실제 userId 사용
    const userId = 1;

    const created = await prisma.addressBook.create({
      data: {
        userId,
        placeName,
        type: upperType,
        address,
        addressDetail,
        contactName,
        contactPhone,
      },
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "주소록 저장 중 오류가 발생했습니다." });
  }
});

export default router;