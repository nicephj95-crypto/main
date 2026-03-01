// src/utils/logger.ts
import { env } from "../config/env";

function maskSensitive(input: string): string {
  return input
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[masked-email]")
    .replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer [masked-token]")
    .replace(/\b\d{3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "[masked-phone]")
    .replace(/\b[a-f0-9]{32,}\b/gi, "[masked-secret]");
}

function stringifyMasked(value: unknown): string {
  const text = value instanceof Error
    ? value.message
    : typeof value === "string"
    ? value
    : JSON.stringify(value);
  return maskSensitive(text ?? "-");
}

/** 에러 객체를 클라이언트에 노출 없이 서버 로그에만 기록 */
export function logError(context: string, err: unknown): void {
  const message = stringifyMasked(err);
  const stack =
    env.NODE_ENV !== "production" && err instanceof Error && err.stack
      ? `\n${maskSensitive(err.stack)}`
      : "";
  console.error(`[ERROR] ${context}: ${message}${stack}`);
}

/** 민감 작업 감사 로그 (로그인, 비밀번호 변경, 권한 변경 등) */
export function logAudit(action: string, details: Record<string, unknown>): void {
  const parts = Object.entries(details)
    .map(([k, v]) => `${k}=${stringifyMasked(v ?? "-")}`)
    .join(" ");
  console.log(`[audit] action=${action} ${parts} ts=${new Date().toISOString()}`);
}
