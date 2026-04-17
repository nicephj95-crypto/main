// src/services/insungIntegrationService.ts
//
// 인성 외부 배차 연동 서비스
//
// 토큰 우선순위:
//   1) INSUNG_TOKEN 환경변수가 있으면 → oauth 호출 없이 그대로 사용
//   2) INSUNG_TOKEN 없고 INSUNG_UKEY 있으면 → oauth 발급 시도
//   3) 둘 다 없으면 → IntegrationNotConfiguredError
//
// credentials(env)가 없으면 IntegrationNotConfiguredError를 throw.
// caller(controller)가 이 에러를 잡아 403/422 응답을 보낸다.

import { createHash } from "crypto";
import axios from "axios";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import type { Request as PrismaRequest } from "@prisma/client";

// ── 에러 타입 ──────────────────────────────────────────────
export class IntegrationNotConfiguredError extends Error {
  constructor(platform: string, missingVars?: string[]) {
    const detail = missingVars?.length
      ? ` (누락된 환경변수: ${missingVars.join(", ")})`
      : "";
    super(`${platform} 연동 설정이 없습니다. 환경변수를 확인하세요.${detail}`);
    this.name = "IntegrationNotConfiguredError";
  }
}

export class InsungApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "InsungApiError";
  }
}

// ── credentials 검증 ───────────────────────────────────────
// INSUNG_TOKEN 직접 사용 모드: BASE_URL + M_CODE + CC_CODE + USER_ID + TOKEN 필요
// oauth 발급 모드: 위 + UKEY 추가 필요
function getInsungConfig() {
  const {
    INSUNG_BASE_URL,
    INSUNG_M_CODE,
    INSUNG_CC_CODE,
    INSUNG_USER_ID,
    INSUNG_UKEY,
    INSUNG_TOKEN,
  } = env;

  const missing: string[] = [];
  if (!INSUNG_BASE_URL) missing.push("INSUNG_BASE_URL");
  if (!INSUNG_M_CODE) missing.push("INSUNG_M_CODE");
  if (!INSUNG_CC_CODE) missing.push("INSUNG_CC_CODE");
  if (!INSUNG_USER_ID) missing.push("INSUNG_USER_ID");

  // direct token 모드도, oauth 모드도 불가능한 경우
  if (missing.length > 0) {
    throw new IntegrationNotConfiguredError("인성", missing);
  }

  // token도 없고 ukey도 없으면 토큰 취득 불가
  if (!INSUNG_TOKEN && !INSUNG_UKEY) {
    throw new IntegrationNotConfiguredError("인성", ["INSUNG_TOKEN 또는 INSUNG_UKEY"]);
  }

  return {
    baseUrl: INSUNG_BASE_URL!,
    mCode: INSUNG_M_CODE!,
    ccCode: INSUNG_CC_CODE!,
    userId: INSUNG_USER_ID!,
    ukey: INSUNG_UKEY,
    directToken: INSUNG_TOKEN,
  };
}

// ── MD5 akey 생성 ─────────────────────────────────────────
// akey = MD5(ukey + userId)
function buildAkey(ukey: string, userId: string): string {
  return createHash("md5").update(ukey + userId).digest("hex");
}

// ── 토큰 취득 (token-first) ────────────────────────────────
// 1) INSUNG_TOKEN 있으면 그 값 반환 (oauth 호출 없음)
// 2) 없으면 oauth 발급 시도
export async function getInsungToken(): Promise<string> {
  const cfg = getInsungConfig();

  if (cfg.directToken) {
    console.log("[인성] direct token 사용 (INSUNG_TOKEN 환경변수)");
    return cfg.directToken;
  }

  // oauth 발급 경로 — UKEY 필수
  if (!cfg.ukey) {
    throw new IntegrationNotConfiguredError("인성", ["INSUNG_TOKEN 또는 INSUNG_UKEY"]);
  }

  console.log("[인성] oauth 토큰 발급 시도 (INSUNG_UKEY 사용)");
  const akey = buildAkey(cfg.ukey, cfg.userId);

  const params = new URLSearchParams({
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    ukey: cfg.ukey,
    akey,
    user_id: cfg.userId,
    type: "json",
  });

  const res = await axios.post(`${cfg.baseUrl}/api/oauth/`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10_000,
  });

  const data = res.data as Record<string, unknown>;
  if (!data || data["result"] !== "1") {
    throw new InsungApiError(
      `인성 토큰 발급 실패: ${JSON.stringify(data)}`,
      undefined,
      data
    );
  }

  const token = data["token"];
  if (typeof token !== "string" || !token) {
    throw new InsungApiError("인성 토큰 응답에 token 필드가 없습니다.", undefined, data);
  }

  console.log("[인성] oauth 토큰 발급 성공");
  return token;
}

// ── 오더 등록 요청 매핑 타입 ───────────────────────────────
export type InsungOrderPayload = {
  c_name: string;
  c_mobile: string;
  c_dept_name: string;
  c_charge_name: string;
  reason_desc: string;
  s_start: string;
  start_telno: string;
  dept_name: string;
  charge_name: string;
  start_sido: string;
  start_gugun: string;
  start_dong: string;
  start_ri: string;
  start_location: string;
  start_lon: string;
  start_lat: string;
  s_dest: string;
  dest_telno: string;
  dest_dept: string;
  dest_charge: string;
  dest_sido: string;
  dest_gugun: string;
  dest_dong: string;
  dest_ri: string;
  dest_location: string;
  dest_lon: string;
  dest_lat: string;
  kind: string;
  pay_gbn: string;
  doc: string;
  sfast: string;
  item_type: string;
  memo: string;
  sms_telno: string;
  use_check: string;
  pickup_date: string;
  pick_hour: string;
  pick_min: string;
  pick_sec: string;
  price: string;
  add_cost: string;
  discount_cost: string;
  delivery_cost: string;
  car_kind: string;
  state: string;
  distince: string;
  cash_surtax_gbn: string;
  order_memo: string;
  type: string;
  m_code: string;
  cc_code: string;
  token: string;
  user_id: string;
};

// ── 우리 Request → 인성 payload 매핑 ──────────────────────
export function mapRequestToInsungPayload(
  request: PrismaRequest,
  token: string,
  cfg: ReturnType<typeof getInsungConfig>
): InsungOrderPayload {
  let pickup_date = "";
  let pick_hour = "00";
  let pick_min = "00";
  if (request.pickupIsImmediate) {
    const now = new Date();
    pickup_date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    pick_hour = String(now.getHours()).padStart(2, "0");
    pick_min = String(now.getMinutes()).padStart(2, "0");
  } else if (request.pickupDatetime) {
    const dt = new Date(request.pickupDatetime);
    pickup_date = `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, "0")}${String(dt.getDate()).padStart(2, "0")}`;
    pick_hour = String(dt.getHours()).padStart(2, "0");
    pick_min = String(dt.getMinutes()).padStart(2, "0");
  }

  const payGbnMap: Record<string, string> = {
    CREDIT: "1",
    CARD: "2",
    CASH_PREPAID: "3",
    CASH_COLLECT: "4",
  };
  const pay_gbn = request.paymentMethod ? (payGbnMap[request.paymentMethod] ?? "1") : "1";

  const sfastMap: Record<string, string> = {
    URGENT: "2",
    DIRECT: "3",
    ROUND_TRIP: "4",
    NORMAL: "1",
  };
  const sfast = request.requestType ? (sfastMap[request.requestType] ?? "1") : "1";

  const startLocation = [request.pickupAddress, request.pickupAddressDetail].filter(Boolean).join(" ");
  const destLocation = [request.dropoffAddress, request.dropoffAddressDetail].filter(Boolean).join(" ");

  return {
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    token,
    user_id: cfg.userId,
    type: "json",
    c_name: request.targetCompanyName ?? "",
    c_mobile: request.targetCompanyContactPhone ?? "",
    c_dept_name: "",
    c_charge_name: request.targetCompanyContactName ?? "",
    reason_desc: request.cargoDescription ?? "",
    s_start: request.pickupPlaceName,
    start_telno: request.pickupContactPhone ?? "",
    dept_name: "",
    charge_name: request.pickupContactName ?? "",
    start_sido: "",
    start_gugun: "",
    start_dong: "",
    start_ri: "",
    start_location: startLocation,
    start_lon: "",
    start_lat: "",
    s_dest: request.dropoffPlaceName,
    dest_telno: request.dropoffContactPhone ?? "",
    dest_dept: "",
    dest_charge: request.dropoffContactName ?? "",
    dest_sido: "",
    dest_gugun: "",
    dest_dong: "",
    dest_ri: "",
    dest_location: destLocation,
    dest_lon: "",
    dest_lat: "",
    kind: "1",
    pay_gbn,
    doc: "1",
    sfast,
    item_type: "1",
    memo: request.driverNote ?? "",
    sms_telno: request.pickupContactPhone ?? "",
    use_check: "1",
    pickup_date,
    pick_hour,
    pick_min,
    pick_sec: "00",
    price: String(request.quotedPrice ?? request.actualFare ?? 0),
    add_cost: "0",
    discount_cost: "0",
    delivery_cost: "0",
    car_kind: request.vehicleBodyType ?? "",
    state: "1",
    distince: String(request.distanceKm ?? 0),
    cash_surtax_gbn: "0",
    order_memo: request.driverNote ?? "",
  };
}

// ── 오더 등록 ─────────────────────────────────────────────
export async function registerInsungOrder(
  token: string,
  payload: InsungOrderPayload,
  cfg: ReturnType<typeof getInsungConfig>
): Promise<string> {
  const params = new URLSearchParams(payload as unknown as Record<string, string>);

  const res = await axios.post(`${cfg.baseUrl}/api/order_regist/`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15_000,
  });

  const data = res.data as Record<string, unknown>;

  if (!data || data["result"] !== "1") {
    throw new InsungApiError(
      `인성 오더 등록 실패: ${JSON.stringify(data)}`,
      undefined,
      data
    );
  }

  const serial = data["serial_number"];
  if (typeof serial !== "string" || !serial) {
    throw new InsungApiError("인성 오더 등록 응답에 serial_number가 없습니다.", undefined, data);
  }
  return serial;
}

// ── 오더 상세 조회 ─────────────────────────────────────────
export interface InsungOrderDetail {
  serial_number: string;
  state: string;
  save_state: string;
  rider_name?: string;
  rider_tel_number?: string;
  rider_lon?: string;
  rider_lat?: string;
  allocation_time?: string;
  pickup_time?: string;
  complete_time?: string;
  start_lon?: string;
  start_lat?: string;
  dest_lon?: string;
  dest_lat?: string;
}

export async function getInsungOrderDetail(serial: string): Promise<InsungOrderDetail> {
  const cfg = getInsungConfig();
  // token-first: direct token 있으면 oauth 호출 없음
  const token = await getInsungToken();

  const params = new URLSearchParams({
    type: "json",
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    token,
    user_id: cfg.userId,
    serial,
  });

  const res = await axios.post(`${cfg.baseUrl}/api/order_detail/`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10_000,
  });

  const data = res.data as Record<string, unknown>;

  if (!data || data["result"] !== "1") {
    throw new InsungApiError(
      `인성 오더 조회 실패: ${JSON.stringify(data)}`,
      undefined,
      data
    );
  }

  return data as unknown as InsungOrderDetail;
}

// ── DB 저장 포함 통합 등록 함수 ────────────────────────────
export async function registerAndSaveInsungOrder(requestId: number): Promise<{
  serialNumber: string;
}> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");

  if (request.insungSerialNumber && request.insungSyncStatus === "SUCCESS") {
    return { serialNumber: request.insungSerialNumber };
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { insungSyncStatus: "PENDING", insungLastError: null },
  });

  try {
    const cfg = getInsungConfig();
    // token-first: INSUNG_TOKEN 있으면 oauth 생략
    const token = await getInsungToken();
    console.log(`[인성] 오더 등록 시작 requestId=${requestId}`);
    const payload = mapRequestToInsungPayload(request, token, cfg);
    const serialNumber = await registerInsungOrder(token, payload, cfg);

    await prisma.request.update({
      where: { id: requestId },
      data: {
        insungSerialNumber: serialNumber,
        insungSyncStatus: "SUCCESS",
        insungSyncedAt: new Date(),
        insungLastError: null,
      },
    });

    console.log(`[인성] 오더 등록 성공 serialNumber=${serialNumber}`);
    return { serialNumber };
  } catch (err: any) {
    console.error(`[인성] 오더 등록 실패 requestId=${requestId}:`, err?.message);
    await prisma.request.update({
      where: { id: requestId },
      data: {
        insungSyncStatus: "FAILED",
        insungLastError: err?.message ?? "알 수 없는 오류",
      },
    });
    throw err;
  }
}

// ── 위치 조회 및 DB 저장 ────────────────────────────────────
export async function fetchAndSaveInsungLocation(requestId: number): Promise<{
  lat: number | null;
  lon: number | null;
  updatedAt: string | null;
}> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");
  if (!request.insungSerialNumber) {
    throw new Error("인성 주문번호가 없습니다. 먼저 인성 등록을 진행하세요.");
  }

  const detail = await getInsungOrderDetail(request.insungSerialNumber);

  const lat = detail.rider_lat ? parseFloat(detail.rider_lat) : null;
  const lon = detail.rider_lon ? parseFloat(detail.rider_lon) : null;
  const now = new Date();

  if (lat !== null && lon !== null) {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        insungLastLocationLat: lat,
        insungLastLocationLon: lon,
        insungLastLocationAt: now,
      },
    });
  }

  return { lat, lon, updatedAt: now.toISOString() };
}
