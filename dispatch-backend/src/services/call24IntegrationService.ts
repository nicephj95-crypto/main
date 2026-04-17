// src/services/call24IntegrationService.ts
//
// 화물24 외부 배차 연동 서비스
//
// 흐름:
//   1. addOrder(body) — AES-CBC 암호화 body → ordNo 반환
//   2. cjLocation(ordNo) — 차주 위치정보 조회
//   3. getOrder(ordNo) — 오더 상세 조회 (선택)
//
// 암호화: AES-CBC / Base64 / PKCS#5(= PKCS#7)
// 헤더: call24-api-key
// body: { "data": "<base64_encrypted_json>" }

import { createCipheriv, createDecipheriv } from "crypto";
import axios from "axios";
import { env } from "../config/env";
import { prisma } from "../prisma/client";
import type { Request as PrismaRequest } from "@prisma/client";
import { IntegrationNotConfiguredError } from "./insungIntegrationService";

export class Call24ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly raw?: unknown
  ) {
    super(message);
    this.name = "Call24ApiError";
  }
}

// ── credentials 검증 ───────────────────────────────────────
function getCall24Config() {
  const { CALL24_BASE_URL, CALL24_API_KEY, CALL24_AES_KEY, CALL24_AES_IV } = env;
  const missing: string[] = [];
  if (!CALL24_BASE_URL) missing.push("CALL24_BASE_URL");
  if (!CALL24_API_KEY) missing.push("CALL24_API_KEY");
  if (!CALL24_AES_KEY) missing.push("CALL24_AES_KEY");
  if (!CALL24_AES_IV) missing.push("CALL24_AES_IV");
  if (missing.length > 0) {
    throw new IntegrationNotConfiguredError("화물24", missing);
  }
  return {
    baseUrl: CALL24_BASE_URL!,
    apiKey: CALL24_API_KEY!,
    aesKey: CALL24_AES_KEY!,
    aesIv: CALL24_AES_IV!,
  };
}

// ── AES-CBC 암호화 ─────────────────────────────────────────
function encryptAesCbc(plaintext: string, key: string, iv: string): string {
  const keyBuf = Buffer.from(key, "utf8");
  const ivBuf = Buffer.from(iv, "utf8");

  let algorithm: string;
  if (keyBuf.length === 16) algorithm = "aes-128-cbc";
  else if (keyBuf.length === 24) algorithm = "aes-192-cbc";
  else if (keyBuf.length === 32) algorithm = "aes-256-cbc";
  else throw new Error(`지원하지 않는 AES 키 길이: ${keyBuf.length}바이트 (16/24/32 중 하나여야 함)`);

  const cipher = createCipheriv(algorithm, keyBuf, ivBuf);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return encrypted.toString("base64");
}

// ── AES-CBC 복호화 ─────────────────────────────────────────
function decryptAesCbc(ciphertext: string, key: string, iv: string): string {
  const keyBuf = Buffer.from(key, "utf8");
  const ivBuf = Buffer.from(iv, "utf8");

  let algorithm: string;
  if (keyBuf.length === 16) algorithm = "aes-128-cbc";
  else if (keyBuf.length === 24) algorithm = "aes-192-cbc";
  else algorithm = "aes-256-cbc";

  const decipher = createDecipheriv(algorithm, keyBuf, ivBuf);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// ── 공통 요청 헬퍼 ────────────────────────────────────────
async function call24Post<T>(
  endpoint: string,
  body: Record<string, unknown>,
  cfg: ReturnType<typeof getCall24Config>
): Promise<T> {
  const plaintext = JSON.stringify(body);
  const encrypted = encryptAesCbc(plaintext, cfg.aesKey, cfg.aesIv);

  const res = await axios.post(
    `${cfg.baseUrl}${endpoint}`,
    { data: encrypted },
    {
      headers: {
        "Content-Type": "application/json",
        "call24-api-key": cfg.apiKey,
      },
      timeout: 15_000,
    }
  );

  let responseData: T;
  if (typeof res.data === "string") {
    try {
      const decrypted = decryptAesCbc(res.data, cfg.aesKey, cfg.aesIv);
      responseData = JSON.parse(decrypted) as T;
    } catch {
      responseData = res.data as unknown as T;
    }
  } else if (res.data?.data && typeof res.data.data === "string") {
    try {
      const decrypted = decryptAesCbc(res.data.data, cfg.aesKey, cfg.aesIv);
      responseData = JSON.parse(decrypted) as T;
    } catch {
      responseData = res.data as T;
    }
  } else {
    responseData = res.data as T;
  }

  return responseData;
}

// ── 주소 분해 ─────────────────────────────────────────────
// 한국 주소 형식: "시도 시군구 읍면동 상세주소"
// 예) "서울특별시 강남구 역삼동 123-4 5층"
//     "경기도 성남시 분당구 판교로 123"
//
// 규칙:
//   토큰[0] = 시도 (서울특별시, 경기도, 부산광역시 등)
//   토큰[1] = 시군구 (강남구, 성남시, ...)
//   토큰[2] = 읍면동/로/길 (역삼동, 판교로, ...)
//   토큰[3..] = 상세주소
//
// 주의: 도로명주소는 구조가 다를 수 있음
//   "서울 강남구 테헤란로 123 456호"처럼 시도가 축약될 수 있음
export interface ParsedAddress {
  wide: string;    // 시/도
  sgg: string;     // 시/군/구
  dong: string;    // 읍/면/동 또는 도로명
  detail: string;  // 상세주소 (번지, 층수 등)
}

// 시도 목록 (full + 축약)
const SIDO_LIST = [
  "서울특별시", "서울",
  "부산광역시", "부산",
  "대구광역시", "대구",
  "인천광역시", "인천",
  "광주광역시", "광주",
  "대전광역시", "대전",
  "울산광역시", "울산",
  "세종특별자치시", "세종",
  "경기도", "경기",
  "강원특별자치도", "강원도", "강원",
  "충청북도", "충북",
  "충청남도", "충남",
  "전라북도", "전북특별자치도", "전북",
  "전라남도", "전남",
  "경상북도", "경북",
  "경상남도", "경남",
  "제주특별자치도", "제주도", "제주",
];

export function parseKoreanAddress(fullAddress: string): ParsedAddress {
  // 앞뒤 공백 제거
  const addr = fullAddress.trim();
  const tokens = addr.split(/\s+/);

  if (tokens.length === 0) {
    return { wide: "", sgg: "", dong: "", detail: "" };
  }

  // 시도 추출 — SIDO_LIST 기준으로 첫 토큰 매칭
  let wideIdx = -1;
  let wide = "";
  for (let i = 0; i < Math.min(tokens.length, 2); i++) {
    if (SIDO_LIST.some((s) => tokens[i].startsWith(s) || s.startsWith(tokens[i]))) {
      wideIdx = i;
      wide = tokens[i];
      break;
    }
  }

  if (wideIdx === -1) {
    // 시도를 찾지 못한 경우 — 전체 주소를 detail로
    return { wide: "", sgg: "", dong: "", detail: addr };
  }

  const rest = tokens.slice(wideIdx + 1);
  const sgg = rest[0] ?? "";
  const dong = rest[1] ?? "";
  const detail = rest.slice(2).join(" ");

  return { wide, sgg, dong, detail };
}

// ── payload 주소 필드 validation ──────────────────────────
export class Call24AddressValidationError extends Error {
  constructor(missingFields: string[]) {
    super(
      `화물24 주소 필수 필드가 비어 있어 등록할 수 없습니다: ${missingFields.join(", ")}`
    );
    this.name = "Call24AddressValidationError";
  }
}

function validateCall24Address(payload: Call24AddOrderPayload): void {
  const requiredFields: Array<[keyof Call24AddOrderPayload, string]> = [
    ["startWide", "상차지 시/도(startWide)"],
    ["startSgg", "상차지 시/군/구(startSgg)"],
    ["startDong", "상차지 읍/면/동(startDong)"],
    ["endWide", "하차지 시/도(endWide)"],
    ["endSgg", "하차지 시/군/구(endSgg)"],
    ["endDong", "하차지 읍/면/동(endDong)"],
  ];

  const missing: string[] = [];
  for (const [field, label] of requiredFields) {
    if (!payload[field]) {
      missing.push(label);
    }
  }

  if (missing.length > 0) {
    throw new Call24AddressValidationError(missing);
  }
}

// ── 화물 등록 요청 타입 ────────────────────────────────────
export type Call24AddOrderPayload = {
  startWide: string;
  startSgg: string;
  startDong: string;
  startDetail: string;
  endWide: string;
  endSgg: string;
  endDong: string;
  endDetail: string;
  multiCargoGub: string;
  urgent: string;
  shuttleCargoInfo: string;
  cargoTon: string;
  truckType: string;
  frgton: string;
  startPlanDt: string;
  endPlanDt: string;
  startLoad: string;
  endLoad: string;
  cargoDsc: string;
  farePaytype: string;
  fare: number;
  fee: number;
  endAreaPhone: string;
  firstType: string;
  firstShipperNm: string;
  firstShipperInfo: string;
  firstShipperBizNo: string;
  taxbillType: string;
  payPlanYmd: string;
  ddID: string;
};

// ── 날짜 포맷 헬퍼 ────────────────────────────────────────
function formatCall24Dt(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}${m}${d}${hh}${mm}`;
}

// ── 우리 Request → 화물24 payload 매핑 ────────────────────
export function mapRequestToCall24Payload(request: PrismaRequest): Call24AddOrderPayload {
  const startDt = request.pickupIsImmediate
    ? new Date()
    : request.pickupDatetime
    ? new Date(request.pickupDatetime)
    : new Date();

  const endDt = request.dropoffIsImmediate
    ? new Date()
    : request.dropoffDatetime
    ? new Date(request.dropoffDatetime)
    : new Date();

  const faretypeMap: Record<string, string> = {
    CREDIT: "1",
    CARD: "2",
    CASH_PREPAID: "3",
    CASH_COLLECT: "4",
  };
  const farePaytype = request.paymentMethod ? (faretypeMap[request.paymentMethod] ?? "1") : "1";

  const loadMethodMap: Record<string, string> = {
    FORKLIFT: "1",
    MANUAL: "2",
    SUDOU_SUHAEJUNG: "3",
    HOIST: "4",
    CRANE: "5",
    CONVEYOR: "6",
  };
  const startLoad = loadMethodMap[request.pickupMethod] ?? "1";
  const endLoad = loadMethodMap[request.dropoffMethod] ?? "1";

  // 주소 분해
  const startParsed = parseKoreanAddress(request.pickupAddress ?? "");
  const endParsed = parseKoreanAddress(request.dropoffAddress ?? "");

  // startDetail: 파싱된 detail + 별도 상세주소 합산
  const startDetail = [
    startParsed.detail,
    request.pickupAddressDetail,
  ].filter(Boolean).join(" ").trim() || [request.pickupAddress, request.pickupAddressDetail].filter(Boolean).join(" ");

  const endDetail = [
    endParsed.detail,
    request.dropoffAddressDetail,
  ].filter(Boolean).join(" ").trim() || [request.dropoffAddress, request.dropoffAddressDetail].filter(Boolean).join(" ");

  const payload: Call24AddOrderPayload = {
    startWide: startParsed.wide,
    startSgg: startParsed.sgg,
    startDong: startParsed.dong,
    startDetail,

    endWide: endParsed.wide,
    endSgg: endParsed.sgg,
    endDong: endParsed.dong,
    endDetail,

    multiCargoGub: request.requestType === "DIRECT" ? "Y" : "N",
    urgent: request.requestType === "URGENT" ? "Y" : "N",
    shuttleCargoInfo: request.requestType === "ROUND_TRIP" ? "Y" : "N",

    cargoTon: request.vehicleTonnage != null ? String(request.vehicleTonnage) : "",
    truckType: request.vehicleBodyType ?? "",
    frgton: request.vehicleTonnage != null ? String(request.vehicleTonnage) : "",

    startPlanDt: formatCall24Dt(startDt),
    endPlanDt: formatCall24Dt(endDt),

    startLoad,
    endLoad,

    cargoDsc: [request.cargoDescription, request.driverNote].filter(Boolean).join(" | "),

    farePaytype,
    fare: request.quotedPrice ?? request.actualFare ?? 0,
    fee: 0,

    endAreaPhone: request.dropoffContactPhone ?? "",

    firstType: "1",
    firstShipperNm: request.targetCompanyName ?? "",
    firstShipperInfo: [
      request.targetCompanyContactName,
      request.targetCompanyContactPhone,
    ].filter(Boolean).join(" "),
    firstShipperBizNo: "",
    taxbillType: "1",
    payPlanYmd: "",
    ddID: "",
  };

  // 디버그 로그
  console.log("[화물24] 주소 분해 결과:", {
    pickup: { raw: request.pickupAddress, ...startParsed, detail: startDetail },
    dropoff: { raw: request.dropoffAddress, ...endParsed, detail: endDetail },
  });

  return payload;
}

// ── 화물 등록 ─────────────────────────────────────────────
interface Call24AddOrderResponse {
  result: number | string;
  ordNo?: string;
  message?: string;
}

export async function addCall24Order(payload: Call24AddOrderPayload): Promise<string> {
  // API 호출 전 주소 validation
  validateCall24Address(payload);

  const cfg = getCall24Config();
  const response = await call24Post<Call24AddOrderResponse>(
    "/api/order/addOrder",
    payload as unknown as Record<string, unknown>,
    cfg
  );

  const isSuccess = response.result === 1 || response.result === "1" || response.result === "SUCCESS";
  if (!isSuccess) {
    throw new Call24ApiError(
      `화물24 오더 등록 실패: ${response.message ?? JSON.stringify(response)}`,
      undefined,
      response
    );
  }

  if (!response.ordNo) {
    throw new Call24ApiError("화물24 오더 등록 응답에 ordNo가 없습니다.", undefined, response);
  }

  return response.ordNo;
}

// ── 차주 위치정보 조회 ─────────────────────────────────────
export interface Call24LocationResponse {
  result?: number | string;
  lng?: string | number;
  lat?: string | number;
  addr?: string;
  upDt?: string;
}

export async function getCall24Location(ordNo: string): Promise<Call24LocationResponse> {
  const cfg = getCall24Config();
  return call24Post<Call24LocationResponse>("/api/order/cjLocation", { ordNo }, cfg);
}

// ── 오더 조회 ─────────────────────────────────────────────
export async function getCall24Order(ordNo: string): Promise<Record<string, unknown>> {
  const cfg = getCall24Config();
  return call24Post<Record<string, unknown>>("/api/order/getOrder", { ordNo }, cfg);
}

// ── DB 저장 포함 통합 등록 함수 ────────────────────────────
export async function registerAndSaveCall24Order(requestId: number): Promise<{
  ordNo: string;
}> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");

  if (request.call24OrdNo && request.call24SyncStatus === "SUCCESS") {
    return { ordNo: request.call24OrdNo };
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { call24SyncStatus: "PENDING", call24LastError: null },
  });

  try {
    const payload = mapRequestToCall24Payload(request);
    console.log(`[화물24] 오더 등록 시작 requestId=${requestId}`);
    const ordNo = await addCall24Order(payload);

    await prisma.request.update({
      where: { id: requestId },
      data: {
        call24OrdNo: ordNo,
        call24SyncStatus: "SUCCESS",
        call24SyncedAt: new Date(),
        call24LastError: null,
      },
    });

    console.log(`[화물24] 오더 등록 성공 ordNo=${ordNo}`);
    return { ordNo };
  } catch (err: any) {
    console.error(`[화물24] 오더 등록 실패 requestId=${requestId}:`, err?.message);
    await prisma.request.update({
      where: { id: requestId },
      data: {
        call24SyncStatus: "FAILED",
        call24LastError: err?.message ?? "알 수 없는 오류",
      },
    });
    throw err;
  }
}

// ── 위치 조회 및 DB 저장 ────────────────────────────────────
export async function fetchAndSaveCall24Location(requestId: number): Promise<{
  lat: number | null;
  lon: number | null;
  addr: string | null;
  updatedAt: string | null;
}> {
  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("배차 요청을 찾을 수 없습니다.");
  if (!request.call24OrdNo) {
    throw new Error("화물24 주문번호가 없습니다. 먼저 화물24 등록을 진행하세요.");
  }

  const locationData = await getCall24Location(request.call24OrdNo);

  const lat = locationData.lat != null ? parseFloat(String(locationData.lat)) : null;
  const lon = locationData.lng != null ? parseFloat(String(locationData.lng)) : null;
  const now = new Date();

  if (lat !== null && lon !== null) {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        call24LastLocationLat: lat,
        call24LastLocationLon: lon,
        call24LastLocationAt: now,
      },
    });
  }

  return { lat, lon, addr: locationData.addr ?? null, updatedAt: now.toISOString() };
}
