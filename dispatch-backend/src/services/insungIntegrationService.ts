// src/services/insungIntegrationService.ts
//
// 인성 외부 배차 연동 서비스
//
// 인증 규칙 (통합):
//   ukey = (INSUNG_UKEY_PREFIX || random8) + INSUNG_CONSUMER_KEY
//   akey = md5(ukey)
//
// 토큰 우선순위:
//   1) INSUNG_TOKEN 환경변수가 있으면 → oauth 호출 없이 그대로 사용 (token-first)
//   2) INSUNG_CONSUMER_KEY 있으면 → /api/oauth/ 호출해 토큰 발급
//   3) 둘 다 없으면 → IntegrationNotConfiguredError
//
// 에러 구분:
//   - IntegrationNotConfiguredError: env 누락
//   - InsungLiveRegisterDisabledError: INSUNG_ENABLE_LIVE_REGISTER=false
//   - InsungNotRegisteredError: DB에 serial_number 없음
//   - InsungLocationUnavailableError: API는 성공이지만 위치값이 비어있음
//   - InsungPermissionError: code=1003 등 권한/화이트리스트 차단
//   - InsungApiError: 그 외 API 실패

import axios from "axios";
import { env } from "../config/env";
import { buildInsungAuth } from "./insungAuth";
import { prisma } from "../prisma/client";
import type { Request as PrismaRequest } from "@prisma/client";
import { resolveKoreanAddress } from "./call24IntegrationService";
import { mapVehicleBodyTypeToInsungCarKind } from "./vehicleCatalog";

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
    public readonly code?: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "InsungApiError";
  }
}

export class InsungLiveRegisterDisabledError extends Error {
  constructor() {
    super("인성 실제 등록이 비활성화되어 있습니다. INSUNG_ENABLE_LIVE_REGISTER=true 이어야 외부 호출이 허용됩니다.");
    this.name = "InsungLiveRegisterDisabledError";
  }
}

export class InsungNotRegisteredError extends Error {
  constructor() {
    super("인성 등록 정보가 없습니다. 먼저 인성 등록을 진행하세요.");
    this.name = "InsungNotRegisteredError";
  }
}

export class InsungLocationUnavailableError extends Error {
  constructor(message = "인성 기사 위치 정보가 아직 없습니다.") {
    super(message);
    this.name = "InsungLocationUnavailableError";
  }
}

export class InsungPermissionError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "InsungPermissionError";
  }
}

export class InsungPayloadValidationError extends Error {
  constructor(message: string, public readonly detail?: Record<string, unknown>) {
    super(message);
    this.name = "InsungPayloadValidationError";
  }
}

const INSUNG_MIN_SENT_PRICE = 10_000;

// ── credentials 수집 ───────────────────────────────────────
// CONSUMER_KEY 기반 모드: BASE_URL + M_CODE + CC_CODE + USER_ID + CONSUMER_KEY 필요
// TOKEN 직접 모드: 위 + INSUNG_TOKEN 존재 시 oauth 건너뜀
function getInsungConfig() {
  const {
    INSUNG_BASE_URL,
    INSUNG_M_CODE,
    INSUNG_CC_CODE,
    INSUNG_USER_ID,
    INSUNG_CONSUMER_KEY,
    INSUNG_TOKEN,
    INSUNG_RESPONSE_TYPE,
  } = env;

  const missing: string[] = [];
  if (!INSUNG_BASE_URL) missing.push("INSUNG_BASE_URL");
  if (!INSUNG_M_CODE) missing.push("INSUNG_M_CODE");
  if (!INSUNG_CC_CODE) missing.push("INSUNG_CC_CODE");
  if (!INSUNG_USER_ID) missing.push("INSUNG_USER_ID");

  if (missing.length > 0) {
    throw new IntegrationNotConfiguredError("인성", missing);
  }

  if (!INSUNG_TOKEN && !INSUNG_CONSUMER_KEY) {
    throw new IntegrationNotConfiguredError("인성", ["INSUNG_TOKEN 또는 INSUNG_CONSUMER_KEY"]);
  }

  return {
    baseUrl: INSUNG_BASE_URL!.replace(/\/+$/, ""),
    mCode: INSUNG_M_CODE!,
    ccCode: INSUNG_CC_CODE!,
    userId: INSUNG_USER_ID!,
    consumerKey: INSUNG_CONSUMER_KEY,
    directToken: INSUNG_TOKEN,
    responseType: INSUNG_RESPONSE_TYPE || "json",
  };
}

type InsungCfg = ReturnType<typeof getInsungConfig>;

function parseOptionalLiveRegisterFlag(raw: string | undefined): boolean {
  if (!raw) return true;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  throw new InsungLiveRegisterDisabledError();
}

function assertInsungLiveRegisterAllowed(): void {
  if (!parseOptionalLiveRegisterFlag(env.INSUNG_ENABLE_LIVE_REGISTER)) {
    throw new InsungLiveRegisterDisabledError();
  }
}

function maskToken(token: string): string {
  if (!token) return "(empty)";
  if (token.length <= 8) return "***";
  return `${token.slice(0, 4)}…${token.slice(-4)}`;
}

// 인성 응답 에러 코드를 도메인 에러로 변환
// (인성 측 공식 코드표는 내부 문서에 있으며, 여기서는 대표 코드만 매핑한다.)
function throwInsungApiError(code: string, msg: string, raw: unknown): never {
  // 권한/화이트리스트 계열
  if (code === "1002" || code === "1003" || /권한|허용|IP|ip/i.test(msg)) {
    throw new InsungPermissionError(
      msg?.trim() ? `인성 접근이 거부되었습니다: ${msg}` : "인성 계정 권한 또는 IP 화이트리스트가 반영되지 않았습니다.",
      code,
      raw
    );
  }
  // 일반 실패
  throw new InsungApiError(
    msg?.trim() ? `인성 API 오류(${code}): ${msg}` : `인성 API 오류 (code=${code})`,
    undefined,
    code,
    raw
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function firstRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    return value.map(asRecord).find(Boolean) ?? null;
  }
  return asRecord(value);
}

function collectInsungResponseRecords(raw: unknown): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];

  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    const record = asRecord(value);
    if (!record) return;

    records.push(record);
    [
      record.data,
      record.result_data,
      record.resultData,
      record.order,
      record.detail,
      record.item,
      record.list,
    ].forEach(visit);
  };

  visit(raw);

  return records;
}

function pickStringish(records: Record<string, unknown>[], keys: string[]): string {
  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }
  }
  return "";
}

function pickInsungCode(records: Record<string, unknown>[]): string {
  return pickStringish(records, ["code", "result_code", "resultCode"]);
}

function pickInsungMessage(records: Record<string, unknown>[]): string {
  return pickStringish(records, ["msg", "message", "result_msg", "resultMsg"]);
}

function pickInsungSerial(records: Record<string, unknown>[], raw: unknown): string {
  const serial = pickStringish(records, [
    "serial_number",
    "serialNumber",
    "serial_no",
    "serialNo",
    "serial_num",
    "serialNum",
    "serial",
    "order_no",
    "orderNo",
    "order_number",
    "orderNumber",
    "ordNo",
    "ord_no",
    "receipt_no",
    "receiptNo",
  ]);
  if (serial) return serial;

  // Some legacy endpoints return the created identifier as scalar data.
  const scalarData = pickStringish(records, ["data", "result_data", "resultData"]);
  if (/^\d{4,}$/.test(scalarData)) return scalarData;

  if (typeof raw === "string" || typeof raw === "number") {
    const rawValue = String(raw).trim();
    if (/^\d{4,}$/.test(rawValue)) return rawValue;
  }

  return "";
}

function hasInsungSuccess(records: Record<string, unknown>[]): boolean {
  return records.some((record) => {
    const code = record.code ?? record.result_code ?? record.resultCode;
    const result = record.result;
    return code === "1000" || code === 1000 || result === "1" || result === 1;
  });
}

// ── 토큰 취득 (token-first) ────────────────────────────────
// 1) INSUNG_TOKEN 있으면 그 값 반환 (oauth 호출 없음)
// 2) 없으면 consumer-key 기반 oauth 발급
export async function getInsungToken(cfg: InsungCfg = getInsungConfig()): Promise<string> {
  if (cfg.directToken) {
    console.log(`[인성] direct token 사용: ${maskToken(cfg.directToken)}`);
    return cfg.directToken;
  }

  if (!cfg.consumerKey) {
    throw new IntegrationNotConfiguredError("인성", ["INSUNG_TOKEN 또는 INSUNG_CONSUMER_KEY"]);
  }

  const auth = buildInsungAuth({
    baseUrl: cfg.baseUrl,
    mCode: cfg.mCode,
    ccCode: cfg.ccCode,
    consumerKey: cfg.consumerKey,
    userId: cfg.userId,
    responseType: cfg.responseType,
    liveRegisterEnabled: true, // 여기선 무시됨
  });

  console.log("[인성] oauth 토큰 발급 시도", {
    url: `${cfg.baseUrl}/api/oauth/`,
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    user_id: cfg.userId,
    ukey_masked: `${auth.ukey.slice(0, 4)}…${auth.ukey.slice(-4)}`,
    akey_masked: `${auth.akey.slice(0, 4)}…${auth.akey.slice(-4)}`,
  });

  const params: Record<string, string> = {
    type: cfg.responseType,
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    ukey: auth.ukey,
    akey: auth.akey,
  };

  const res = await axios.get(`${cfg.baseUrl}/api/oauth/`, {
    params,
    timeout: 10_000,
    validateStatus: () => true,
  });

  // 응답 포맷: [{ code, msg, token }] 또는 { code, msg, token }
  const body = res.data as unknown;
  const records = collectInsungResponseRecords(body);
  const code = pickInsungCode(records);
  const msg = pickInsungMessage(records);
  const token = pickStringish(records, ["token", "access_token", "accessToken"]);

  if (!hasInsungSuccess(records) || !token) {
    throwInsungApiError(code || String(res.status), msg, body);
  }

  console.log(`[인성] oauth 토큰 발급 성공: ${maskToken(token)}`);
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
  kind_etc: string;
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
export async function mapRequestToInsungPayload(
  request: PrismaRequest,
  token: string,
  cfg: InsungCfg
): Promise<InsungOrderPayload> {
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

  const kindMap: Record<string, string> = {
    MOTORCYCLE: "1",
    DAMAS: "2",
    ONE_TON_PLUS: "3",
    LABO: "5",
  };
  const kind = request.vehicleGroup ? (kindMap[request.vehicleGroup] ?? "1") : "1";
  const kind_etc = request.vehicleBodyType ?? "";

  const payGbnMap: Record<string, string> = {
    CASH_PREPAID: "1",
    CASH_COLLECT: "2",
    CREDIT: "3",
    CARD: "3",
  };
  const pay_gbn = request.paymentMethod ? (payGbnMap[request.paymentMethod] ?? "1") : "1";

  const doc = request.requestType === "ROUND_TRIP" ? "3" : "1";
  const sfast =
    request.requestType === "URGENT"
      ? "3"
      : request.requestType === "DIRECT"
      ? "6"
      : "1";

  const [startParsed, destParsed] = await Promise.all([
    resolveKoreanAddress(request.pickupAddress ?? ""),
    resolveKoreanAddress(request.dropoffAddress ?? ""),
  ]);

  const startLocation = [request.pickupAddress, request.pickupAddressDetail].filter(Boolean).join(" ");
  const destLocation = [request.dropoffAddress, request.dropoffAddressDetail].filter(Boolean).join(" ");

  const vehicleBodyType = request.vehicleBodyType ?? "";
  const car_kind = mapVehicleBodyTypeToInsungCarKind(vehicleBodyType);

  console.log("[인성] 요청 인증값:", {
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    user_id: cfg.userId,
    token: maskToken(token),
    tokenMode: cfg.directToken ? "DIRECT" : "OAUTH",
  });
  console.log("[인성] 주소 분해 결과:", {
    pickup: { raw: request.pickupAddress, ...startParsed },
    dropoff: { raw: request.dropoffAddress, ...destParsed },
  });
  console.log("[인성] car_kind 매핑:", { vehicleBodyType, car_kind });
  console.log("[인성] 선택형 옵션 매핑:", {
    requestId: request.id,
    siteSelections: {
      vehicleGroup: request.vehicleGroup,
      vehicleTonnage: request.vehicleTonnage,
      vehicleBodyType: request.vehicleBodyType,
      requestType: request.requestType,
      pickupMethod: request.pickupMethod,
      dropoffMethod: request.dropoffMethod,
      paymentMethod: request.paymentMethod,
    },
    payloadOptions: {
      kind,
      kind_etc,
      pay_gbn,
      doc,
      sfast,
      item_type: "1",
      car_kind,
    },
  });

  return {
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    token,
    user_id: cfg.userId,
    type: cfg.responseType,
    c_name: request.targetCompanyName ?? "",
    c_mobile: request.targetCompanyContactPhone ?? "",
    c_dept_name: "",
    c_charge_name: request.targetCompanyContactName ?? "",
    reason_desc: "",
    s_start: request.pickupPlaceName,
    start_telno: request.pickupContactPhone ?? "",
    dept_name: "",
    charge_name: request.pickupContactName ?? "",
    start_sido: startParsed.wide,
    start_gugun: startParsed.sgg,
    start_dong: startParsed.dong,
    start_ri: "",
    start_location: startLocation,
    start_lon: "",
    start_lat: "",
    s_dest: request.dropoffPlaceName,
    dest_telno: request.dropoffContactPhone ?? "",
    dest_dept: "",
    dest_charge: request.dropoffContactName ?? "",
    dest_sido: destParsed.wide,
    dest_gugun: destParsed.sgg,
    dest_dong: destParsed.dong,
    dest_ri: "",
    dest_location: destLocation,
    dest_lon: "",
    dest_lat: "",
    kind,
    kind_etc,
    pay_gbn,
    doc,
    sfast,
    item_type: "1",
    memo: request.cargoDescription ?? "",
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
    car_kind,
    state: "1",
    distince: String(request.distanceKm ?? 0),
    cash_surtax_gbn: "0",
    order_memo: request.driverNote ?? "",
  };
}

// ── 오더 등록 ─────────────────────────────────────────────
export async function registerInsungOrder(
  _token: string,
  payload: InsungOrderPayload,
  cfg: InsungCfg
): Promise<string> {
  assertInsungLiveRegisterAllowed();

  const params = new URLSearchParams(payload as unknown as Record<string, string>);

  const res = await axios.post(`${cfg.baseUrl}/api/order_regist/`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 15_000,
    validateStatus: () => true,
  });

  const body = res.data as unknown;
  const records = collectInsungResponseRecords(body);

  // 인성은 등록 성공 시 code="1000"이거나 legacy 응답은 result="1"
  const code = pickInsungCode(records);
  const msg = pickInsungMessage(records);
  const serial = pickInsungSerial(records, body);

  const ok = hasInsungSuccess(records);
  if (!ok || !serial) {
    if (!serial && ok) {
      console.error("[인성] 등록 성공 응답에서 주문 식별자를 찾지 못했습니다.", {
        status: res.status,
        code,
        msg,
        raw: body,
      });
      throw new InsungApiError(
        "인성 등록 응답에 주문 식별자(serial/order number)가 없습니다.",
        res.status,
        code,
        body
      );
    }
    throwInsungApiError(code || String(res.status), msg, body);
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
  const token = await getInsungToken(cfg);

  const params = new URLSearchParams({
    type: cfg.responseType,
    m_code: cfg.mCode,
    cc_code: cfg.ccCode,
    token,
    user_id: cfg.userId,
    serial,
  });

  const res = await axios.post(`${cfg.baseUrl}/api/order_detail/`, params.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 10_000,
    validateStatus: () => true,
  });

  const body = res.data as unknown;
  const records = collectInsungResponseRecords(body);
  const entry = Object.assign({}, ...records);

  const code = pickInsungCode(records);
  const msg = pickInsungMessage(records);
  const ok = hasInsungSuccess(records);
  if (!ok) {
    throwInsungApiError(code || String(res.status), msg, body);
  }

  return entry as unknown as InsungOrderDetail;
}

// ── DB 저장 포함 통합 등록 함수 ────────────────────────────
export async function registerAndSaveInsungOrder(requestId: number, sentPrice?: number): Promise<{
  serialNumber: string;
  estimatedPrice: number;
}> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");

  const estimatedPrice = request.quotedPrice ?? request.actualFare ?? 0;

  if (request.insungSerialNumber && request.insungSyncStatus === "SUCCESS") {
    return { serialNumber: request.insungSerialNumber, estimatedPrice };
  }

  const actualSentPrice = sentPrice ?? estimatedPrice;
  if (actualSentPrice < INSUNG_MIN_SENT_PRICE) {
    throw new InsungPayloadValidationError(
      `인성 전송 금액은 ${INSUNG_MIN_SENT_PRICE.toLocaleString("ko-KR")}원 미만으로 등록할 수 없습니다.`,
      { minPrice: INSUNG_MIN_SENT_PRICE, sentPrice: actualSentPrice }
    );
  }

  const cfg = getInsungConfig();
  assertInsungLiveRegisterAllowed();

  await prisma.request.update({
    where: { id: requestId },
    data: { insungSyncStatus: "PENDING", insungLastError: null },
  });

  try {
    const token = await getInsungToken(cfg);
    console.log(`[인성] 오더 등록 시작 requestId=${requestId}`);
    const payload = await mapRequestToInsungPayload(request, token, cfg);
    payload.price = String(actualSentPrice);

    console.log("[인성] 전송 직전 선택형 옵션:", {
      requestId,
      siteSelections: {
        vehicleGroup: request.vehicleGroup,
        vehicleTonnage: request.vehicleTonnage,
        vehicleBodyType: request.vehicleBodyType,
        requestType: request.requestType,
        pickupMethod: request.pickupMethod,
        dropoffMethod: request.dropoffMethod,
        paymentMethod: request.paymentMethod,
      },
      payloadOptions: {
        kind: payload.kind,
        kind_etc: payload.kind_etc,
        pay_gbn: payload.pay_gbn,
        doc: payload.doc,
        sfast: payload.sfast,
        item_type: payload.item_type,
        car_kind: payload.car_kind,
        price: payload.price,
      },
    });

    const serialNumber = await registerInsungOrder(token, payload, cfg);

    await prisma.request.update({
      where: { id: requestId },
      data: {
        insungSerialNumber: serialNumber,
        insungSyncStatus: "SUCCESS",
        insungSyncedAt: new Date(),
        insungLastError: null,
        externalEstimatedPrice: estimatedPrice,
        externalSentPrice: actualSentPrice,
        externalPlatform: "insung",
      },
    });

    console.log(`[인성] 오더 등록 성공 serialNumber=${serialNumber}`);
    return { serialNumber, estimatedPrice };
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

// ── 위치/상태 조회 및 DB 저장 ─────────────────────────────
export type InsungLiveStatus = {
  lat: number | null;
  lon: number | null;
  updatedAt: string | null;
  state: string | null;
  saveState: string | null;
  riderName: string | null;
  riderPhone: string | null;
  allocationTime: string | null;
  pickupTime: string | null;
  completeTime: string | null;
};

type InsungCoordinateKind = "lat" | "lon";

function isKoreanWgs84Coordinate(value: number, kind: InsungCoordinateKind): boolean {
  if (!Number.isFinite(value)) return false;
  return kind === "lat" ? value >= 30 && value <= 45 : value >= 120 && value <= 135;
}

export function parseInsungCoordinate(
  value: string | number | null | undefined,
  kind: InsungCoordinateKind
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(String(value).trim().replace(/,/g, ""));
  if (!Number.isFinite(numeric)) return null;

  if (isKoreanWgs84Coordinate(numeric, kind)) return numeric;

  // 인성 order_detail 좌표는 WGS84 degree * 360000 형태로 내려온다.
  // 예: lon=45686956 -> 126.908211..., lat=13520956 -> 37.558211...
  const byArcSecond100 = numeric / 360_000;
  if (isKoreanWgs84Coordinate(byArcSecond100, kind)) return byArcSecond100;

  return null;
}

export async function fetchAndSaveInsungLocation(requestId: number): Promise<InsungLiveStatus> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");
  if (!request.insungSerialNumber) {
    throw new InsungNotRegisteredError();
  }

  const detail = await getInsungOrderDetail(request.insungSerialNumber);

  const lat = parseInsungCoordinate(detail.rider_lat, "lat");
  const lon = parseInsungCoordinate(detail.rider_lon, "lon");
  const now = new Date();

  if (lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon)) {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        insungLastLocationLat: lat,
        insungLastLocationLon: lon,
        insungLastLocationAt: now,
      },
    });
  }

  const resolved: InsungLiveStatus = {
    lat: Number.isFinite(lat) ? lat : null,
    lon: Number.isFinite(lon) ? lon : null,
    updatedAt: now.toISOString(),
    state: detail.state ?? null,
    saveState: detail.save_state ?? null,
    riderName: detail.rider_name ?? null,
    riderPhone: detail.rider_tel_number ?? null,
    allocationTime: detail.allocation_time ?? null,
    pickupTime: detail.pickup_time ?? null,
    completeTime: detail.complete_time ?? null,
  };

  // 위치 자체는 없어도 상태는 돌려주되, lat/lon 모두 없으면 caller 가 필요 시 예외 변환할 수 있도록 표시
  if (resolved.lat === null && resolved.lon === null) {
    console.warn(`[인성] 위치 좌표가 비어 있습니다. requestId=${requestId} state=${resolved.state} saveState=${resolved.saveState}`);
  }

  return resolved;
}
