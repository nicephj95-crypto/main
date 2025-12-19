// src/routes/authRoutes.ts
import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client";
import { Prisma } from "@prisma/client";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

// .env 에서 JWT_SECRET 읽기
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

// 간단한 이메일 형식 체크 (완벽할 필요 없음)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ─────────────────────────────
// 1) 회원가입: POST /auth/signup
// ─────────────────────────────
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body as {
      name?: string;
      email?: string;
      password?: string;
    };

    // 1) 기본 벨리데이션
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return res
        .status(400)
        .json({ message: "이름을 두 글자 이상 입력해주세요." });
    }

    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "올바른 이메일 주소를 입력해주세요." });
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ message: "비밀번호는 8자 이상이어야 합니다." });
    }

    // 2) 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10); // saltRounds = 10

    // 3) 사용자 생성 (email unique)
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
      },
    });

    // 4) 비밀번호 빼고 응답
    return res.status(201).json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    console.error(err);

    // 이메일 중복 (unique 제약 위반)
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res
        .status(409)
        .json({ message: "이미 가입된 이메일입니다." });
    }

    return res
      .status(500)
      .json({ message: "회원가입 중 오류가 발생했습니다." });
  }
});

// ─────────────────────────────
// 2) 로그인: POST /auth/login
// ─────────────────────────────
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as {
      email?: string;
      password?: string;
    };

    // 1) 기본 벨리데이션
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "올바른 이메일 주소를 입력해주세요." });
    }

    if (!password || typeof password !== "string") {
      return res
        .status(400)
        .json({ message: "비밀번호를 입력해주세요." });
    }

    // 2) 해당 이메일 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      // 일부러 "이메일 or 비밀번호가 잘못되었습니다."라고 뭉뚱그려서 리턴 (보안상)
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // 3) 비밀번호 검증
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res
        .status(401)
        .json({ message: "이메일 또는 비밀번호가 올바르지 않습니다." });
    }

    // 4) JWT 발급
    if (!JWT_SECRET) {
      console.error("JWT_SECRET 이 설정되지 않았습니다.");
      return res
        .status(500)
        .json({ message: "서버 설정 오류(JWT)로 로그인할 수 없습니다." });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" } // 7일 유효
    );

    // 5) 토큰 + 유저 정보 응답
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "로그인 중 오류가 발생했습니다." });
  }
});


// 🔹 아이디 찾기: 이름으로 이메일 목록 조회 (연습용)
router.post("/find-id", async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };

    if (!name) {
      return res.status(400).json({
        message: "name 은 필수입니다.",
      });
    }

    const users = await prisma.user.findMany({
      where: { name },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (users.length === 0) {
      return res.status(404).json({
        message: "해당 이름으로 등록된 사용자를 찾을 수 없습니다.",
      });
    }

    return res.json({
      count: users.length,
      users,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "아이디 찾기 처리 중 오류가 발생했습니다." });
  }
});

// 🔹 비밀번호 재설정 (로그인 안 된 상태, email+name 으로 본인 확인 후 새 비번 설정)
router.post("/reset-password", async (req: Request, res: Response) => {
  try {
    const { email, name, newPassword } = req.body as {
      email?: string;
      name?: string;
      newPassword?: string;
    };

    if (!email || !name || !newPassword) {
      return res.status(400).json({
        message: "email, name, newPassword는 필수입니다.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "비밀번호는 최소 8자 이상이어야 합니다.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(404).json({
        message: "해당 이메일의 사용자를 찾을 수 없습니다.",
      });
    }

    if (user.name !== name) {
      return res.status(400).json({
        message: "이름이 이메일에 등록된 사용자와 일치하지 않습니다.",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashed,
      },
    });

    return res.json({
      message: "비밀번호가 성공적으로 변경되었습니다. 새 비밀번호로 로그인하세요.",
      email: user.email,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "비밀번호 재설정 중 오류가 발생했습니다." });
  }
});

// 🔹 비밀번호 변경 (로그인 된 상태에서, 현재 비번 확인 후 변경)
router.post(
  "/change-password",
  authMiddleware, // 🔐 JWT 필수
  async (req: Request, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body as {
        currentPassword?: string;
        newPassword?: string;
      };

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          message: "currentPassword, newPassword는 필수입니다.",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message: "비밀번호는 최소 8자 이상이어야 합니다.",
        });
      }

      // authMiddleware 에서 넣어준 user 정보 사용
      const authUser = (req as any).user as { userId: number; role: string };

      const user = await prisma.user.findUnique({
        where: { id: authUser.userId },
      });

      if (!user) {
        return res
          .status(404)
          .json({ message: "로그인된 사용자를 찾을 수 없습니다." });
      }

      // 현재 비번 확인
      const isMatch = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isMatch) {
        return res
          .status(400)
          .json({ message: "현재 비밀번호가 일치하지 않습니다." });
      }

      // 새 비번 해시
      const hashed = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashed,
        },
      });

      return res.json({
        message: "비밀번호가 성공적으로 변경되었습니다.",
      });
    } catch (err) {
      console.error(err);
      return res
        .status(500)
        .json({ message: "비밀번호 변경 중 오류가 발생했습니다." });
    }
  }
);

export default router;