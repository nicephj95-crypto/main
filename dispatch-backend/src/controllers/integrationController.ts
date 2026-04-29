// src/controllers/integrationController.ts
//
// POST /requests/:id/integrations/insung/register  — 인성 오더 등록
// GET  /requests/:id/integrations/insung/location  — 인성 기사 위치/상태 조회
// POST /requests/:id/integrations/call24/register  — 화물24 오더 등록
// GET  /requests/:id/integrations/call24/location  — 화물24 차주 위치 조회
//
// 에러 코드 체계 (frontend가 사용자 메시지 분기에 사용):
//   INTEGRATION_NOT_CONFIGURED  → env 누락
//   LIVE_REGISTER_DISABLED      → INSUNG_ENABLE_LIVE_REGISTER=false
//   NOT_REGISTERED              → DB에 ord_no/serial 없음
//   LOCATION_UNAVAILABLE        → 등록 성공, 위치값 아직 없음
//   PERMISSION_DENIED           → 권한 또는 IP 화이트리스트 미반영
//   PAYLOAD_INVALID             → 주소/톤수/날짜 검증 실패
//   INSUNG_API_ERROR / CALL24_API_ERROR → 그 외 외부 API 실패

import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import {
  registerAndSaveInsungOrder,
  fetchAndSaveInsungLocation,
  IntegrationNotConfiguredError,
  InsungLiveRegisterDisabledError,
  InsungNotRegisteredError,
  InsungLocationUnavailableError,
  InsungPermissionError,
  InsungApiError,
  InsungPayloadValidationError,
} from "../services/insungIntegrationService";
import {
  registerAndSaveCall24Order,
  fetchAndSaveCall24Location,
  Call24ApiError,
  Call24LocationUnavailableError,
  Call24PayloadValidationError,
  Call24AddressValidationError,
} from "../services/call24IntegrationService";
import { prisma } from "../prisma/client";

function parseRequestId(req: AuthRequest): number | null {
  const id = parseInt(req.params.id ?? "", 10);
  return isNaN(id) ? null : id;
}

type ApiErrorCode =
  | "INVALID_ID"
  | "INTEGRATION_NOT_CONFIGURED"
  | "LIVE_REGISTER_DISABLED"
  | "NOT_REGISTERED"
  | "LOCATION_UNAVAILABLE"
  | "PERMISSION_DENIED"
  | "PAYLOAD_INVALID"
  | "INSUNG_API_ERROR"
  | "CALL24_API_ERROR"
  | "NOT_FOUND";

function sendError(
  res: Response,
  status: number,
  code: ApiErrorCode,
  message: string,
  detail?: unknown
): void {
  res.status(status).json({ error: { code, message, detail } });
}

// ── 인성 에러 매핑 ────────────────────────────────────────
function handleInsungError(res: Response, err: unknown): void {
  if (err instanceof IntegrationNotConfiguredError) {
    sendError(res, 422, "INTEGRATION_NOT_CONFIGURED", err.message);
    return;
  }
  if (err instanceof InsungLiveRegisterDisabledError) {
    sendError(res, 422, "LIVE_REGISTER_DISABLED", err.message);
    return;
  }
  if (err instanceof InsungNotRegisteredError) {
    sendError(res, 409, "NOT_REGISTERED", err.message);
    return;
  }
  if (err instanceof InsungLocationUnavailableError) {
    sendError(res, 404, "LOCATION_UNAVAILABLE", err.message);
    return;
  }
  if (err instanceof InsungPermissionError) {
    sendError(res, 403, "PERMISSION_DENIED", err.message, { code: err.code });
    return;
  }
  if (err instanceof InsungPayloadValidationError) {
    sendError(res, 422, "PAYLOAD_INVALID", err.message, err.detail);
    return;
  }
  if (err instanceof InsungApiError) {
    sendError(res, 502, "INSUNG_API_ERROR", err.message, { code: err.code });
    return;
  }
  const message = (err as { message?: string })?.message ?? "인성 API 오류";
  sendError(res, 502, "INSUNG_API_ERROR", message);
}

// ── 화물24 에러 매핑 ──────────────────────────────────────
function handleCall24Error(res: Response, err: unknown): void {
  if (err instanceof IntegrationNotConfiguredError) {
    sendError(res, 422, "INTEGRATION_NOT_CONFIGURED", err.message);
    return;
  }
  if (err instanceof Call24LocationUnavailableError) {
    sendError(res, 404, "LOCATION_UNAVAILABLE", err.message);
    return;
  }
  if (
    err instanceof Call24PayloadValidationError ||
    err instanceof Call24AddressValidationError
  ) {
    sendError(res, 422, "PAYLOAD_INVALID", err.message, err.detail);
    return;
  }
  if (err instanceof Call24ApiError) {
    // 화물24는 별도 권한 에러 클래스가 없으므로 메시지 휴리스틱으로 분류
    const msg = err.message ?? "";
    if (/권한|허용|IP|ip|화이트|white|forbidden/i.test(msg)) {
      sendError(res, 403, "PERMISSION_DENIED", msg, err.raw);
      return;
    }
    sendError(res, 502, "CALL24_API_ERROR", msg, err.raw);
    return;
  }
  const message = (err as { message?: string })?.message ?? "화물24 API 오류";
  sendError(res, 502, "CALL24_API_ERROR", message);
}

// ── 인성 등록 ─────────────────────────────────────────────
export async function insungRegister(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    sendError(res, 400, "INVALID_ID", "유효하지 않은 요청 ID입니다.");
    return;
  }

  const rawSentPrice = (req.body as Record<string, unknown>)?.sentPrice;
  const sentPrice = typeof rawSentPrice === "number" && rawSentPrice > 0 ? rawSentPrice : undefined;

  try {
    const { serialNumber, estimatedPrice } = await registerAndSaveInsungOrder(requestId, sentPrice);
    res.json({
      success: true,
      platform: "insung",
      serialNumber,
      estimatedPrice,
      sentPrice: sentPrice ?? estimatedPrice,
      message: `인성 등록 완료 (serial: ${serialNumber})`,
    });
  } catch (err) {
    handleInsungError(res, err);
  }
}

// ── 인성 위치/상태 조회 ────────────────────────────────────
export async function insungLocation(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    sendError(res, 400, "INVALID_ID", "유효하지 않은 요청 ID입니다.");
    return;
  }

  try {
    const location = await fetchAndSaveInsungLocation(requestId);
    res.json({
      platform: "insung",
      ...location,
    });
  } catch (err) {
    handleInsungError(res, err);
  }
}

// ── 화물24 등록 ───────────────────────────────────────────
export async function call24Register(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    sendError(res, 400, "INVALID_ID", "유효하지 않은 요청 ID입니다.");
    return;
  }

  const rawSentPrice = (req.body as Record<string, unknown>)?.sentPrice;
  const sentPrice = typeof rawSentPrice === "number" && rawSentPrice > 0 ? rawSentPrice : undefined;

  try {
    const { ordNo, estimatedPrice } = await registerAndSaveCall24Order(requestId, sentPrice);
    res.json({
      success: true,
      platform: "call24",
      ordNo,
      estimatedPrice,
      sentPrice: sentPrice ?? estimatedPrice,
      message: `화물24 등록 완료 (ordNo: ${ordNo})`,
    });
  } catch (err) {
    handleCall24Error(res, err);
  }
}

// ── 화물24 위치 조회 ──────────────────────────────────────
export async function call24Location(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    sendError(res, 400, "INVALID_ID", "유효하지 않은 요청 ID입니다.");
    return;
  }

  try {
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      select: { call24OrdNo: true },
    });
    if (!request) {
      sendError(res, 404, "NOT_FOUND", "배차 요청을 찾을 수 없습니다.");
      return;
    }
    if (!request.call24OrdNo) {
      sendError(res, 409, "NOT_REGISTERED", "화물24 등록 정보가 없습니다. 먼저 화물24 등록을 진행하세요.");
      return;
    }

    const location = await fetchAndSaveCall24Location(requestId);
    res.json({
      platform: "call24",
      ...location,
    });
  } catch (err) {
    handleCall24Error(res, err);
  }
}

// ── 현재 연동 상태 조회 (배차상세 페이지 마운트 시 사용) ─────
export async function getIntegrationStatus(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    sendError(res, 400, "INVALID_ID", "유효하지 않은 요청 ID입니다.");
    return;
  }

  const request = await prisma.request.findUnique({
    where: { id: requestId },
    select: {
      insungSerialNumber: true,
      insungSyncStatus: true,
      insungSyncedAt: true,
      insungLastError: true,
      insungLastLocationLat: true,
      insungLastLocationLon: true,
      insungLastLocationAt: true,
      call24OrdNo: true,
      call24SyncStatus: true,
      call24SyncedAt: true,
      call24LastError: true,
      call24LastLocationLat: true,
      call24LastLocationLon: true,
      call24LastLocationAt: true,
      externalEstimatedPrice: true,
      externalSentPrice: true,
      externalPlatform: true,
    },
  });

  if (!request) {
    sendError(res, 404, "NOT_FOUND", "배차 요청을 찾을 수 없습니다.");
    return;
  }

  res.json(request);
}
