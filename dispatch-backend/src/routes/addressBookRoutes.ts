// src/routes/addressBookRoutes.ts
import { Router } from "express";
import { prisma } from "../prisma/client";
import { authMiddleware, AuthRequest } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";

const router = Router();

// 모든 주소록 API는 로그인 필수
router.use(authMiddleware);

// 🔹 주소록 목록 조회: 회사(화주) 기준 + 검색 + ADMIN 필터
router.get("/", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!me) {
      return res.status(401).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const q =
      typeof req.query.q === "string" ? req.query.q.trim() : "";
    const companyFilter =
      typeof req.query.companyName === "string" &&
      req.query.companyName.trim() !== ""
        ? req.query.companyName.trim()
        : undefined;

    const where: any = {};

    // 🔍 검색어 조건
    if (q) {
      where.OR = [
        { placeName: { contains: q } },
        { address: { contains: q } },
        { addressDetail: { contains: q } },
        { contactName: { contains: q } },
        { contactPhone: { contains: q } },
      ];
    }

    const isAdmin = me.role === "ADMIN";

    if (isAdmin) {
      // 🔹 ADMIN: 전체를 보되, companyName 쿼리 있으면 해당 회사만 필터
      if (companyFilter) {
        where.user = { companyName: companyFilter };
      }
    } else {
      // 🔹 일반 유저: 같은 회사 주소록 공유
      if (me.companyName && me.companyName.trim() !== "") {
        where.user = { companyName: me.companyName };
      } else {
        // 회사 정보 없으면, 일단 "본인이 만든 주소만"
        where.userId = me.id;
      }
    }

    const list = await prisma.addressBook.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return res.json(list);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 조회 중 오류가 발생했습니다." });
  }
});

// 🔹 주소록 생성 (userId = 현재 로그인 유저)
router.post("/", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const { placeName, address, addressDetail, contactName, contactPhone, type } =
      req.body as {
        placeName?: string;
        address?: string;
        addressDetail?: string;
        contactName?: string;
        contactPhone?: string;
        type?: "PICKUP" | "DROPOFF" | "BOTH";
      };

    if (!placeName || !address || !type) {
      return res.status(400).json({
        message: "placeName, address, type은 필수입니다.",
      });
    }

    const created = await prisma.addressBook.create({
      data: {
        userId: req.user.userId,
        placeName,
        address,
        addressDetail: addressDetail || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        type,
      },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 생성 중 오류가 발생했습니다." });
  }
});

// 🔹 주소록 수정 (지금은 "만든 사람만" 수정 가능)
router.patch("/:id", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    // 만든 사람인지 확인
    const existing = await prisma.addressBook.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "해당 주소록을 찾을 수 없습니다." });
    }

    if (existing.userId !== req.user.userId) {
      // 필요하다면 나중에 "같은 회사면 수정 허용"으로 완화 가능
      return res
        .status(403)
        .json({ message: "이 주소록을 수정할 권한이 없습니다." });
    }

    const { placeName, address, addressDetail, contactName, contactPhone, type } =
      req.body as {
        placeName?: string;
        address?: string;
        addressDetail?: string;
        contactName?: string;
        contactPhone?: string;
        type?: "PICKUP" | "DROPOFF" | "BOTH";
      };

    const updated = await prisma.addressBook.update({
      where: { id },
      data: {
        placeName: placeName ?? existing.placeName,
        address: address ?? existing.address,
        addressDetail:
          addressDetail !== undefined
            ? addressDetail
            : existing.addressDetail,
        contactName:
          contactName !== undefined
            ? contactName
            : existing.contactName,
        contactPhone:
          contactPhone !== undefined
            ? contactPhone
            : existing.contactPhone,
        type: type ?? existing.type,
      },
    });

    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 수정 중 오류가 발생했습니다." });
  }
});

// 🔹 주소록 삭제 (마찬가지로 만든 사람만)
router.delete("/:id", async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 ID입니다." });
    }

    const existing = await prisma.addressBook.findUnique({
      where: { id },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ message: "해당 주소록을 찾을 수 없습니다." });
    }

    if (existing.userId !== req.user.userId) {
      return res
        .status(403)
        .json({ message: "이 주소록을 삭제할 권한이 없습니다." });
    }

    await prisma.addressBook.delete({ where: { id } });

    return res.status(204).send();
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "주소록 삭제 중 오류가 발생했습니다." });
  }
});

// 🔹 (선택) ADMIN용: 회사 목록(중복 제거) 조회
router.get(
  "/companies",
  requireRole("ADMIN"),
  async (req: AuthRequest, res) => {
    try {
      const companies = await prisma.user.findMany({
        where: { companyName: { not: null } },
        select: { companyName: true },
        distinct: ["companyName"],
        orderBy: { companyName: "asc" },
      });

      return res.json(
        companies
          .map((c) => c.companyName)
          .filter((name): name is string => !!name)
      );
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "회사 목록 조회 중 오류가 발생했습니다." });
    }
  }
);

export default router;