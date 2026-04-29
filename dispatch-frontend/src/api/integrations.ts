// src/api/integrations.ts
// 외부 연동 API (인성 / 화물24)

import { apiFetch, buildAuthOnlyHeaders } from "./_core";

export type IntegrationErrorCode =
  | "INTEGRATION_NOT_CONFIGURED"
  | "LIVE_REGISTER_DISABLED"
  | "NOT_REGISTERED"
  | "LOCATION_UNAVAILABLE"
  | "PERMISSION_DENIED"
  | "PAYLOAD_INVALID"
  | "INSUNG_API_ERROR"
  | "CALL24_API_ERROR"
  | "INVALID_ID"
  | "NOT_FOUND"
  | "UNKNOWN";

export class IntegrationError extends Error {
  readonly code: IntegrationErrorCode;
  readonly status: number;
  readonly detail?: unknown;
  constructor(code: IntegrationErrorCode, message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "IntegrationError";
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

export type IntegrationRegisterResult = {
  success: boolean;
  platform: "insung" | "call24";
  serialNumber?: string;   // 인성
  ordNo?: string;          // 화물24
  message: string;
  estimatedPrice?: number;
  sentPrice?: number;
};

export type IntegrationLocationResult = {
  platform: "insung" | "call24";
  lat: number | null;
  lon: number | null;
  addr?: string | null;      // 화물24 전용
  updatedAt: string | null;
  // 인성 추가 필드 (선택)
  state?: string | null;
  saveState?: string | null;
  riderName?: string | null;
  riderPhone?: string | null;
  allocationTime?: string | null;
  pickupTime?: string | null;
  completeTime?: string | null;
};

export type IntegrationStatus = {
  insungSerialNumber: string | null;
  insungSyncStatus: string | null;
  insungSyncedAt: string | null;
  insungLastError: string | null;
  insungLastLocationLat: number | null;
  insungLastLocationLon: number | null;
  insungLastLocationAt: string | null;

  call24OrdNo: string | null;
  call24SyncStatus: string | null;
  call24SyncedAt: string | null;
  call24LastError: string | null;
  call24LastLocationLat: number | null;
  call24LastLocationLon: number | null;
  call24LastLocationAt: string | null;
};

async function parseIntegrationError(res: Response, fallbackMessage: string): Promise<IntegrationError> {
  const data = (await res.clone().json().catch(() => null)) as
    | { error?: { code?: string; message?: string; detail?: unknown } }
    | null;
  const rawCode = data?.error?.code ?? "UNKNOWN";
  const code = isKnownIntegrationErrorCode(rawCode) ? rawCode : "UNKNOWN";
  const message = data?.error?.message ?? `${fallbackMessage} (status ${res.status})`;
  return new IntegrationError(code, message, res.status, data?.error?.detail);
}

function isKnownIntegrationErrorCode(code: string): code is IntegrationErrorCode {
  return [
    "INTEGRATION_NOT_CONFIGURED",
    "LIVE_REGISTER_DISABLED",
    "NOT_REGISTERED",
    "LOCATION_UNAVAILABLE",
    "PERMISSION_DENIED",
    "PAYLOAD_INVALID",
    "INSUNG_API_ERROR",
    "CALL24_API_ERROR",
    "INVALID_ID",
    "NOT_FOUND",
    "UNKNOWN",
  ].includes(code);
}

// 사용자에게 표시할 한국어 메시지 (6가지 실패 모드 구분)
export function integrationErrorToUserMessage(
  platformLabel: string,
  err: IntegrationError | Error | unknown
): string {
  if (err instanceof IntegrationError) {
    switch (err.code) {
      case "INTEGRATION_NOT_CONFIGURED":
        return `${platformLabel} 연동 환경설정이 누락되어 호출할 수 없습니다. 서버 env를 확인해주세요.`;
      case "LIVE_REGISTER_DISABLED":
        return `${platformLabel} 실제 등록이 비활성화되어 있습니다. INSUNG_ENABLE_LIVE_REGISTER=true 이어야 합니다.`;
      case "NOT_REGISTERED":
        return `${platformLabel} 등록정보가 없습니다. 먼저 ${platformLabel} 등록을 진행해 주세요.`;
      case "LOCATION_UNAVAILABLE":
        return `${platformLabel} 위치정보가 아직 없습니다. 기사가 위치 송신을 시작한 이후 다시 조회해 주세요.`;
      case "PERMISSION_DENIED":
        return `${platformLabel} 접근 권한이 없거나 서버 IP가 화이트리스트에 반영되지 않았습니다. (${err.message})`;
      case "PAYLOAD_INVALID":
        return `${platformLabel} 전송 값 검증 실패: ${err.message}`;
      case "INSUNG_API_ERROR":
      case "CALL24_API_ERROR":
        return `${platformLabel} 외부 API 오류: ${err.message}`;
      default:
        return `${platformLabel} 전송 실패: ${err.message}`;
    }
  }
  const fallback = err instanceof Error ? err.message : String(err);
  return `${platformLabel} 전송 실패: ${fallback}`;
}

// ── 인성 등록 ─────────────────────────────────────────────
export async function registerInsungOrder(requestId: number, sentPrice?: number): Promise<IntegrationRegisterResult> {
  const res = await apiFetch(`/requests/${requestId}/integrations/insung/register`, {
    method: "POST",
    headers: { ...buildAuthOnlyHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ sentPrice }),
  });
  if (!res.ok) throw await parseIntegrationError(res, "인성 등록 실패");
  return res.json() as Promise<IntegrationRegisterResult>;
}

// ── 인성 위치/상태 조회 ────────────────────────────────────
export async function getInsungLocation(requestId: number): Promise<IntegrationLocationResult> {
  const res = await apiFetch(`/requests/${requestId}/integrations/insung/location`, {
    headers: buildAuthOnlyHeaders(),
  });
  if (!res.ok) throw await parseIntegrationError(res, "인성 위치 조회 실패");
  return res.json() as Promise<IntegrationLocationResult>;
}

// ── 화물24 등록 ───────────────────────────────────────────
export async function registerCall24Order(requestId: number, sentPrice?: number): Promise<IntegrationRegisterResult> {
  const res = await apiFetch(`/requests/${requestId}/integrations/call24/register`, {
    method: "POST",
    headers: { ...buildAuthOnlyHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ sentPrice }),
  });
  if (!res.ok) throw await parseIntegrationError(res, "화물24 등록 실패");
  return res.json() as Promise<IntegrationRegisterResult>;
}

// ── 화물24 위치 조회 ──────────────────────────────────────
export async function getCall24Location(requestId: number): Promise<IntegrationLocationResult> {
  const res = await apiFetch(`/requests/${requestId}/integrations/call24/location`, {
    headers: buildAuthOnlyHeaders(),
  });
  if (!res.ok) throw await parseIntegrationError(res, "화물24 위치 조회 실패");
  return res.json() as Promise<IntegrationLocationResult>;
}

// ── 연동 상태 통합 조회 ────────────────────────────────────
export async function getIntegrationStatus(requestId: number): Promise<IntegrationStatus> {
  const res = await apiFetch(`/requests/${requestId}/integrations/status`, {
    headers: buildAuthOnlyHeaders(),
  });
  if (!res.ok) throw await parseIntegrationError(res, "연동 상태 조회 실패");
  return res.json() as Promise<IntegrationStatus>;
}
