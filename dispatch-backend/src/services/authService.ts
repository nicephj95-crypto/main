// src/services/authService.ts
import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma/client";
import { Prisma, SignupRequestStatus, UserRole } from "@prisma/client";
import { env } from "../config/env";
import { sendPasswordResetEmail } from "./mailer";
import {
  emailRegex,
  hashResetToken,
  hashRefreshToken,
  ACCESS_TOKEN_EXPIRES_IN,
} from "../utils/authUtils";

// ─────────────────────────────────────────────────────────────
// 기존 (유지)
// ─────────────────────────────────────────────────────────────

export async function createRefreshToken(userId: number): Promise<string> {
  const rawToken = randomBytes(48).toString("hex");
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return rawToken;
}

// ─────────────────────────────────────────────────────────────
// 신규 서비스 함수
// ─────────────────────────────────────────────────────────────

// POST /auth/signup
export async function processSignup(name?: string, email?: string, password?: string) {
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return { ok: false as const, status: 400, message: "이름을 두 글자 이상 입력해주세요." };
  }
  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    return { ok: false as const, status: 400, message: "올바른 이메일 주소를 입력해주세요." };
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return { ok: false as const, status: 400, message: "비밀번호는 8자 이상이어야 합니다." };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const trimmedName = name.trim();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return { ok: false as const, status: 409, message: "이미 가입된 이메일입니다." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const existingRequest = await prisma.signupRequest.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingRequest?.status === "PENDING") {
    return { ok: false as const, status: 409, message: "이미 승인 대기 중인 회원가입 요청이 있습니다." };
  }

  if (existingRequest) {
    await prisma.signupRequest.update({
      where: { id: existingRequest.id },
      data: { name: trimmedName, passwordHash, status: "PENDING", reviewedById: null, reviewedAt: null },
    });
  } else {
    await prisma.signupRequest.create({
      data: { name: trimmedName, email: normalizedEmail, passwordHash },
    });
  }

  return { ok: true as const, message: "회원가입 요청이 접수되었습니다. 관리자 승인 후 로그인할 수 있습니다." };
}

// GET /auth/signup-requests
export async function listSignupRequestsData(status?: string) {
  const validStatus =
    typeof status === "string" && ["PENDING", "APPROVED", "REJECTED"].includes(status)
      ? (status as SignupRequestStatus)
      : undefined;

  return prisma.signupRequest.findMany({
    where: validStatus ? { status: validStatus } : undefined,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, status: true, reviewedAt: true,
      reviewedBy: { select: { id: true, name: true, email: true } },
      createdAt: true,
    },
  });
}

// PATCH /auth/signup-requests/:id
export async function processReviewSignup(
  requestId: number,
  action: "APPROVE" | "REJECT",
  adminUserId: number
) {
  const signupRequest = await prisma.signupRequest.findUnique({ where: { id: requestId } });
  if (!signupRequest) {
    return { ok: false as const, status: 404, message: "가입요청을 찾을 수 없습니다." };
  }
  if (signupRequest.status !== "PENDING") {
    return { ok: false as const, status: 400, message: "이미 처리된 가입요청입니다." };
  }

  if (action === "REJECT") {
    const rejected = await prisma.signupRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedById: adminUserId, reviewedAt: new Date() },
      select: {
        id: true, name: true, email: true, status: true, reviewedAt: true,
        reviewedBy: { select: { id: true, name: true, email: true } },
        createdAt: true,
      },
    });
    return { ok: true as const, data: { message: "가입요청이 반려되었습니다.", request: rejected } };
  }

  const existingUser = await prisma.user.findUnique({ where: { email: signupRequest.email } });
  if (existingUser) {
    await prisma.signupRequest.update({
      where: { id: requestId },
      data: { status: "REJECTED", reviewedById: adminUserId, reviewedAt: new Date() },
    });
    return { ok: false as const, status: 409, message: "이미 같은 이메일 계정이 존재하여 승인할 수 없습니다." };
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: signupRequest.name,
        email: signupRequest.email,
        passwordHash: signupRequest.passwordHash,
        role: "CLIENT",
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    const approvedRequest = await tx.signupRequest.update({
      where: { id: requestId },
      data: { status: "APPROVED", reviewedById: adminUserId, reviewedAt: new Date() },
      select: {
        id: true, name: true, email: true, status: true, reviewedAt: true,
        reviewedBy: { select: { id: true, name: true, email: true } },
        createdAt: true,
      },
    });

    return { user, approvedRequest };
  });

  return {
    ok: true as const,
    data: { message: "가입요청이 승인되었습니다.", user: result.user, request: result.approvedRequest },
  };
}

// POST /auth/login
export async function processLogin(email?: string, password?: string) {
  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    return { ok: false as const, status: 400, message: "올바른 이메일 주소를 입력해주세요." };
  }
  if (!password || typeof password !== "string") {
    return { ok: false as const, status: 400, message: "비밀번호를 입력해주세요." };
  }

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    return { ok: false as const, status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return { ok: false as const, status: 401, message: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });
  const refreshToken = await createRefreshToken(user.id);

  return {
    ok: true as const,
    data: {
      token,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName ?? null,
      },
    },
  };
}

// POST /auth/refresh
export async function processRefreshToken(rawRefreshToken?: string) {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") {
    return { ok: false as const, status: 400, message: "refreshToken 값은 필수입니다." };
  }

  const tokenHash = hashRefreshToken(rawRefreshToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true, companyName: true },
      },
    },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    return { ok: false as const, status: 401, message: "유효하지 않거나 만료된 refresh token 입니다." };
  }

  const nextRefreshToken = randomBytes(48).toString("hex");
  const nextHash = hashRefreshToken(nextRefreshToken);
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: now } }),
    prisma.refreshToken.create({ data: { userId: stored.userId, tokenHash: nextHash, expiresAt } }),
  ]);

  const token = jwt.sign({ userId: stored.user.id, role: stored.user.role }, env.JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

  return { ok: true as const, data: { token, refreshToken: nextRefreshToken, user: stored.user } };
}

// POST /auth/logout
export async function processLogout(rawRefreshToken?: string) {
  if (!rawRefreshToken || typeof rawRefreshToken !== "string") return;
  const tokenHash = hashRefreshToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

// POST /auth/password-reset/request
export async function processPasswordResetRequest(email?: string) {
  if (!email || typeof email !== "string" || !emailRegex.test(email)) {
    return { ok: false as const, status: 400, message: "올바른 이메일 주소를 입력해주세요." };
  }

  const normalizedEmail = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  if (!user) {
    return {
      ok: true as const,
      message: "요청이 접수되었습니다. 등록된 이메일이라면 비밀번호 재설정 안내가 전송됩니다.",
    };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  try {
    const mailResult = await sendPasswordResetEmail({ to: normalizedEmail, token: rawToken, expiresAt });
    if (!mailResult.sent || env.NODE_ENV !== "production") {
      // 토큰 앞 4자리만 로깅 (디버그 추적용, 전체 토큰 절대 기록 금지)
      console.log(
        `[password-reset] email=${normalizedEmail} tokenPrefix=${rawToken.slice(0, 4)}… expiresAt=${expiresAt.toISOString()} mailSent=${mailResult.sent}${
          mailResult.reason ? ` reason=${mailResult.reason}` : ""
        }`
      );
    }
  } catch {
    console.error("[password-reset] email send failed (token not logged)");
  }

  return {
    ok: true as const,
    message: "요청이 접수되었습니다. 등록된 이메일이라면 비밀번호 재설정 안내가 전송됩니다.",
  };
}

// POST /auth/password-reset/confirm
export async function processPasswordResetConfirm(token?: string, newPassword?: string) {
  if (!token || typeof token !== "string") {
    return { ok: false as const, status: 400, message: "token 값은 필수입니다." };
  }
  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 8) {
    return { ok: false as const, status: 400, message: "비밀번호는 최소 8자 이상이어야 합니다." };
  }

  const now = new Date();
  const tokenHash = hashResetToken(token);
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < now) {
    return { ok: false as const, status: 400, message: "유효하지 않거나 만료된 재설정 토큰입니다." };
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash: hashedPassword } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: now } }),
    prisma.passwordResetToken.deleteMany({
      where: { userId: resetToken.userId, id: { not: resetToken.id } },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: resetToken.userId, revokedAt: null },
      data: { revokedAt: now },
    }),
  ]);

  return {
    ok: true as const,
    message: "비밀번호가 성공적으로 재설정되었습니다. 새 비밀번호로 로그인하세요.",
  };
}

// POST /auth/change-password
export async function processChangePassword(
  userId: number,
  currentPassword?: string,
  newPassword?: string
) {
  if (!currentPassword || !newPassword) {
    return { ok: false as const, status: 400, message: "currentPassword, newPassword는 필수입니다." };
  }
  if (newPassword.length < 8) {
    return { ok: false as const, status: 400, message: "비밀번호는 최소 8자 이상이어야 합니다." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false as const, status: 404, message: "로그인된 사용자를 찾을 수 없습니다." };
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return { ok: false as const, status: 400, message: "현재 비밀번호가 일치하지 않습니다." };
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hashed } });
  await prisma.refreshToken.updateMany({
    where: { userId: user.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return { ok: true as const, message: "비밀번호가 성공적으로 변경되었습니다." };
}

// PATCH /auth/profile
export async function processUpdateProfile(userId: number, name?: string) {
  if (!name || name.trim() === "") {
    return { ok: false as const, status: 400, message: "이름은 비워둘 수 없습니다." };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name: name.trim() },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return { ok: true as const, data: { message: "프로필이 수정되었습니다.", user: updated } };
}

// PATCH /auth/users/:id/role
export async function processChangeUserRole(targetId: number, role?: UserRole) {
  if (!role) {
    return { ok: false as const, status: 400, message: "role 값은 필수입니다." };
  }
  if (!["ADMIN", "DISPATCHER", "CLIENT"].includes(role)) {
    return { ok: false as const, status: 400, message: "올바른 role 값이 아닙니다." };
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return { ok: true as const, data: { message: "권한이 변경되었습니다.", user: updated } };
}

// GET /auth/users
export async function fetchUsersList() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, companyName: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
}

// PATCH /auth/users/:id/company
export async function processChangeUserCompany(userId: number, companyName?: string | null) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      companyName:
        companyName && companyName.trim() !== "" ? companyName.trim() : null,
    },
    select: { id: true, name: true, email: true, role: true, companyName: true, createdAt: true },
  });

  return { ok: true as const, data: { message: "회사 정보가 변경되었습니다.", user: updated } };
}
