// src/services/insungIntegrationService.ts
//
// 인성 외부 배차 연동 서비스
//
// 흐름:
//   1. getToken()  — m_code + cc_code + ukey + akey(MD5) → token 발급
//   2. registerOrder(token, requestData) — 오더 등록 → serial_number 반환
//   3. getOrderDetail(token, serial) — 오더 상세 조회 → 기사 위치 포함
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
  constructor(platform: string) {
    super(`${platform} 연동 설정이 없습니다. 환경변수를 확인하세요.`);
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
function getInsungConfig() {
  const { INSUNG_BASE_URL, INSUNG_M_CODE, INSUNG_CC_CODE, INSUNG_USER_ID, INSUNG_UKEY } = env;
  if (!INSUNG_BASE_URL || !INSUNG_M_CODE || !INSUNG_CC_CODE || !INSUNG_USER_ID || !INSUNG_UKEY) {
    throw new IntegrationNotConfiguredError("인성");
  }
  return {
    baseUrl: INSUNG_BASE_URL,
    mCode: INSUNG_M_CODE,
    ccCode: INSUNG_CC_CODE,
    userId: INSUNG_USER_ID,
    ukey: INSUNG_UKEY,
  };
}

// ── MD5 akey 생성 ─────────────────────────────────────────
// akey = MD5(ukey + userId)
function buildAkey(ukey: string, userId: string): string {
  return createHash("md5").update(ukey + userId).digest("hex");
}

// ── 토큰 발급 ─────────────────────────────────────────────
// POST /api/oauth/
// params: m_code, cc_code, ukey, akey, type=json
export async function getInsungToken(): Promise<string> {
  const cfg = getInsungConfig();
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
  // 인성 응답 예: { "result": "1", "token": "xxxx" }
  // result가 "1"이 아니면 실패
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
  return token;
}

// ── 오더 등록 요청 매핑 타입 ───────────────────────────────
// 우리 Request → 인성 오더 등록 필드 매핑
// 확정 매핑 / TODO 매핑 구분은 매핑 함수 내 주석 참조

export type InsungOrderPayload = {
  // 접수자/회사/부서 계열
  c_name: string;           // 접수자명 (창출사 이름)
  c_mobile: string;         // 접수자 연락처
  c_dept_name: string;      // 접수부서명
  c_charge_name: string;    // 담당자명
  reason_desc: string;      // 화물설명/요청사항

  // 출발지(상차지)
  s_start: string;          // 출발지명
  start_telno: string;      // 출발지 연락처
  dept_name: string;        // 출발지 부서명
  charge_name: string;      // 출발지 담당자명
  start_sido: string;       // 출발지 시도 (TODO: 주소 파싱 필요)
  start_gugun: string;      // 출발지 구군 (TODO: 주소 파싱 필요)
  start_dong: string;       // 출발지 동 (TODO: 주소 파싱 필요)
  start_ri: string;         // 출발지 리 (TODO: 주소 파싱 필요)
  start_location: string;   // 출발지 상세주소 (전체 주소 사용)
  start_lon: string;        // 출발지 경도 (TODO: 좌표 변환 필요)
  start_lat: string;        // 출발지 위도 (TODO: 좌표 변환 필요)

  // 도착지(하차지)
  s_dest: string;           // 도착지명
  dest_telno: string;       // 도착지 연락처
  dest_dept: string;        // 도착지 부서명
  dest_charge: string;      // 도착지 담당자명
  dest_sido: string;        // 도착지 시도 (TODO: 주소 파싱 필요)
  dest_gugun: string;       // 도착지 구군 (TODO: 주소 파싱 필요)
  dest_dong: string;        // 도착지 동 (TODO: 주소 파싱 필요)
  dest_ri: string;          // 도착지 리 (TODO: 주소 파싱 필요)
  dest_location: string;    // 도착지 상세주소
  dest_lon: string;         // 도착지 경도 (TODO: 좌표 변환 필요)
  dest_lat: string;         // 도착지 위도 (TODO: 좌표 변환 필요)

  // 배송 관련
  kind: string;             // 배송수단 (TODO: 코드값 확인 필요)
  pay_gbn: string;          // 지급방식 (TODO: 코드값 확인 필요)
  doc: string;              // 배송방법 (TODO: 코드값 확인 필요)
  sfast: string;            // 배송선택 — URGENT 시 긴급 코드 (TODO: 코드값 확인 필요)
  item_type: string;        // 물품종류 (TODO: 코드값 확인 필요)
  memo: string;             // 메모
  sms_telno: string;        // SMS 알림 연락처
  use_check: string;        // 체크 여부 (TODO: 코드값 확인 필요)
  pickup_date: string;      // 픽업일 (YYYYMMDD)
  pick_hour: string;        // 픽업시 (HH)
  pick_min: string;         // 픽업분 (MM)
  pick_sec: string;         // 픽업초 (SS) — "00"
  price: string;            // 요금
  add_cost: string;         // 추가요금
  discount_cost: string;    // 할인금액
  delivery_cost: string;    // 배송비
  car_kind: string;         // 차량구분 (vehicleBodyType)
  state: string;            // 상태 (TODO: 코드값 확인 필요)
  distince: string;         // 거리 (km)
  cash_surtax_gbn: string;  // 현금 부가세 구분 (TODO)
  order_memo: string;       // 오더메모
  type: string;             // 응답 타입 = "json"

  // 인증 파라미터
  m_code: string;
  cc_code: string;
  token: string;
  user_id: string;
};

// ── 우리 Request → 인성 payload 매핑 ──────────────────────
//
// 필드 매핑표:
// ────────────────────────────────────────────────────────
// 우리 필드                   | 인성 필드         | 상태
// ────────────────────────────────────────────────────────
// pickupPlaceName             | s_start           | ✅ 확정
// pickupContactPhone          | start_telno       | ✅ 확정
// pickupContactName           | charge_name       | ✅ 확정
// pickupAddress+Detail        | start_location    | ✅ 확정 (전체주소)
// pickupAddress               | start_sido/gugun  | ⚠️ TODO: 주소 파싱 필요
// dropoffPlaceName            | s_dest            | ✅ 확정
// dropoffContactPhone         | dest_telno        | ✅ 확정
// dropoffContactName          | dest_charge       | ✅ 확정
// dropoffAddress+Detail       | dest_location     | ✅ 확정
// pickupDatetime              | pickup_date/hour  | ✅ 확정
// quotedPrice / actualFare    | price             | ✅ 확정 (quotedPrice 우선)
// distanceKm                  | distince          | ✅ 확정
// cargoDescription            | reason_desc       | ✅ 확정
// driverNote                  | memo / order_memo | ✅ 확정
// requestType=URGENT          | sfast             | ⚠️ TODO: 코드값 확인
// paymentMethod               | pay_gbn           | ⚠️ TODO: 코드값 확인
// vehicleBodyType             | car_kind          | ✅ 확정 (문자열 그대로)
// targetCompanyName           | c_name            | ✅ 확정
// targetCompanyContactName    | c_charge_name     | ✅ 확정
// targetCompanyContactPhone   | c_mobile          | ✅ 확정
// ────────────────────────────────────────────────────────

export function mapRequestToInsungPayload(
  request: PrismaRequest,
  token: string,
  cfg: ReturnType<typeof getInsungConfig>
): InsungOrderPayload {
  // 픽업 일시 파싱
  let pickup_date = "";
  let pick_hour = "00";
  let pick_min = "00";
  if (request.pickupIsImmediate) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    pickup_date = `${y}${m}${d}`;
    pick_hour = String(now.getHours()).padStart(2, "0");
    pick_min = String(now.getMinutes()).padStart(2, "0");
  } else if (request.pickupDatetime) {
    const dt = new Date(request.pickupDatetime);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const d = String(dt.getDate()).padStart(2, "0");
    pickup_date = `${y}${m}${d}`;
    pick_hour = String(dt.getHours()).padStart(2, "0");
    pick_min = String(dt.getMinutes()).padStart(2, "0");
  }

  // 결제방식 → pay_gbn 매핑
  // TODO: 인성 실제 코드값 확인 후 교체
  const payGbnMap: Record<string, string> = {
    CREDIT: "1",       // 신용(월마감) → TODO: 코드값 확인
    CARD: "2",         // 카드 → TODO: 코드값 확인
    CASH_PREPAID: "3", // 현금선불 → TODO: 코드값 확인
    CASH_COLLECT: "4", // 현금착불 → TODO: 코드값 확인
  };
  const pay_gbn = request.paymentMethod ? (payGbnMap[request.paymentMethod] ?? "1") : "1";

  // 배송선택(sfast) — URGENT 시 긴급, 나머지 기본
  // TODO: 인성 실제 코드값 확인 후 교체
  const sfastMap: Record<string, string> = {
    URGENT: "2",     // 긴급 → TODO: 코드값 확인
    DIRECT: "3",     // 혼적 → TODO: 코드값 확인
    ROUND_TRIP: "4", // 왕복 → TODO: 코드값 확인
    NORMAL: "1",     // 기본 → TODO: 코드값 확인
  };
  const sfast = request.requestType ? (sfastMap[request.requestType] ?? "1") : "1";

  const startLocation = [request.pickupAddress, request.pickupAddressDetail].filter(Boolean).join(" ");
  const destLocation = [request.dropoffAddress, request.dropoffAddressDetail].filter(Boolean).join(" ");

  return {
    // 인증
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    token,
    user_id: cfg.userId,
    type: "json",

    // 접수자/회사
    c_name: request.targetCompanyName ?? "",
    c_mobile: request.targetCompanyContactPhone ?? "",
    c_dept_name: "",                                          // TODO: 부서 정보 없음
    c_charge_name: request.targetCompanyContactName ?? "",
    reason_desc: request.cargoDescription ?? "",

    // 출발지
    s_start: request.pickupPlaceName,
    start_telno: request.pickupContactPhone ?? "",
    dept_name: "",                                            // TODO: 출발지 부서 없음
    charge_name: request.pickupContactName ?? "",
    start_sido: "",   // TODO: 주소에서 시도 파싱 필요
    start_gugun: "",  // TODO: 주소에서 구군 파싱 필요
    start_dong: "",   // TODO: 주소에서 동 파싱 필요
    start_ri: "",     // TODO: 주소에서 리 파싱 필요
    start_location: startLocation,
    start_lon: "",    // TODO: 좌표 변환(Geocoding) 필요
    start_lat: "",    // TODO: 좌표 변환(Geocoding) 필요

    // 도착지
    s_dest: request.dropoffPlaceName,
    dest_telno: request.dropoffContactPhone ?? "",
    dest_dept: "",                                            // TODO: 도착지 부서 없음
    dest_charge: request.dropoffContactName ?? "",
    dest_sido: "",    // TODO: 주소에서 시도 파싱 필요
    dest_gugun: "",   // TODO: 주소에서 구군 파싱 필요
    dest_dong: "",    // TODO: 주소에서 동 파싱 필요
    dest_ri: "",      // TODO: 주소에서 리 파싱 필요
    dest_location: destLocation,
    dest_lon: "",     // TODO: 좌표 변환(Geocoding) 필요
    dest_lat: "",     // TODO: 좌표 변환(Geocoding) 필요

    // 배송
    kind: "1",        // TODO: 배송수단 코드값 확인 필요
    pay_gbn,
    doc: "1",         // TODO: 배송방법 코드값 확인 필요
    sfast,
    item_type: "1",   // TODO: 물품종류 코드값 확인 필요
    memo: request.driverNote ?? "",
    sms_telno: request.pickupContactPhone ?? "",
    use_check: "1",   // TODO: 코드값 확인 필요
    pickup_date,
    pick_hour,
    pick_min,
    pick_sec: "00",
    price: String(request.quotedPrice ?? request.actualFare ?? 0),
    add_cost: "0",
    discount_cost: "0",
    delivery_cost: "0",
    car_kind: request.vehicleBodyType ?? "",
    state: "1",       // TODO: 상태 코드값 확인 필요
    distince: String(request.distanceKm ?? 0),
    cash_surtax_gbn: "0", // TODO: 코드값 확인 필요
    order_memo: request.driverNote ?? "",
  };
}

// ── 오더 등록 ─────────────────────────────────────────────
// POST /api/order_regist/
// 성공 시 serial_number 반환
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

  // 인성 응답 예: { "result": "1", "serial_number": "20240101-00001" }
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

// ── 오더 상세 조회 (위치 포함) ─────────────────────────────
// POST /api/order_detail/
// params: type, m_code, cc_code, token, user_id, serial
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
// controller에서 호출: request DB 행에 결과 저장까지 처리
export async function registerAndSaveInsungOrder(requestId: number): Promise<{
  serialNumber: string;
}> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");

  // 이미 등록됐으면 재등록 방지
  if (request.insungSerialNumber && request.insungSyncStatus === "SUCCESS") {
    return { serialNumber: request.insungSerialNumber };
  }

  // PENDING 상태로 먼저 저장
  await prisma.request.update({
    where: { id: requestId },
    data: { insungSyncStatus: "PENDING", insungLastError: null },
  });

  try {
    const cfg = getInsungConfig();
    const token = await getInsungToken();
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

    return { serialNumber };
  } catch (err: any) {
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

  return {
    lat,
    lon,
    updatedAt: now.toISOString(),
  };
}
