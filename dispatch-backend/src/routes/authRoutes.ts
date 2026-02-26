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
} from "../controllers/authController";

const router = Router();

router.post("/signup", signupRequestRateLimiter, signup);
router.get("/signup-requests", authMiddleware, requireRole("ADMIN"), listSignupRequests);
router.patch("/signup-requests/:id", authMiddleware, requireRole("ADMIN"), reviewSignupRequest);
router.post("/login", loginRateLimiter, login);
router.post("/refresh", refreshRateLimiter, refreshToken);
router.post("/logout", logoutRateLimiter, logout);
router.post("/password-reset/request", passwordResetRequestRateLimiter, requestPasswordReset);
router.post("/password-reset/confirm", passwordResetConfirmRateLimiter, confirmPasswordReset);
router.post("/change-password", passwordChangeRateLimiter, authMiddleware, changePassword);
router.patch("/profile", authMiddleware, updateProfile);
router.patch("/users/:id/role", authMiddleware, requireRole("ADMIN"), changeUserRole);
router.get("/users", authMiddleware, requireRole("ADMIN"), listUsers);
router.patch("/users/:id/company", authMiddleware, requireRole("ADMIN"), changeUserCompany);

export default router;
