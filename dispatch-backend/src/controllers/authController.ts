// src/controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "crypto";
import { prisma } from "../prisma/client";
import { Prisma, SignupRequestStatus, UserRole } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { env } from "../config/env";
import { sendPasswordResetEmail } from "../services/mailer";
import { createRefreshToken } from "../services/authService";
import {
  emailRegex,
  hashResetToken,
  hashRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
} from "../utils/authUtils";

// ─────────────────────────────
// 1) 회원가입: POST /auth/signup
// ─────────────────────────────
export async function signup(req: Request, res: Response) {
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

    const normalizedEmail = email.toLowerCase().trim();
    const trimmedName = name.trim();

    // 이미 가입된 계정이면 요청 생성 불가
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ message: "이미 가입된 이메일입니다." });
    }

    // 2) 비밀번호 해시
    const passwordHash = await bcrypt.hash(password, 10); // saltRounds = 10

    // 3) 가입요청 생성/갱신
    const existingRequest = await prisma.signupRequest.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingRequest?.status === "PENDING") {
      return res.status(409).json({
        message: "이미 승인 대기 중인 회원가입 요청이 있습니다.",
      });
    }

    if (existingRequest) {
      await prisma.signupRequest.update({
        where: { id: existingRequest.id },
        data: {
          name: trimmedName,
          passwordHash,
          status: "PENDING",
          reviewedById: null,
          reviewedAt: null,
        },
      });
    } else {
      await prisma.signupRequest.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          passwordHash,
        },
      });
    }

    return res.status(201).json({
      message: "회원가입 요청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다.",
    });
  } catch (err: any) {
    console.error(err);

    return res
      .status(500)
      .json({ message: "회원가입 요청 처리 중 오류가 발생했습니다." });
  }
}

// ─────────────────────────────
// 1-1) (ADMIN 전용) 가입요청 목록 조회
//    GET /auth/signup-requests?status=PENDING
// ─────────────────────────────
export async function listSignupRequests(req: Request, res: Response) {
  try {
    const statusParam = req.query.status;
    const status =
      typeof statusParam === "string" &&
      ["PENDING", "APPROVED", "REJECTED"].includes(statusParam)
        ? (statusParam as SignupRequestStatus)
        : undefined;

    const list = await prisma.signupRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        reviewedAt: true,
        reviewedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        createdAt: true,
      },
    });

    return res.json(list);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "가입요청 목록 조회 중 오류가 발생했습니다." });
  }
}

// ─────────────────────────────
// 1-2) (ADMIN 전용) 가입요청 승인/반려
//    PATCH /auth/signup-requests/:id
//    body: { action: "APPROVE" | "REJECT" }
// ─────────────────────────────
export async function reviewSignupRequest(req: Request, res: Response) {
  try {
    const requestId = Number(req.params.id);
    if (Number.isNaN(requestId)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }

    const { action } = req.body as { action?: "APPROVE" | "REJECT" };
    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res
        .status(400)
        .json({ message: "action은 APPROVE 또는 REJECT 여야 합니다." });
    }

    const adminUser = (req as any).user as { userId: number; role: string };
    const signupRequest = await prisma.signupRequest.findUnique({
      where: { id: requestId },
    });

    if (!signupRequest) {
      return res.status(404).json({ message: "가입요청을 찾을 수 없습니다." });
    }
    if (signupRequest.status !== "PENDING") {
      return res
        .status(400)
        .json({ message: "이미 처리된 가입요청입니다." });
    }

    if (action === "REJECT") {
      const rejected = await prisma.signupRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedById: adminUser.userId,
          reviewedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          reviewedAt: true,
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdAt: true,
        },
      });

      return res.json({
        message: "가입요청이 반려되었습니다.",
        request: rejected,
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: signupRequest.email },
    });
    if (existingUser) {
      await prisma.signupRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedById: adminUser.userId,
          reviewedAt: new Date(),
        },
      });
      return res.status(409).json({
        message: "이미 같은 이메일 계정이 존재하여 승인할 수 없습니다.",
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: signupRequest.name,
          email: signupRequest.email,
          passwordHash: signupRequest.passwordHash,
          role: "CLIENT",
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const approvedRequest = await tx.signupRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedById: adminUser.userId,
          reviewedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          reviewedAt: true,
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          createdAt: true,
        },
      });

      return { user, approvedRequest };
    });

    return res.json({
      message: "가입요청이 승인되었습니다.",
      user: result.user,
      request: result.approvedRequest,
    });
  } catch (err: any) {
    console.error(err);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return res.status(409).json({
        message: "이미 같은 이메일 계정이 존재하여 승인할 수 없습니다.",
      });
    }
    return res
      .status(500)
      .json({ message: "가입요청 처리 중 오류가 발생했습니다." });
  }
}

// ─────────────────────────────
// 2) 로그인: POST /auth/login
// ─────────────────────────────
export async function login(req: Request, res: Response) {
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

    // 4) JWT + refresh token 발급
    const token = jwt.sign(
      {
        userId: user.id,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
    const refreshToken = await createRefreshToken(user.id);

    // 5) 토큰 + 유저 정보 응답
    return res.json({
      token,
      refreshToken,
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
}

// 🔹 토큰 갱신 (refresh token 회전)
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: rawRefreshToken } = req.body as { refreshToken?: string };
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return res
        .status(400)
        .json({ message: "refreshToken 값은 필수입니다." });
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return res
        .status(401)
        .json({ message: "유효하지 않거나 만료된 refresh token 입니다." });
    }

    const nextRefreshToken = randomBytes(48).toString("hex");
    const nextHash = hashRefreshToken(nextRefreshToken);
    const expiresAt = new Date(
      Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
    );
    const now = new Date();

    await prisma.$transaction([
      prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revokedAt: now },
      }),
      prisma.refreshToken.create({
        data: {
          userId: stored.userId,
          tokenHash: nextHash,
          expiresAt,
        },
      }),
    ]);

    const token = jwt.sign(
      {
        userId: stored.user.id,
        role: stored.user.role,
      },
      env.JWT_SECRET,
      { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );

    return res.json({
      token,
      refreshToken: nextRefreshToken,
      user: stored.user,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "토큰 갱신 중 오류가 발생했습니다." });
  }
}

// 🔹 로그아웃 (refresh token 폐기)
export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken: rawRefreshToken } = req.body as { refreshToken?: string };
    if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
      return res.json({ message: "로그아웃 처리되었습니다." });
    }

    const tokenHash = hashRefreshToken(rawRefreshToken);
    await prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    return res.json({ message: "로그아웃 처리되었습니다." });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "로그아웃 처리 중 오류가 발생했습니다." });
  }
}

// 🔹 비밀번호 재설정 요청 (이메일 발송 대신 dev에서는 콘솔 출력)
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body as { email?: string };
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return res
        .status(400)
        .json({ message: "올바른 이메일 주소를 입력해주세요." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 계정 존재 여부를 노출하지 않기 위해 동일한 성공 응답 사용
    if (!user) {
      return res.json({
        message:
          "요청이 접수되었습니다. 등록된 이메일이라면 비밀번호 재설정 안내가 전송됩니다.",
      });
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(
      Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000
    );

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    try {
      const mailResult = await sendPasswordResetEmail({
        to: normalizedEmail,
        token: rawToken,
        expiresAt,
      });

      // 개발/초기 배포 환경에서 메일 설정 전에도 테스트 가능하도록 fallback 로그 유지
      if (!mailResult.sent || env.NODE_ENV !== "production") {
        console.log(
          `[password-reset] email=${normalizedEmail} token=${rawToken} expiresAt=${expiresAt.toISOString()} mailSent=${mailResult.sent}${
            mailResult.reason ? ` reason=${mailResult.reason}` : ""
          }`
        );
      }
    } catch (mailErr) {
      console.error("[password-reset] email send failed:", mailErr);
      if (env.NODE_ENV !== "production") {
        console.log(
          `[password-reset] fallback email=${normalizedEmail} token=${rawToken} expiresAt=${expiresAt.toISOString()}`
        );
      }
    }

    return res.json({
      message:
        "요청이 접수되었습니다. 등록된 이메일이라면 비밀번호 재설정 안내가 전송됩니다.",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "비밀번호 재설정 요청 처리 중 오류가 발생했습니다." });
  }
}

// 🔹 비밀번호 재설정 확정
export async function confirmPasswordReset(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body as {
      token?: string;
      newPassword?: string;
    };

    if (!token || typeof token !== "string") {
      return res.status(400).json({ message: "token 값은 필수입니다." });
    }
    if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
      return res
        .status(400)
        .json({ message: "비밀번호는 최소 8자 이상이어야 합니다." });
    }

    const now = new Date();
    const tokenHash = hashResetToken(token);
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < now) {
      return res
        .status(400)
        .json({ message: "유효하지 않거나 만료된 재설정 토큰입니다." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
        },
      }),
      prisma.refreshToken.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      }),
    ]);

    return res.json({
      message: "비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인하세요.",
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "비밀번호 재설정 중 오류가 발생했습니다." });
  }
}

// 🔹 비밀번호 변경 (로그인 된 상태에서, 현재 비번 확인 후 변경)
export async function changePassword(req: Request, res: Response) {
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

    await prisma.refreshToken.updateMany({
      where: {
        userId: user.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
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

export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res
        .status(401)
        .json({ message: "인증 정보가 없습니다." });
    }

    const { name } = req.body as { name?: string };

    if (!name || name.trim() === "") {
      return res
        .status(400)
        .json({ message: "이름은 비워둘 수 없습니다." });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "프로필이 수정되었습니다.",
      user: updated,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "프로필 수정 중 오류가 발생했습니다." });
  }
}

// ─────────────────────────────
// 3) (ADMIN 전용) 다른 사용자 권한 변경
//    PATCH /auth/users/:id/role
// ─────────────────────────────
export async function changeUserRole(req: Request, res: Response) {
  try {
    const targetId = Number(req.params.id);

    const { role } = req.body as {
      role?: UserRole; // ✅ Prisma에서 가져온 enum 타입 사용
    };

    // 1) 아예 안 들어온 경우
    if (!role) {
      return res
        .status(400)
        .json({ message: "role 값은 필수입니다." });
    }

    // 2) 우리가 허용하는 값인지 한 번 더 방어적으로 체크 (사실 UserRole이면 이미 안전하긴 함)
    if (!["ADMIN", "DISPATCHER", "CLIENT"].includes(role)) {
      return res
        .status(400)
        .json({ message: "올바른 role 값이 아닙니다." });
    }

    // 3) 업데이트
    const updated = await prisma.user.update({
      where: { id: targetId },
      data: {
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "권한이 변경되었습니다.",
      user: updated,
    });
  } catch (err: any) {
    console.error(err);

    // 대상 사용자 없을 때
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return res
        .status(404)
        .json({ message: "해당 사용자를 찾을 수 없습니다." });
    }

    return res
      .status(500)
      .json({ message: "권한 변경 중 오류가 발생했습니다." });
  }
}

// ─────────────────────────────
// 4) (ADMIN 전용) 사용자 목록 조회
//    GET /auth/users
// ─────────────────────────────
export async function listUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json(users);
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ message: "사용자 목록 조회 중 오류가 발생했습니다." });
  }
}

// ─────────────────────────────
// (ADMIN 전용) 특정 사용자 회사명 변경
//    PATCH /auth/users/:id/company
// ─────────────────────────────
export async function changeUserCompany(req: Request, res: Response) {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res
        .status(400)
        .json({ message: "유효하지 않은 사용자 ID입니다." });
    }

    const { companyName } = req.body as { companyName?: string | null };

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        companyName:
          companyName && companyName.trim() !== ""
            ? companyName.trim()
            : null, // 빈값이면 해제
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyName: true,
        createdAt: true,
      },
    });

    return res.json({
      message: "회사 정보가 변경되었습니다.",
      user: updated,
    });
  } catch (err: any) {
    console.error(err);

    if (err.code === "P2025") {
      return res
        .status(404)
        .json({ message: "해당 사용자를 찾을 수 없습니다." });
    }

    return res
      .status(500)
      .json({ message: "회사 정보 변경 중 오류가 발생했습니다." });
  }
}
