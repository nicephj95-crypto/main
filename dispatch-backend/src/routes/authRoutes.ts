// src/routes/authRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import {
  loginRateLimiter,
  passwordChangeRateLimiter,
  passwordResetRequestRateLimiter,
  passwordResetConfirmRateLimiter,
  signupRequestRateLimiter,
  refreshRateLimiter,
  logoutRateLimiter,
} from "../utils/authUtils";
import {
  signup,
  listSignupRequests,
  reviewSignupRequest,
  login,
  refreshToken,
  logout,
  requestPasswordReset,
  confirmPasswordReset,
  changePassword,
  updateProfile,
  changeUserRole,
  listUsers,
  changeUserCompany,
  updateUserDetails,
  listCompanies,
} from "../controllers/authController";

const router = Router();

router.post("/signup", signupRequestRateLimiter, signup);
// DISPATCHER/SALES: 읽기 전용 (가입승인/거절은 ADMIN만)
router.get("/signup-requests", authMiddleware, requireRole("ADMIN", "DISPATCHER", "SALES"), listSignupRequests);
router.patch("/signup-requests/:id", authMiddleware, requireRole("ADMIN"), reviewSignupRequest);
router.post("/login", loginRateLimiter, login);
router.post("/refresh", refreshRateLimiter, refreshToken);
router.post("/logout", logoutRateLimiter, logout);
router.post("/password-reset/request", passwordResetRequestRateLimiter, requestPasswordReset);
router.post("/password-reset/confirm", passwordResetConfirmRateLimiter, confirmPasswordReset);
router.post("/change-password", passwordChangeRateLimiter, authMiddleware, changePassword);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/users/:id/role", authMiddleware, requireRole("ADMIN"), changeUserRole);
// DISPATCHER/SALES: 사용자 목록 읽기 전용 허용
router.get("/users", authMiddleware, requireRole("ADMIN", "DISPATCHER", "SALES"), listUsers);
// 업체 선택 드롭다운용 (ADMIN/DISPATCHER/SALES)
router.get("/companies", authMiddleware, requireRole("ADMIN", "DISPATCHER", "SALES"), listCompanies);
router.patch("/users/:id/company", authMiddleware, requireRole("ADMIN"), changeUserCompany);
router.patch("/users/:id", authMiddleware, requireRole("ADMIN"), updateUserDetails);

export default router;
