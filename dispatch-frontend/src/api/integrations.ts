// src/api/integrations.ts
// 외부 연동 API (인성 / 화물24)

import { apiFetch, buildAuthOnlyHeaders } from "./_core";
import { getRequestTracking } from "./tracking";

export type IntegrationRegisterResult = {
  success: boolean;
  platform: "insung" | "call24";
  serialNumber?: string;   // 인성
  ordNo?: string;          // 화물24
  message: string;
};

export type IntegrationLocationResult = {
  platform: "insung" | "call24";
  lat: number | null;
  lon: number | null;
  addr?: string | null;    // 화물24 전용
  updatedAt: string | null;
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

async function getMockTrackingLocation(
  requestId: number,
  platform: IntegrationLocationResult["platform"]
): Promise<IntegrationLocationResult> {
  const tracking = await getRequestTracking(requestId, { provider: "mock" });
  return {
    platform,
    lat: tracking.currentLat,
    lon: tracking.currentLng,
    addr: tracking.currentAddress,
    updatedAt: tracking.locationUpdatedAt,
  };
}

// ── 인성 등록 ─────────────────────────────────────────────
export async function registerInsungOrder(requestId: number): Promise<IntegrationRegisterResult> {
  const res = await apiFetch(`/requests/${requestId}/integrations/insung/register`, {
    method: "POST",
    headers: buildAuthOnlyHeaders(),
  });

  if (!res.ok) {
    const data = (await res.clone().json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(data?.error?.message ?? `인성 등록 실패 (status ${res.status})`);
  }

  return res.json() as Promise<IntegrationRegisterResult>;
}

// ── 인성 위치 조회 ─────────────────────────────────────────
export async function getInsungLocation(requestId: number): Promise<IntegrationLocationResult> {
  return getMockTrackingLocation(requestId, "insung");
}

// ── 화물24 등록 ───────────────────────────────────────────
export async function registerCall24Order(requestId: number): Promise<IntegrationRegisterResult> {
  const res = await apiFetch(`/requests/${requestId}/integrations/call24/register`, {
    method: "POST",
    headers: buildAuthOnlyHeaders(),
  });

  if (!res.ok) {
    const data = (await res.clone().json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(data?.error?.message ?? `화물24 등록 실패 (status ${res.status})`);
  }

  return res.json() as Promise<IntegrationRegisterResult>;
}

// ── 화물24 위치 조회 ──────────────────────────────────────
export async function getCall24Location(requestId: number): Promise<IntegrationLocationResult> {
  return getMockTrackingLocation(requestId, "call24");
}
