// src/utils/logger.ts

/** 에러 객체를 클라이언트에 노출 없이 서버 로그에만 기록 */
export function logError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[ERROR] ${context}: ${message}`);
}

/** 민감 작업 감사 로그 (로그인, 비밀번호 변경, 권한 변경 등) */
export function logAudit(action: string, details: Record<string, unknown>): void {
  const parts = Object.entries(details)
    .map(([k, v]) => `${k}=${String(v ?? "-")}`)
    .join(" ");
  console.log(`[audit] action=${action} ${parts} ts=${new Date().toISOString()}`);
}
