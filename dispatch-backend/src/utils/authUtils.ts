// src/utils/authUtils.ts
import { createHash } from "crypto";
import { createRateLimiter } from "../middleware/rateLimit";

export const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const loginRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 50,
  message: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
export const passwordChangeRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 5,
  message: "비밀번호 변경 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
export const passwordResetRequestRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 5,
  message: "비밀번호 재설정 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
export const passwordResetConfirmRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5,
  message: "비밀번호 재설정 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
export const signupRequestRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 5,
  message: "회원가입 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
export const refreshRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 20,
  message: "토큰 갱신 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});
export const logoutRateLimiter = createRateLimiter({
  windowMs: 10 * 60 * 1000, // 10분
  max: 20,
  message: "로그아웃 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
export const ACCESS_TOKEN_EXPIRES_IN = "8h";

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
