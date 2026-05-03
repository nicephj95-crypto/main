// src/controllers/authController.ts
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { logError, logAudit } from "../utils/logger";
import { env } from "../config/env";
import { writeAuditLog } from "../services/auditLogService";
import { SESSION_TTL_MS } from "../utils/authUtils";

/** refresh token을 HttpOnly 쿠키로 설정 */
function setRefreshCookie(res: Response, token: string) {
  const isProd = env.NODE_ENV === "production";
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

/** refresh token 쿠키 제거 */
function clearRefreshCookie(res: Response) {
  const isProd = env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  } as const;
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/" });
  res.clearCookie("refreshToken", { ...cookieOptions, path: "/auth" });
}
import {
  processSignup,
  listSignupRequestsData,
  processReviewSignup,
  processLogin,
  processRefreshToken,
  processLogout,
  processPasswordResetRequest,
  processPasswordResetConfirm,
  processChangePassword,
  processUpdateProfile,
  processChangeUserRole,
  fetchUsersList,
  processChangeUserCompany,
  processUpdateUserDetails,
} from "../services/authService";

// POST /auth/signup
export async function signup(req: Request, res: Response) {
  try {
    const { name, email, password } = req.body as {
      name?: string; email?: string; password?: string;
    };
    const result = await processSignup(name, email, password);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.status(201).json({ message: result.message });
  } catch (err) {
    logError("signup", err);
    return res.status(500).json({ message: "회원가입 요청 처리 중 오류가 발생했습니다." });
  }
}

// GET /auth/signup-requests
export async function listSignupRequests(req: Request, res: Response) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const size = typeof req.query.size === "string" ? Number(req.query.size) : undefined;
    const list = await listSignupRequestsData({ status, q, page, size });
    return res.json(list);
  } catch (err) {
    logError("listSignupRequests", err);
    return res.status(500).json({ message: "가입요청 목록 조회 중 오류가 발생했습니다." });
  }
}

// PATCH /auth/signup-requests/:id
export async function reviewSignupRequest(req: Request, res: Response) {
  try {
    const requestId = Number(req.params.id);
    if (Number.isNaN(requestId)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }

    const { action, role, companyName, department } = req.body as {
      action?: "APPROVE" | "REJECT";
      role?: "ADMIN" | "DISPATCHER" | "SALES" | "CLIENT";
      companyName?: string | null;
      department?: string | null;
    };
    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "action은 APPROVE 또는 REJECT 여야 합니다." });
    }

    const adminUser = (req as any).user as { userId: number };
    const result = await processReviewSignup(requestId, action, adminUser.userId, {
      role,
      companyName,
      department,
    });
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    logAudit("review_signup_request", { adminId: adminUser.userId, requestId, action });
    void writeAuditLog({
      req: req as AuthRequest,
      userId: adminUser.userId,
      userRole: (req as any as AuthRequest).user?.role,
      action: action === "APPROVE" ? "APPROVE" : "REJECT",
      resource: "USER",
      resourceId: result.data?.user?.id ?? requestId,
      target: "signup_request",
      detail: {
        signupRequestId: requestId,
        action,
        role: result.data?.user?.role ?? role ?? null,
        companyName: result.data?.user?.companyName ?? companyName ?? null,
        department: result.data?.user?.department ?? department ?? null,
      },
    });
    return res.json(result.data);
  } catch (err: any) {
    logError("reviewSignupRequest", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ message: "이미 같은 이메일 계정이 존재하여 승인할 수 없습니다." });
    }
    return res.status(500).json({ message: "가입요청 처리 중 오류가 발생했습니다." });
  }
}

// POST /auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    const result = await processLogin(email, password);
    if (!result.ok) {
      logAudit("login_failure", { email: email ?? "-", reason: result.message });
      const code = "code" in result ? result.code : undefined;
      return res.status(result.status).json({
        message: result.message,
        ...(code ? { code } : {}),
      });
    }
    logAudit("login_success", { userId: result.data.user.id, email: email ?? "-" });
    setRefreshCookie(res, result.data.refreshToken);
    return res.json({ token: result.data.token, user: result.data.user });
  } catch (err) {
    logError("login", err);
    return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
  }
}

// POST /auth/refresh
export async function refreshToken(req: Request, res: Response) {
  try {
    const rawRefreshToken = (req as any).cookies?.refreshToken as string | undefined;
    const result = await processRefreshToken(rawRefreshToken);
    if (!result.ok) {
      clearRefreshCookie(res);
      const code = "code" in result ? result.code : undefined;
      return res.status(result.status).json({
        message: result.message,
        ...(code ? { code } : {}),
      });
    }
    setRefreshCookie(res, result.data.refreshToken);
    return res.json({ token: result.data.token, user: result.data.user });
  } catch (err) {
    logError("refreshToken", err);
    return res.status(500).json({ message: "토큰 갱신 중 오류가 발생했습니다." });
  }
}

// POST /auth/logout
export async function logout(req: Request, res: Response) {
  try {
    const rawRefreshToken = (req as any).cookies?.refreshToken as string | undefined;
    await processLogout(rawRefreshToken);
    clearRefreshCookie(res);
    return res.json({ message: "로그아웃 처리되었습니다." });
  } catch (err) {
    logError("logout", err);
    return res.status(500).json({ message: "로그아웃 처리 중 오류가 발생했습니다." });
  }
}

// POST /auth/password-reset/request
export async function requestPasswordReset(req: Request, res: Response) {
  try {
    const { email } = req.body as { email?: string };
    const result = await processPasswordResetRequest(email);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json({ message: result.message });
  } catch (err) {
    logError("requestPasswordReset", err);
    return res.status(500).json({ message: "비밀번호 재설정 요청 처리 중 오류가 발생했습니다." });
  }
}

// POST /auth/password-reset/confirm
export async function confirmPasswordReset(req: Request, res: Response) {
  try {
    const { token, newPassword } = req.body as { token?: string; newPassword?: string };
    const result = await processPasswordResetConfirm(token, newPassword);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json({ message: result.message });
  } catch (err) {
    logError("confirmPasswordReset", err);
    return res.status(500).json({ message: "비밀번호 재설정 중 오류가 발생했습니다." });
  }
}

// POST /auth/change-password
export async function changePassword(req: Request, res: Response) {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword?: string; newPassword?: string;
    };
    const authUser = (req as any).user as { userId: number };
    const result = await processChangePassword(authUser.userId, currentPassword, newPassword);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    logAudit("change_password", { userId: authUser.userId });
    return res.json({ message: result.message });
  } catch (err) {
    logError("changePassword", err);
    return res.status(500).json({ message: "비밀번호 변경 중 오류가 발생했습니다." });
  }
}

// PATCH /auth/profile
export async function updateProfile(req: AuthRequest, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ message: "인증 정보가 없습니다." });
    const { name } = req.body as { name?: string };
    const result = await processUpdateProfile(userId, name);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    logError("updateProfile", err);
    return res.status(500).json({ message: "프로필 수정 중 오류가 발생했습니다." });
  }
}

// PATCH /auth/users/:id/role
export async function changeUserRole(req: Request, res: Response) {
  try {
    const targetId = Number(req.params.id);
    const { role } = req.body as { role?: any };
    const adminUser = (req as any).user as { userId?: number } | undefined;
    const result = await processChangeUserRole(targetId, role);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    logAudit("change_user_role", { adminId: adminUser?.userId ?? "-", targetId, newRole: role });
    void writeAuditLog({
      req: req as AuthRequest,
      userId: adminUser?.userId ?? null,
      action: "UPDATE",
      resource: "USER",
      resourceId: targetId,
      target: "user_role",
      detail: {
        role,
        changes: [`권한: ${role ?? "-"}`],
      },
    });
    return res.json(result.data);
  } catch (err: any) {
    logError("changeUserRole", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return res.status(404).json({ message: "해당 사용자를 찾을 수 없습니다." });
    }
    return res.status(500).json({ message: "권한 변경 중 오류가 발생했습니다." });
  }
}

// GET /auth/users
export async function listUsers(req: Request, res: Response) {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const companyName =
      typeof req.query.companyName === "string" ? req.query.companyName : undefined;
    const page = typeof req.query.page === "string" ? Number(req.query.page) : undefined;
    const size = typeof req.query.size === "string" ? Number(req.query.size) : undefined;
    const users = await fetchUsersList({ q, companyName, page, size });
    return res.json(users);
  } catch (err) {
    logError("listUsers", err);
    return res.status(500).json({ message: "사용자 목록 조회 중 오류가 발생했습니다." });
  }
}

// PATCH /auth/users/:id/company
export async function changeUserCompany(req: Request, res: Response) {
  try {
    const userId = Number(req.params.id);
    if (Number.isNaN(userId)) {
      return res.status(400).json({ message: "유효하지 않은 사용자 ID입니다." });
    }
    const { companyName } = req.body as { companyName?: string | null };
    const result = await processChangeUserCompany(userId, companyName);
    void writeAuditLog({
      req: req as AuthRequest,
      userId: (req as any as AuthRequest).user?.userId ?? null,
      action: result.audit?.action ?? "UPDATE",
      resource: "USER",
      resourceId: userId,
      target: result.audit?.target ?? "user_company",
      detail: result.audit?.detail ?? null,
    });
    return res.json(result.data);
  } catch (err: any) {
    logError("changeUserCompany", err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 사용자를 찾을 수 없습니다." });
    }
    return res.status(500).json({ message: "회사 정보 변경 중 오류가 발생했습니다." });
  }
}

// GET /auth/companies  — 회사명 목록 (업체선택 드롭다운용)
export async function listCompanies(req: Request, res: Response) {
  try {
    const { prisma } = await import("../prisma/client");
    const rows = await prisma.companyName.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    return res.json(rows);
  } catch (err) {
    logError("listCompanies", err);
    return res.status(500).json({ message: "회사 목록 조회 중 오류가 발생했습니다." });
  }
}

// PATCH /auth/users/:id  (role + company + phone + department + isActive + showQuotedPrice)
export async function updateUserDetails(req: Request, res: Response) {
  try {
    const targetId = Number(req.params.id);
    if (Number.isNaN(targetId)) {
      return res.status(400).json({ message: "유효하지 않은 사용자 ID입니다." });
    }
    const adminUser = (req as any as AuthRequest).user;
    if (adminUser && adminUser.userId === targetId && req.body.role && req.body.role !== "ADMIN") {
      return res.status(403).json({ message: "본인의 ADMIN 권한은 변경할 수 없습니다." });
    }
    const { role, companyName, phone, department, isActive, showQuotedPrice } = req.body as {
      role?: string;
      companyName?: string | null;
      phone?: string | null;
      department?: string | null;
      isActive?: boolean;
      showQuotedPrice?: boolean;
    };
    const result = await processUpdateUserDetails(targetId, {
      role: role as any,
      companyName,
      phone,
      department,
      isActive,
      showQuotedPrice,
    });
    const isOnlyQuotedPriceToggle =
      showQuotedPrice !== undefined &&
      role === undefined &&
      companyName === undefined &&
      phone === undefined &&
      department === undefined &&
      isActive === undefined;
    if (!isOnlyQuotedPriceToggle) {
      void writeAuditLog({
        req: req as AuthRequest,
        userId: adminUser?.userId,
        userRole: adminUser?.role,
        action: result.audit?.action ?? "UPDATE",
        resource: "USER",
        resourceId: targetId,
        target: result.audit?.target ?? "user_profile",
        detail: result.audit?.detail ?? null,
      });
    }
    return res.json(result.data);
  } catch (err: any) {
    logError("updateUserDetails", err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 사용자를 찾을 수 없습니다." });
    }
    return res.status(500).json({ message: "사용자 정보 변경 중 오류가 발생했습니다." });
  }
}
