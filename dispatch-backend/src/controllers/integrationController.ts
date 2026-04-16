// src/controllers/integrationController.ts
//
// POST /requests/:id/integrations/insung/register  — 인성 오더 등록
// GET  /requests/:id/integrations/insung/location  — 인성 기사 위치 조회
// POST /requests/:id/integrations/call24/register  — 화물24 오더 등록
// GET  /requests/:id/integrations/call24/location  — 화물24 차주 위치 조회
//
// 권한: STAFF(ADMIN/DISPATCHER/SALES)만 호출 가능 — roleMiddleware에서 강제

import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import {
  registerAndSaveInsungOrder,
  fetchAndSaveInsungLocation,
  IntegrationNotConfiguredError,
} from "../services/insungIntegrationService";
import {
  registerAndSaveCall24Order,
  fetchAndSaveCall24Location,
  Call24ApiError,
} from "../services/call24IntegrationService";
import { prisma } from "../prisma/client";

function parseRequestId(req: AuthRequest): number | null {
  const id = parseInt(req.params.id ?? "", 10);
  return isNaN(id) ? null : id;
}

function isNotConfigured(err: unknown): boolean {
  return err instanceof IntegrationNotConfiguredError;
}

// ── 인성 등록 ─────────────────────────────────────────────
export async function insungRegister(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "유효하지 않은 요청 ID입니다." } });
    return;
  }

  try {
    const { serialNumber } = await registerAndSaveInsungOrder(requestId);
    res.json({
      success: true,
      platform: "insung",
      serialNumber,
      message: `인성 등록 완료 (serial: ${serialNumber})`,
    });
  } catch (err: any) {
    if (isNotConfigured(err)) {
      res.status(422).json({
        error: { code: "INTEGRATION_NOT_CONFIGURED", message: err.message },
      });
      return;
    }
    res.status(502).json({
      error: { code: "INSUNG_API_ERROR", message: err?.message ?? "인성 API 오류" },
    });
  }
}

// ── 인성 위치 조회 ─────────────────────────────────────────
export async function insungLocation(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "유효하지 않은 요청 ID입니다." } });
    return;
  }

  try {
    const location = await fetchAndSaveInsungLocation(requestId);
    res.json({
      platform: "insung",
      ...location,
    });
  } catch (err: any) {
    if (isNotConfigured(err)) {
      res.status(422).json({
        error: { code: "INTEGRATION_NOT_CONFIGURED", message: err.message },
      });
      return;
    }
    res.status(502).json({
      error: { code: "INSUNG_API_ERROR", message: err?.message ?? "인성 위치 조회 오류" },
    });
  }
}

// ── 화물24 등록 ───────────────────────────────────────────
export async function call24Register(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "유효하지 않은 요청 ID입니다." } });
    return;
  }

  try {
    const { ordNo } = await registerAndSaveCall24Order(requestId);
    res.json({
      success: true,
      platform: "call24",
      ordNo,
      message: `화물24 등록 완료 (ordNo: ${ordNo})`,
    });
  } catch (err: any) {
    if (isNotConfigured(err)) {
      res.status(422).json({
        error: { code: "INTEGRATION_NOT_CONFIGURED", message: err.message },
      });
      return;
    }
    res.status(502).json({
      error: { code: "CALL24_API_ERROR", message: err?.message ?? "화물24 API 오류" },
    });
  }
}

// ── 화물24 위치 조회 ──────────────────────────────────────
export async function call24Location(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "유효하지 않은 요청 ID입니다." } });
    return;
  }

  try {
    const location = await fetchAndSaveCall24Location(requestId);
    res.json({
      platform: "call24",
      ...location,
    });
  } catch (err: any) {
    if (isNotConfigured(err)) {
      res.status(422).json({
        error: { code: "INTEGRATION_NOT_CONFIGURED", message: err.message },
      });
      return;
    }
    res.status(502).json({
      error: { code: "CALL24_API_ERROR", message: err?.message ?? "화물24 위치 조회 오류" },
    });
  }
}

// ── 현재 연동 상태 조회 (배차상세 페이지 마운트 시 사용) ─────
export async function getIntegrationStatus(req: AuthRequest, res: Response): Promise<void> {
  const requestId = parseRequestId(req);
  if (!requestId) {
    res.status(400).json({ error: { code: "INVALID_ID", message: "유효하지 않은 요청 ID입니다." } });
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
    },
  });

  if (!request) {
    res.status(404).json({ error: { code: "NOT_FOUND", message: "배차 요청을 찾을 수 없습니다." } });
    return;
  }

  res.json(request);
}
