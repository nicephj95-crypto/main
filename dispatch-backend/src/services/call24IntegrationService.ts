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
//
// credentials(env)가 없으면 IntegrationNotConfiguredError를 throw.

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
  if (!CALL24_BASE_URL || !CALL24_API_KEY || !CALL24_AES_KEY || !CALL24_AES_IV) {
    throw new IntegrationNotConfiguredError("화물24");
  }
  return {
    baseUrl: CALL24_BASE_URL,
    apiKey: CALL24_API_KEY,
    aesKey: CALL24_AES_KEY,
    aesIv: CALL24_AES_IV,
  };
}

// ── AES-CBC 암호화 ─────────────────────────────────────────
// Node.js crypto는 PKCS#7 padding을 기본으로 적용하며,
// PKCS#5는 블록 크기 16 기준으로 PKCS#7과 동일.
// key/iv는 env에서 문자열로 받아 Buffer로 변환.
// key 길이: 16바이트 → aes-128-cbc, 32바이트 → aes-256-cbc
function encryptAesCbc(plaintext: string, key: string, iv: string): string {
  const keyBuf = Buffer.from(key, "utf8");
  const ivBuf = Buffer.from(iv, "utf8");

  let algorithm: string;
  if (keyBuf.length === 16) {
    algorithm = "aes-128-cbc";
  } else if (keyBuf.length === 24) {
    algorithm = "aes-192-cbc";
  } else if (keyBuf.length === 32) {
    algorithm = "aes-256-cbc";
  } else {
    throw new Error(`지원하지 않는 AES 키 길이: ${keyBuf.length}바이트 (16/24/32 중 하나여야 함)`);
  }

  const cipher = createCipheriv(algorithm, keyBuf, ivBuf);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return encrypted.toString("base64");
}

// ── AES-CBC 복호화 (응답 처리용) ───────────────────────────
function decryptAesCbc(ciphertext: string, key: string, iv: string): string {
  const keyBuf = Buffer.from(key, "utf8");
  const ivBuf = Buffer.from(iv, "utf8");

  let algorithm: string;
  if (keyBuf.length === 16) {
    algorithm = "aes-128-cbc";
  } else if (keyBuf.length === 24) {
    algorithm = "aes-192-cbc";
  } else {
    algorithm = "aes-256-cbc";
  }

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
  // body 전체를 JSON 직렬화 후 AES 암호화
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

  // 응답이 암호화돼 있으면 복호화, 아니면 그대로 사용
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

// ── 화물 등록 요청 타입 ────────────────────────────────────
//
// 필드 매핑표:
// ────────────────────────────────────────────────────────
// 우리 필드                   | 화물24 필드       | 상태
// ────────────────────────────────────────────────────────
// pickupAddress               | startWide~Dong    | ⚠️ TODO: 주소 파싱 필요
// pickupAddressDetail         | startDetail       | ✅ 확정
// dropoffAddress              | endWide~Dong      | ⚠️ TODO: 주소 파싱 필요
// dropoffAddressDetail        | endDetail         | ✅ 확정
// requestType=URGENT          | urgent            | ✅ 확정 (Y/N)
// vehicleTonnage              | cargoTon          | ✅ 확정
// vehicleBodyType             | truckType         | ✅ 확정
// vehicleTonnage              | frgton            | ✅ 확정 (중복 매핑)
// pickupDatetime              | startPlanDt       | ✅ 확정 (yyyyMMddHHmm)
// dropoffDatetime             | endPlanDt         | ✅ 확정
// cargoDescription            | cargoDsc          | ✅ 확정
// paymentMethod               | farePaytype       | ⚠️ TODO: 코드값 확인
// quotedPrice / actualFare    | fare              | ✅ 확정
// dropoffContactPhone         | endAreaPhone      | ✅ 확정
// targetCompanyName           | firstShipperNm    | ✅ 확정
// targetCompanyContactName    | firstShipperInfo  | ✅ 확정
// targetCompanyContactPhone   | → firstShipperInfo에 포함 | ✅ 확정
// ────────────────────────────────────────────────────────

export type Call24AddOrderPayload = {
  startWide: string;       // 출발지 시도 (TODO: 주소 파싱 필요)
  startSgg: string;        // 출발지 구군 (TODO: 주소 파싱 필요)
  startDong: string;       // 출발지 동 (TODO: 주소 파싱 필요)
  startDetail: string;     // 출발지 상세주소 (전체 주소 사용)
  endWide: string;         // 도착지 시도 (TODO: 주소 파싱 필요)
  endSgg: string;          // 도착지 구군 (TODO: 주소 파싱 필요)
  endDong: string;         // 도착지 동 (TODO: 주소 파싱 필요)
  endDetail: string;       // 도착지 상세주소
  multiCargoGub: string;   // 혼적 여부 (TODO: 코드값 확인)
  urgent: string;          // 긴급 여부 Y/N
  shuttleCargoInfo: string; // 왕복 화물 정보 (ROUND_TRIP 시)
  cargoTon: string;        // 차량톤수
  truckType: string;       // 차량종류
  frgton: string;          // 화물 무게(톤)
  startPlanDt: string;     // 출발 예정일시 (yyyyMMddHHmm)
  endPlanDt: string;       // 도착 예정일시 (yyyyMMddHHmm)
  startLoad: string;       // 상차 방법 (TODO: 코드값 확인)
  endLoad: string;         // 하차 방법 (TODO: 코드값 확인)
  cargoDsc: string;        // 화물 설명
  farePaytype: string;     // 운임 지불 방식 (TODO: 코드값 확인)
  fare: number;            // 운임
  fee: number;             // 수수료
  endAreaPhone: string;    // 도착지 연락처
  firstType: string;       // 화주 유형 (TODO: 코드값 확인)
  firstShipperNm: string;  // 화주명
  firstShipperInfo: string; // 화주 연락처 정보
  firstShipperBizNo: string; // 화주 사업자번호
  taxbillType: string;     // 세금계산서 유형 (TODO)
  payPlanYmd: string;      // 지급 예정일
  ddID: string;            // 담당 ID (TODO)
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

  // 운임 지불방식 → farePaytype
  // TODO: 화물24 실제 코드값 확인 후 교체
  const faretypeMap: Record<string, string> = {
    CREDIT: "1",       // 신용(월마감) → TODO
    CARD: "2",         // 카드 → TODO
    CASH_PREPAID: "3", // 현금선불 → TODO
    CASH_COLLECT: "4", // 현금착불 → TODO
  };
  const farePaytype = request.paymentMethod ? (faretypeMap[request.paymentMethod] ?? "1") : "1";

  // 상/하차 방법 → startLoad/endLoad
  // TODO: 화물24 실제 코드값 확인 후 교체
  const loadMethodMap: Record<string, string> = {
    FORKLIFT: "1",          // 지게차
    MANUAL: "2",            // 수작업
    SUDOU_SUHAEJUNG: "3",   // 수도움/수해중
    HOIST: "4",             // 호이스트
    CRANE: "5",             // 크레인
    CONVEYOR: "6",          // 컨베이어
  };

  const startLoad = loadMethodMap[request.pickupMethod] ?? "1";
  const endLoad = loadMethodMap[request.dropoffMethod] ?? "1";

  const startDetail = [request.pickupAddress, request.pickupAddressDetail].filter(Boolean).join(" ");
  const endDetail = [request.dropoffAddress, request.dropoffAddressDetail].filter(Boolean).join(" ");

  return {
    // TODO: 아래 시도/구군/동은 주소 파싱 로직 구현 후 교체
    startWide: "",      // TODO: pickupAddress에서 시도 파싱
    startSgg: "",       // TODO: pickupAddress에서 구군 파싱
    startDong: "",      // TODO: pickupAddress에서 동 파싱
    startDetail,        // 전체 주소 (시도/구군/동 파싱 전 임시)

    endWide: "",        // TODO: dropoffAddress에서 시도 파싱
    endSgg: "",         // TODO: dropoffAddress에서 구군 파싱
    endDong: "",        // TODO: dropoffAddress에서 동 파싱
    endDetail,

    multiCargoGub: request.requestType === "DIRECT" ? "Y" : "N", // TODO: 코드값 확인
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

    firstType: "1",   // TODO: 화주 유형 코드값 확인
    firstShipperNm: request.targetCompanyName ?? "",
    firstShipperInfo: [
      request.targetCompanyContactName,
      request.targetCompanyContactPhone,
    ].filter(Boolean).join(" "),
    firstShipperBizNo: "",    // TODO: 사업자번호 정보 없음
    taxbillType: "1",         // TODO: 코드값 확인
    payPlanYmd: "",           // TODO: 지급 예정일 없음
    ddID: "",                 // TODO: 담당 ID 없음
  };
}

// ── 화물 등록 ─────────────────────────────────────────────
// POST /api/order/addOrder
// 성공 시 ordNo 반환
interface Call24AddOrderResponse {
  result: number | string;
  ordNo?: string;
  message?: string;
}

export async function addCall24Order(payload: Call24AddOrderPayload): Promise<string> {
  const cfg = getCall24Config();
  const response = await call24Post<Call24AddOrderResponse>(
    "/api/order/addOrder",
    payload as unknown as Record<string, unknown>,
    cfg
  );

  // 화물24 응답 예: { "result": 1, "ordNo": "C24-20240101-00001" }
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
// POST /api/order/cjLocation
// 응답: { lng, lat, addr, upDt }
export interface Call24LocationResponse {
  result?: number | string;
  lng?: string | number;
  lat?: string | number;
  addr?: string;
  upDt?: string;
}

export async function getCall24Location(ordNo: string): Promise<Call24LocationResponse> {
  const cfg = getCall24Config();
  return call24Post<Call24LocationResponse>(
    "/api/order/cjLocation",
    { ordNo },
    cfg
  );
}

// ── 오더 조회 ─────────────────────────────────────────────
// POST /api/order/getOrder
export async function getCall24Order(ordNo: string): Promise<Record<string, unknown>> {
  const cfg = getCall24Config();
  return call24Post<Record<string, unknown>>(
    "/api/order/getOrder",
    { ordNo },
    cfg
  );
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

    return { ordNo };
  } catch (err: any) {
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

  return {
    lat,
    lon,
    addr: locationData.addr ?? null,
    updatedAt: now.toISOString(),
  };
}
