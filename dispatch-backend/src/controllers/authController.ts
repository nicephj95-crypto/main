// src/controllers/authController.ts
import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { logError, logAudit } from "../utils/logger";
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
    const list = await listSignupRequestsData(
      typeof req.query.status === "string" ? req.query.status : undefined
    );
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

    const { action } = req.body as { action?: "APPROVE" | "REJECT" };
    if (!action || !["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "action은 APPROVE 또는 REJECT 여야 합니다." });
    }

    const adminUser = (req as any).user as { userId: number };
    const result = await processReviewSignup(requestId, action, adminUser.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    logAudit("review_signup_request", { adminId: adminUser.userId, requestId, action });
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
      return res.status(result.status).json({ message: result.message });
    }
    logAudit("login_success", { userId: (result.data as any)?.user?.id, email: email ?? "-" });
    return res.json(result.data);
  } catch (err) {
    logError("login", err);
    return res.status(500).json({ message: "로그인 중 오류가 발생했습니다." });
  }
}

// POST /auth/refresh
export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken: rawRefreshToken } = req.body as { refreshToken?: string };
    const result = await processRefreshToken(rawRefreshToken);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    return res.json(result.data);
  } catch (err) {
    logError("refreshToken", err);
    return res.status(500).json({ message: "토큰 갱신 중 오류가 발생했습니다." });
  }
}

// POST /auth/logout
export async function logout(req: Request, res: Response) {
  try {
    const { refreshToken: rawRefreshToken } = req.body as { refreshToken?: string };
    await processLogout(rawRefreshToken);
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
export async function listUsers(_req: Request, res: Response) {
  try {
    const users = await fetchUsersList();
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
    return res.json(result.data);
  } catch (err: any) {
    logError("changeUserCompany", err);
    if (err.code === "P2025") {
      return res.status(404).json({ message: "해당 사용자를 찾을 수 없습니다." });
    }
    return res.status(500).json({ message: "회사 정보 변경 중 오류가 발생했습니다." });
  }
}
