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
import { getAddressRegion, getFreightAddressRegion } from "./geocoding";
import { mapVehicleBodyTypeToCall24 } from "./vehicleCatalog";

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

export class Call24PayloadValidationError extends Error {
  constructor(message: string, public readonly detail?: Record<string, unknown>) {
    super(message);
    this.name = "Call24PayloadValidationError";
  }
}

export class Call24LocationUnavailableError extends Error {
  constructor(message: string, public readonly detail?: Record<string, unknown>) {
    super(message);
    this.name = "Call24LocationUnavailableError";
  }
}

// ── credentials 검증 ───────────────────────────────────────
function getCall24Config() {
  const {
    CALL24_BASE_URL,
    CALL24_API_KEY,
    CALL24_AES_KEY,
    CALL24_AES_IV,
    CALL24_ADDR_API_PATH,
  } = env;
  const missing: string[] = [];
  if (!CALL24_BASE_URL) missing.push("CALL24_BASE_URL");
  if (!CALL24_API_KEY) missing.push("CALL24_API_KEY");
  if (!CALL24_AES_KEY) missing.push("CALL24_AES_KEY");
  if (!CALL24_AES_IV) missing.push("CALL24_AES_IV");
  if (missing.length > 0) {
    throw new IntegrationNotConfiguredError("화물24", missing);
  }
  if (!/^https:\/\/api\.15887924\.com:1809(?:1|9)$/.test(CALL24_BASE_URL!)) {
    throw new IntegrationNotConfiguredError("화물24", [
      "CALL24_BASE_URL (테스트: https://api.15887924.com:18091 / 운영: https://api.15887924.com:18099)",
    ]);
  }
  return {
    baseUrl: CALL24_BASE_URL!,
    apiKey: CALL24_API_KEY!,
    aesKey: CALL24_AES_KEY!,
    aesIv: CALL24_AES_IV!,
    addrApiPath: CALL24_ADDR_API_PATH || "/api/order/addr",
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
  cfg: ReturnType<typeof getCall24Config>,
  options?: {
    transport?: "encrypted" | "plain";
    debugLabel?: string;
    logDecryptedRaw?: boolean;
  }
): Promise<T> {
  const transport = options?.transport ?? "encrypted";
  const debugLabel = options?.debugLabel ?? endpoint;
  const url = `${cfg.baseUrl}${endpoint}`;
  const payload =
    transport === "encrypted"
      ? { data: encryptAesCbc(JSON.stringify(body), cfg.aesKey, cfg.aesIv) }
      : body;

  console.log("[화물24][request]", {
    label: debugLabel,
    transport,
    url,
    body,
    headers: {
      "Content-Type": "application/json",
      "call24-api-key": `${cfg.apiKey.slice(0, 4)}***`,
    },
  });

  let res;
  try {
    res = await axios.post(url, payload, {
      headers: {
        "Content-Type": "application/json",
        "call24-api-key": cfg.apiKey,
      },
      timeout: 15_000,
    });
  } catch (error: any) {
    console.error("[화물24][response-error]", {
      label: debugLabel,
      transport,
      url,
      status: error?.response?.status,
      raw: error?.response?.data,
      message: error?.message,
    });
    throw error;
  }

  console.log("[화물24][response]", {
    label: debugLabel,
    transport,
    url,
    status: res.status,
    raw: res.data,
  });

  let responseData: T;
  if (transport === "plain") {
    responseData = res.data as T;
  } else if (typeof res.data === "string") {
    try {
      const decrypted = decryptAesCbc(res.data, cfg.aesKey, cfg.aesIv);
      if (options?.logDecryptedRaw) {
        console.log("[화물24][decrypted-response]", {
          label: debugLabel,
          transport,
          rawDecrypted: decrypted,
        });
      }
      responseData = JSON.parse(decrypted) as T;
    } catch {
      responseData = res.data as unknown as T;
    }
  } else if (res.data?.data && typeof res.data.data === "string") {
    try {
      const decrypted = decryptAesCbc(res.data.data, cfg.aesKey, cfg.aesIv);
      if (options?.logDecryptedRaw) {
        console.log("[화물24][decrypted-response]", {
          label: debugLabel,
          transport,
          rawDecrypted: decrypted,
        });
      }
      responseData = JSON.parse(decrypted) as T;
    } catch {
      responseData = res.data as T;
    }
  } else {
    responseData = res.data as T;
  }

  return responseData;
}

type Call24CommonResponse = {
  result?: number | string;
  code?: number | string;
  message?: string;
  data?: unknown;
  userVal?: unknown;
};

type Call24AddrStage = "wide" | "sgg" | "dong";

type Call24AddrOption = {
  label: string;
  raw: unknown;
};

type Call24ResolvedAddress = {
  wide: string;
  sgg: string;
  dong: string;
  detail: string;
  parsed: ParsedAddress;
  freight: Awaited<ReturnType<typeof getFreightAddressRegion>>;
  candidates: {
    wide: string[];
    sgg: string[];
    dong: string[];
  };
};

const CALL24_ADDR_VALUE_KEYS = [
  "nm",
  "value",
  "label",
  "name",
  "text",
  "addr",
  "addrNm",
  "addrName",
  "codeNm",
  "wide",
  "sido",
  "siDo",
  "sgg",
  "sigungu",
  "gugun",
  "dong",
  "dongNm",
  "emd",
  "emdNm",
] as const;

function isCall24SuccessCode(code: unknown): boolean {
  return code === 1 || code === "1" || code === 0 || code === "0" || code === "SUCCESS";
}

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value))
    )
  );
}

function normalizeAddrMatchToken(value: string): string {
  return value.replace(/\s+/g, "").trim();
}

function pushCall24AddrOption(
  target: Call24AddrOption[],
  value: string,
  raw: unknown,
  seen: Set<string>
): void {
  const label = value.trim();
  if (!label) return;
  const key = normalizeAddrMatchToken(label);
  if (!key || seen.has(key)) return;
  seen.add(key);
  target.push({ label, raw });
}

function extractCall24AddrOptions(node: unknown): Call24AddrOption[] {
  const results: Call24AddrOption[] = [];
  const seen = new Set<string>();

  const visit = (value: unknown): void => {
    if (!value) return;

    if (typeof value === "string") {
      pushCall24AddrOption(results, value, value, seen);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (typeof value !== "object") return;

    const record = value as Record<string, unknown>;
    for (const key of CALL24_ADDR_VALUE_KEYS) {
      const candidate = record[key];
      if (typeof candidate === "string") {
        pushCall24AddrOption(results, candidate, record, seen);
      }
    }

    Object.values(record).forEach((child) => {
      if (Array.isArray(child) || (child && typeof child === "object")) {
        visit(child);
      }
    });
  };

  visit(node);
  return results;
}

function extractCall24AddrPayload(response: unknown): {
  responseCode: unknown;
  message: unknown;
  dataNode: unknown;
} {
  if (Array.isArray(response)) {
    return {
      responseCode: 1,
      message: "",
      dataNode: response,
    };
  }

  if (!response || typeof response !== "object") {
    return {
      responseCode: undefined,
      message: undefined,
      dataNode: response,
    };
  }

  const record = response as Record<string, unknown>;

  if (Array.isArray(record.data)) {
    return {
      responseCode: record.code ?? record.result,
      message: record.message,
      dataNode: record.data,
    };
  }

  if (Array.isArray(record.result)) {
    return {
      responseCode: record.code ?? 1,
      message: record.message,
      dataNode: record.result,
    };
  }

  if (Array.isArray(record.list)) {
    return {
      responseCode: record.code ?? record.result,
      message: record.message,
      dataNode: record.list,
    };
  }

  if (Array.isArray(record.userVal)) {
    return {
      responseCode: record.code ?? record.result,
      message: record.message,
      dataNode: record.userVal,
    };
  }

  return {
    responseCode: record.code ?? record.result,
    message: record.message,
    dataNode: record.data ?? record.result ?? record.list ?? response,
  };
}

function buildCall24AddrApiBodies(
  stage: Call24AddrStage,
  filters: { wide?: string; sgg?: string }
): Array<Record<string, unknown>> {
  if (stage === "wide") {
    return [{}];
  }

  if (stage === "sgg") {
    return [
      { sido: filters.wide },
      { siDo: filters.wide },
      { wide: filters.wide },
    ];
  }

  return [
    { sido: filters.wide, gugun: filters.sgg },
    { siDo: filters.wide, gugun: filters.sgg },
    { gugun: filters.sgg },
    { sgg: filters.sgg },
  ];
}

async function fetchCall24AddrOptions(
  stage: Call24AddrStage,
  filters: { wide?: string; sgg?: string },
  cfg: ReturnType<typeof getCall24Config>
): Promise<Call24AddrOption[]> {
  if (!cfg.addrApiPath) {
    throw new Call24PayloadValidationError(
      "화물24 addr API 경로(CALL24_ADDR_API_PATH)가 설정되지 않았습니다.",
      { field: "CALL24_ADDR_API_PATH" }
    );
  }

  const attempts = buildCall24AddrApiBodies(stage, filters);
  const attemptLogs: unknown[] = [];

  for (const body of attempts) {
    for (const transport of ["encrypted", "plain"] as const) {
      try {
        const response = await call24Post<unknown>(
          cfg.addrApiPath,
          body,
          cfg,
          {
            transport,
            debugLabel: `addr:${stage}`,
            logDecryptedRaw: transport === "encrypted",
          }
        );

        const addrPayload = extractCall24AddrPayload(response);
        const responseCode = addrPayload.responseCode;
        const options = extractCall24AddrOptions(addrPayload.dataNode);
        const logEntry = {
          body,
          transport,
          responseCode,
          message: addrPayload.message,
          optionCount: options.length,
          rawData: addrPayload.dataNode,
          rawShape: Array.isArray(response) ? "array" : typeof response,
        };
        attemptLogs.push(logEntry);
        console.log("[화물24][addr-api] 조회:", {
          stage,
          ...logEntry,
        });

        if (isCall24SuccessCode(responseCode) && options.length > 0) {
          return options;
        }
      } catch (error: any) {
        const logEntry = {
          body,
          transport,
          status: error?.response?.status,
          error: error?.message ?? "addr api 호출 실패",
          raw: error?.raw ?? error?.response?.data,
        };
        attemptLogs.push(logEntry);
        console.warn("[화물24][addr-api] 조회 실패:", {
          stage,
          ...logEntry,
        });
      }
    }
  }

  throw new Call24PayloadValidationError("화물24 addr API 호출 실패", {
    stage,
    filters,
    attempts: attemptLogs,
  });
}

function matchCall24AddrOption(
  stage: Call24AddrStage,
  options: Call24AddrOption[],
  candidates: string[]
): Call24AddrOption | null {
  const exactNormalized = new Map(
    options.map((option) => [normalizeAddrMatchToken(option.label), option] as const)
  );

  for (const candidate of candidates) {
    const normalized = normalizeAddrMatchToken(candidate);
    if (!normalized) continue;
    const matched = exactNormalized.get(normalized);
    if (matched) return matched;
  }

  if (stage === "sgg") {
    for (const candidate of candidates) {
      const normalized = normalizeAddrMatchToken(normalizeCall24Sgg(candidate));
      const matched = exactNormalized.get(normalized);
      if (matched) return matched;
    }
  }

  return null;
}

function buildWideCandidates(
  parsed: ParsedAddress,
  freight: Awaited<ReturnType<typeof getFreightAddressRegion>>
): string[] {
  return uniqueNonEmpty([
    freight?.wide,
    parsed.wide,
    freight?.wide ? SIDO_TO_CALL24[freight.wide] : undefined,
    parsed.wide ? SIDO_TO_CALL24[parsed.wide] : undefined,
  ]);
}

function buildSggCandidates(
  wide: string,
  parsed: ParsedAddress,
  freight: Awaited<ReturnType<typeof getFreightAddressRegion>>
): string[] {
  const raw = uniqueNonEmpty([freight?.sgg, parsed.sgg]);
  return uniqueNonEmpty(
    raw.flatMap((value) => [
      value,
      normalizeCall24SggForLegacy(wide, value),
      normalizeCall24Sgg(value),
    ])
  );
}

function buildDongCandidates(
  fullAddress: string,
  parsed: ParsedAddress,
  freight: Awaited<ReturnType<typeof getFreightAddressRegion>>
): string[] {
  return uniqueNonEmpty([
    freight?.dong,
    parsed.dong,
    extractAdministrativeDongFromParentheses(fullAddress),
  ]);
}

async function resolveCall24AllowedAddress(
  fullAddress: string,
  placeName: string | null | undefined,
  cfg: ReturnType<typeof getCall24Config>
): Promise<Call24ResolvedAddress> {
  const [parsed, freight] = await Promise.all([
    resolveKoreanAddress(fullAddress),
    getFreightAddressRegion(fullAddress),
  ]);

  const wideCandidates = buildWideCandidates(parsed, freight);
  const wideOptions = await fetchCall24AddrOptions("wide", {}, cfg);
  const matchedWide = matchCall24AddrOption("wide", wideOptions, wideCandidates);
  if (!matchedWide) {
    throw new Call24PayloadValidationError("화물24 허용 주소값 매칭 실패", {
      stage: "wide",
      address: fullAddress,
      candidates: wideCandidates,
      options: wideOptions.map((option) => option.label),
    });
  }

  const sggCandidates = buildSggCandidates(matchedWide.label, parsed, freight);
  const sggOptions = await fetchCall24AddrOptions("sgg", { wide: matchedWide.label }, cfg);
  const matchedSgg = matchCall24AddrOption("sgg", sggOptions, sggCandidates);
  if (!matchedSgg) {
    throw new Call24PayloadValidationError("화물24 허용 주소값 매칭 실패", {
      stage: "sgg",
      address: fullAddress,
      wide: matchedWide.label,
      candidates: sggCandidates,
      options: sggOptions.map((option) => option.label),
    });
  }

  const dongCandidates = buildDongCandidates(fullAddress, parsed, freight);
  const dongOptions = await fetchCall24AddrOptions(
    "dong",
    { wide: matchedWide.label, sgg: matchedSgg.label },
    cfg
  );
  const matchedDong = matchCall24AddrOption("dong", dongOptions, dongCandidates);
  if (!matchedDong) {
    throw new Call24PayloadValidationError("화물24 허용 주소값 매칭 실패", {
      stage: "dong",
      address: fullAddress,
      wide: matchedWide.label,
      sgg: matchedSgg.label,
      candidates: dongCandidates,
      options: dongOptions.map((option) => option.label),
    });
  }

  const detail = sanitizeCall24Detail(
    freight?.jibunDetail ||
      freight?.roadDetail ||
      parsed.detail ||
      fullAddress,
    placeName
  );

  console.log("[화물24][addr-api] 최종 주소 확정:", {
    address: fullAddress,
    candidates: {
      wide: wideCandidates,
      sgg: sggCandidates,
      dong: dongCandidates,
    },
    resolved: {
      wide: matchedWide.label,
      sgg: matchedSgg.label,
      dong: matchedDong.label,
      detail,
    },
  });

  return {
    wide: matchedWide.label,
    sgg: matchedSgg.label,
    dong: matchedDong.label,
    detail,
    parsed,
    freight,
    candidates: {
      wide: wideCandidates,
      sgg: sggCandidates,
      dong: dongCandidates,
    },
  };
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
  wide: string;          // 시/도
  sgg: string;           // 시/군/구
  dong: string;          // 읍/면/동 (도로명주소일 땐 sgg fallback)
  detail: string;        // 상세주소 (번지, 층수 등)
  isRoadAddress: boolean; // 도로명주소 여부 (dong이 실제 행정동이 아님)
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

// 시도 약칭 → 정식명 정규화 (주소 파싱용 — 내부 통일 포맷)
const SIDO_NORMALIZE: Record<string, string> = {
  "서울": "서울특별시",
  "부산": "부산광역시",
  "대구": "대구광역시",
  "인천": "인천광역시",
  "광주": "광주광역시",
  "대전": "대전광역시",
  "울산": "울산광역시",
  "세종": "세종특별자치시",
  "경기": "경기도",
  "강원": "강원특별자치도",
  "충북": "충청북도",
  "충남": "충청남도",
  "전북": "전북특별자치도",
  "전남": "전라남도",
  "경북": "경상북도",
  "경남": "경상남도",
  "제주": "제주특별자치도",
};

// 정식명 → 화물24 시도 약칭 (addr API 응답 기준 — "인천광역시" → "인천" 등)
const SIDO_TO_CALL24: Record<string, string> = {
  "서울특별시": "서울",
  "부산광역시": "부산",
  "대구광역시": "대구",
  "인천광역시": "인천",
  "광주광역시": "광주",
  "대전광역시": "대전",
  "울산광역시": "울산",
  "세종특별자치시": "세종",
  "경기도": "경기",
  "강원특별자치도": "강원",
  "강원도": "강원",
  "충청북도": "충북",
  "충청남도": "충남",
  "전북특별자치도": "전북",
  "전라북도": "전북",
  "전라남도": "전남",
  "경상북도": "경북",
  "경상남도": "경남",
  "제주특별자치도": "제주",
  "제주도": "제주",
  // 이미 짧은 형식은 그대로 통과
  "서울": "서울", "부산": "부산", "대구": "대구", "인천": "인천",
  "광주": "광주", "대전": "대전", "울산": "울산", "세종": "세종",
  "경기": "경기", "강원": "강원", "충북": "충북", "충남": "충남",
  "전북": "전북", "전남": "전남", "경북": "경북", "경남": "경남", "제주": "제주",
};

const CALL24_ALLOWED_WIDE = new Set(Object.values(SIDO_TO_CALL24));

// 도로명 여부 판단 (로/길/대로/순환로 등으로 끝나는 토큰)
function isRoadName(token: string): boolean {
  return /(?:대로|로|길|순환로|터널로|고속도로)$/.test(token);
}

function isAdministrativeDong(token: string): boolean {
  return /(?:읍|면|동|리|가)$/.test(token);
}

function normalizeCall24SggForLegacy(wide: string, sgg: string): string {
  const wideShort = SIDO_TO_CALL24[wide] ?? wide;
  if (wideShort === "인천" && sgg === "미추홀구") {
    // 화물24 구주소/행정구역 데이터 호환: 인천 미추홀구 -> 남구
    return "남구";
  }
  return sgg;
}

function sanitizeCall24Detail(detail: string, placeName?: string | null): string {
  let normalized = detail
    .replace(/\([^)]*\)/g, " ")
    .replace(/,/g, " ")
    .trim()
    .replace(/\s+/g, " ");

  if (placeName?.trim()) {
    const escaped = placeName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    normalized = normalized.replace(new RegExp(`(?:^|\\s)${escaped}(?=$|\\s)`, "g"), " ").trim();
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);
  const filteredTokens = tokens.filter((token, index) => {
    if (index === 0) return true;
    if (/\d/.test(token)) return true;
    if (/(?:번지|층|호|동|리|가)$/.test(token)) return true;
    if (/(?:역|공항|항|부두|터미널|정류장|매장|사옥|센터|빌딩)$/.test(token)) return false;
    if (/^[가-힣A-Za-z]+$/.test(token)) return false;
    return true;
  });

  return filteredTokens.join(" ").trim();
}

function extractAdministrativeDongFromParentheses(fullAddress: string): string {
  const matches = [...fullAddress.matchAll(/\(([^)]*)\)/g)];
  for (const match of matches) {
    const tokens = match[1]
      .split(/[,\s/]+/)
      .map((token) => token.trim())
      .filter(Boolean);
    const found = tokens.find((token) => isAdministrativeDong(token));
    if (found) return found;
  }
  return "";
}

// 화물24 sgg 정규화: 구/시/군 suffix 제거 ("남동구" → "남동", "강남구" → "강남")
// 단, 결과가 1글자가 되는 경우(중구→중)는 원본 유지
export function normalizeCall24Sgg(sgg: string): string {
  if (sgg.length > 2 && /[구시군]$/.test(sgg)) {
    return sgg.slice(0, -1);
  }
  return sgg;
}

export function parseKoreanAddress(fullAddress: string): ParsedAddress {
  const addr = fullAddress.trim();
  const tokens = addr.split(/\s+/);

  if (tokens.length === 0) {
    return { wide: "", sgg: "", dong: "", detail: "", isRoadAddress: false };
  }

  // 시도 추출
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
    return { wide: "", sgg: "", dong: "", detail: addr, isRoadAddress: false };
  }

  const normalizedWide = SIDO_NORMALIZE[wide] ?? wide;
  const rest = tokens.slice(wideIdx + 1);
  const sgg = rest[0] ?? "";
  const candidateDong = rest[1] ?? "";

  // 도로명주소인 경우: dong 자리에 도로명이 오면 dong을 비우고 detail에 전체 주소 사용
  // 화물24는 startDong에 행정동(읍/면/동)만 허용 — 도로명 불가
  if (isRoadName(candidateDong)) {
    const dongFromHint = extractAdministrativeDongFromParentheses(addr);
    // 도로명주소: 행정동은 외부 geocoder로 보완해야 하므로 우선 비워둔다.
    return {
      wide: normalizedWide,
      sgg,
      dong: dongFromHint,
      detail: rest.slice(1).join(" "), // "소래역남로 10" (wide/sgg 제외)
      isRoadAddress: !dongFromHint,
    };
  }

  // 지번주소 또는 행정동이 명확한 경우
  const dong = candidateDong;
  const detail = rest.slice(2).join(" ");

  return { wide: normalizedWide, sgg, dong, detail, isRoadAddress: false };
}

// ── 주소 분해 (행정동 보강) ────────────────────────────────
// 도로명주소처럼 dong 자리에 행정동이 없을 때 외부 geocoder로 행정동을 보완한다.
export async function resolveKoreanAddress(fullAddress: string): Promise<ParsedAddress> {
  const parsed = parseKoreanAddress(fullAddress);

  // 도로명주소이거나 dong이 비어 있으면 실제 행정동 조회 시도
  if (parsed.isRoadAddress || !parsed.dong) {
    const region = await getAddressRegion(fullAddress);
    if (region?.dong) {
      const wide = region.wide
        ? (SIDO_NORMALIZE[region.wide] ?? region.wide)
        : parsed.wide;
      console.log(`[주소 분해] 행정동 보완: "${fullAddress}" → dong="${region.dong}"`);
      return {
        wide: wide || parsed.wide,
        sgg: region.sgg || parsed.sgg,
        dong: region.dong,
        detail: parsed.detail || fullAddress,
        isRoadAddress: false,
      };
    }
    console.warn(`[주소 분해] 행정동 조회 실패, fallback 유지: "${fullAddress}"`);
  }

  return parsed;
}

// ── payload 주소 필드 validation ──────────────────────────
export class Call24AddressValidationError extends Error {
  constructor(message: string, public readonly detail?: Record<string, unknown>) {
    super(message);
    this.name = "Call24AddressValidationError";
  }
}

function validateCall24Address(payload: Call24AddOrderPayload): void {
  const requiredFields: Array<[keyof Call24AddOrderPayload, string]> = [
    ["startWide", "상차지 시/도(startWide)"],
    ["startSgg", "상차지 시/군/구(startSgg)"],
    ["startDong", "상차지 읍/면/동(startDong)"],
    ["startDetail", "상차지 상세주소(startDetail)"],
    ["endWide", "하차지 시/도(endWide)"],
    ["endSgg", "하차지 시/군/구(endSgg)"],
    ["endDong", "하차지 읍/면/동(endDong)"],
    ["endDetail", "하차지 상세주소(endDetail)"],
  ];

  const missing: string[] = [];
  for (const [field, label] of requiredFields) {
    if (!String(payload[field] ?? "").trim()) {
      missing.push(label);
    }
  }

  if (missing.length > 0) {
    throw new Call24AddressValidationError(
      `화물24 주소 필수 필드가 비어 있어 등록할 수 없습니다: ${missing.join(", ")}`,
      { missingFields: missing }
    );
  }

  if (!CALL24_ALLOWED_WIDE.has(payload.startWide)) {
    throw new Call24AddressValidationError("화물24 상차지 시/도 형식이 올바르지 않습니다.", {
      field: "startWide",
      value: payload.startWide,
    });
  }
  if (!CALL24_ALLOWED_WIDE.has(payload.endWide)) {
    throw new Call24AddressValidationError("화물24 하차지 시/도 형식이 올바르지 않습니다.", {
      field: "endWide",
      value: payload.endWide,
    });
  }

  if (isRoadName(payload.startDong) || !isAdministrativeDong(payload.startDong)) {
    throw new Call24AddressValidationError("화물24 상차지 읍/면/동 값이 올바르지 않습니다.", {
      field: "startDong",
      value: payload.startDong,
    });
  }

  if (isRoadName(payload.endDong) || !isAdministrativeDong(payload.endDong)) {
    throw new Call24AddressValidationError("화물24 하차지 읍/면/동 값이 올바르지 않습니다.", {
      field: "endDong",
      value: payload.endDong,
    });
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
function formatCall24Ymd(dt: Date): string {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dt);

  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}${pick("month")}${pick("day")}`;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function formatCall24Tonnage(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "";
  return Number.isInteger(value) ? String(value) : String(value);
}

function normalizePhoneForCall24(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

function validateCall24DateTime(payload: Call24AddOrderPayload): void {
  const re = /^\d{8}$/;
  if (!re.test(payload.startPlanDt)) {
    throw new Call24PayloadValidationError("화물24 상차일 형식이 올바르지 않습니다.", {
      field: "startPlanDt",
      value: payload.startPlanDt,
      expectedFormat: "YYYYMMDD",
    });
  }
  if (!re.test(payload.endPlanDt)) {
    throw new Call24PayloadValidationError("화물24 하차일 형식이 올바르지 않습니다.", {
      field: "endPlanDt",
      value: payload.endPlanDt,
      expectedFormat: "YYYYMMDD",
    });
  }

  const minAllowed = formatCall24Ymd(new Date());
  if (payload.startPlanDt < minAllowed) {
    throw new Call24PayloadValidationError("화물24 상차일은 KST 기준 오늘 이후여야 합니다.", {
      field: "startPlanDt",
      value: payload.startPlanDt,
      minAllowed,
    });
  }
  if (payload.endPlanDt < payload.startPlanDt) {
    throw new Call24PayloadValidationError("화물24 하차일은 상차일보다 빠를 수 없습니다.", {
      startPlanDt: payload.startPlanDt,
      endPlanDt: payload.endPlanDt,
    });
  }
}

function validateCall24Vehicle(payload: Call24AddOrderPayload): void {
  if (!payload.truckType.trim()) {
    throw new Call24PayloadValidationError("화물24 차량종류(truckType)가 비어 있습니다.", {
      field: "truckType",
    });
  }

  if (!payload.cargoTon.trim()) {
    throw new Call24PayloadValidationError("화물24 차량톤수(cargoTon)가 비어 있습니다.", {
      field: "cargoTon",
    });
  }

  if (!/^\d+(?:\.\d+)?$/.test(payload.frgton)) {
    throw new Call24PayloadValidationError("화물24 화물톤수(frgton) 형식이 올바르지 않습니다.", {
      field: "frgton",
      value: payload.frgton,
    });
  }

  const cargoTonNumeric = Number(payload.cargoTon.replace(/[^\d.]/g, ""));
  const frgtonNumeric = Number(payload.frgton);
  if (!Number.isFinite(cargoTonNumeric) || !Number.isFinite(frgtonNumeric)) {
    throw new Call24PayloadValidationError("화물24 톤수(cargoTon/frgton) 형식이 올바르지 않습니다.", {
      cargoTon: payload.cargoTon,
      frgton: payload.frgton,
    });
  }
  if (frgtonNumeric > cargoTonNumeric * 1.1) {
    throw new Call24PayloadValidationError("화물24 화물톤수(frgton)는 차량톤수의 110%를 초과할 수 없습니다.", {
      cargoTon: payload.cargoTon,
      frgton: payload.frgton,
      maxAllowed: Number((cargoTonNumeric * 1.1).toFixed(2)),
    });
  }

  if (!["지게차", "수작업", "크레인", "호이스트", "컨베이어", "기타"].includes(payload.startLoad)) {
    throw new Call24PayloadValidationError("화물24 상차 방식(startLoad)이 올바르지 않습니다.", {
      field: "startLoad",
      value: payload.startLoad,
    });
  }
  if (!["지게차", "수작업", "크레인", "호이스트", "컨베이어", "기타"].includes(payload.endLoad)) {
    throw new Call24PayloadValidationError("화물24 하차 방식(endLoad)이 올바르지 않습니다.", {
      field: "endLoad",
      value: payload.endLoad,
    });
  }
}

function validateCall24FareAndPayment(payload: Call24AddOrderPayload): void {
  if (!["선불", "착불", "선착불", "인수증", "카드"].includes(payload.farePaytype)) {
    throw new Call24PayloadValidationError("화물24 운임 결제방식(farePaytype)이 올바르지 않습니다.", {
      field: "farePaytype",
      value: payload.farePaytype,
    });
  }

  if (!Number.isFinite(payload.fare) || payload.fare <= 0) {
    throw new Call24PayloadValidationError("화물24 운임(fare)은 0보다 커야 합니다.", {
      field: "fare",
      value: payload.fare,
    });
  }

  if (!Number.isFinite(payload.fee) || payload.fee < 0) {
    throw new Call24PayloadValidationError("화물24 수수료(fee) 형식이 올바르지 않습니다.", {
      field: "fee",
      value: payload.fee,
    });
  }

  if (!["1", "2", "3"].includes(payload.taxbillType)) {
    throw new Call24PayloadValidationError("화물24 세금계산서 유형(taxbillType)이 올바르지 않습니다.", {
      field: "taxbillType",
      value: payload.taxbillType,
    });
  }
}

function validateCall24Contacts(payload: Call24AddOrderPayload): void {
  if (!/^\d{9,11}$/.test(payload.endAreaPhone)) {
    throw new Call24PayloadValidationError("화물24 하차지 연락처 형식이 올바르지 않습니다.", {
      field: "endAreaPhone",
      value: payload.endAreaPhone,
    });
  }
  if (!payload.firstShipperNm.trim()) {
    throw new Call24PayloadValidationError("화물24 화주명(firstShipperNm)이 비어 있습니다.", {
      field: "firstShipperNm",
    });
  }
  if (!/^\d{9,11}$/.test(payload.firstShipperInfo)) {
    throw new Call24PayloadValidationError("화물24 의뢰자 연락처(firstShipperInfo) 형식이 올바르지 않습니다.", {
      field: "firstShipperInfo",
      value: payload.firstShipperInfo,
    });
  }
}

function validateCall24Payload(payload: Call24AddOrderPayload): void {
  validateCall24Address(payload);
  validateCall24DateTime(payload);
  validateCall24Vehicle(payload);
  validateCall24FareAndPayment(payload);
  validateCall24Contacts(payload);
}

// ── 우리 Request → 화물24 payload 매핑 ────────────────────
export async function mapRequestToCall24Payload(request: PrismaRequest): Promise<Call24AddOrderPayload> {
  const cfg = getCall24Config();
  const immediateBase = addMinutes(new Date(), 10);

  const startDt = request.pickupIsImmediate
    ? immediateBase
    : request.pickupDatetime
    ? new Date(request.pickupDatetime)
    : immediateBase;

  const endDt = request.dropoffIsImmediate
    ? addMinutes(startDt, 60)
    : request.dropoffDatetime
    ? new Date(request.dropoffDatetime)
    : addMinutes(startDt, 60);

  const faretypeMap: Record<string, string> = {
    CREDIT: "인수증",
    CARD: "카드",
    CASH_PREPAID: "선불",
    CASH_COLLECT: "착불",
  };
  const farePaytype = request.paymentMethod ? (faretypeMap[request.paymentMethod] ?? "선착불") : "선착불";

  const loadMethodMap: Record<string, string> = {
    FORKLIFT: "지게차",
    MANUAL: "수작업",
    SUDOU_SUHAEJUNG: "수작업",
    HOIST: "호이스트",
    CRANE: "크레인",
    CONVEYOR: "컨베이어",
  };
  const startLoad = loadMethodMap[request.pickupMethod] ?? "기타";
  const endLoad = loadMethodMap[request.dropoffMethod] ?? "기타";

  const [startResolved, endResolved] = await Promise.all([
    resolveCall24AllowedAddress(
      request.pickupAddress ?? "",
      request.pickupPlaceName,
      cfg
    ),
    resolveCall24AllowedAddress(
      request.dropoffAddress ?? "",
      request.dropoffPlaceName,
      cfg
    ),
  ]);
  const startWide = SIDO_TO_CALL24[startResolved.wide] ?? startResolved.wide;
  const endWide = SIDO_TO_CALL24[endResolved.wide] ?? endResolved.wide;
  const startSgg = startResolved.sgg;
  const endSgg = endResolved.sgg;
  const startDong = startResolved.dong;
  const endDong = endResolved.dong;
  const startDetail = startResolved.detail;
  const endDetail = endResolved.detail;
  const normalizedEndDt = endDt <= startDt ? addMinutes(startDt, 60) : endDt;
  const endAreaPhone = normalizePhoneForCall24(request.dropoffContactPhone);
  const shipperPhone = normalizePhoneForCall24(request.targetCompanyContactPhone);
  const cargoTon = formatCall24Tonnage(request.vehicleTonnage);
  const frgton = formatCall24Tonnage(request.vehicleTonnage);

  const payload: Call24AddOrderPayload = {
    startWide,
    startSgg,
    startDong,
    startDetail,

    endWide,
    endSgg,
    endDong,
    endDetail,

    multiCargoGub: request.requestType === "DIRECT" ? "Y" : "N",
    urgent: request.requestType === "URGENT" ? "Y" : "N",
    shuttleCargoInfo: request.requestType === "ROUND_TRIP" ? "Y" : "N",

    cargoTon,
    truckType: mapVehicleBodyTypeToCall24(request.vehicleBodyType),
    frgton,

    startPlanDt: formatCall24Ymd(startDt),
    endPlanDt: formatCall24Ymd(normalizedEndDt),

    startLoad,
    endLoad,

    cargoDsc: [request.cargoDescription, request.driverNote].filter(Boolean).join(" | ") || "-",

    farePaytype,
    fare: request.quotedPrice ?? request.actualFare ?? 0,
    fee: 0,

    endAreaPhone,

    firstType: "1",
    firstShipperNm: request.targetCompanyName ?? "",
    firstShipperInfo: shipperPhone,
    firstShipperBizNo: "",
    taxbillType: "1",
    payPlanYmd: "",
    ddID: "",
  };

  // 디버그 로그
  console.log("[화물24] 주소 분해 결과:", {
    pickup: {
      raw: request.pickupAddress,
      ...startResolved.parsed,
      freight: startResolved.freight,
      candidates: startResolved.candidates,
      final: { wide: startWide, sgg: startSgg, dong: startDong, detail: startDetail },
    },
    dropoff: {
      raw: request.dropoffAddress,
      ...endResolved.parsed,
      freight: endResolved.freight,
      candidates: endResolved.candidates,
      final: { wide: endWide, sgg: endSgg, dong: endDong, detail: endDetail },
    },
  });
  console.log("[화물24] payload 요약:", {
    requestId: request.id,
    start: {
      wide: payload.startWide,
      sgg: payload.startSgg,
      dong: payload.startDong,
      detail: payload.startDetail,
      planDt: payload.startPlanDt,
    },
    end: {
      wide: payload.endWide,
      sgg: payload.endSgg,
      dong: payload.endDong,
      detail: payload.endDetail,
      planDt: payload.endPlanDt,
    },
    vehicle: {
      cargoTon: payload.cargoTon,
      frgton: payload.frgton,
      truckType: payload.truckType,
      startLoad: payload.startLoad,
      endLoad: payload.endLoad,
    },
    fare: {
      farePaytype: payload.farePaytype,
      fare: payload.fare,
      taxbillType: payload.taxbillType,
    },
    shipper: {
      firstShipperNm: payload.firstShipperNm,
      firstShipperInfo: payload.firstShipperInfo,
      endAreaPhone: payload.endAreaPhone,
    },
  });

  return payload;
}

// ── 화물 등록 ─────────────────────────────────────────────
interface Call24AddOrderResponse {
  result?: number | string;
  code?: number | string;
  ordNo?: string;
  message?: string;
  data?: unknown;
  userVal?: unknown;
}

export async function addCall24Order(payload: Call24AddOrderPayload): Promise<string> {
  try {
    validateCall24Payload(payload);
  } catch (error) {
    console.error("[화물24] 전송 전 validation 실패:", error);
    throw error;
  }

  const cfg = getCall24Config();
  const response = await call24Post<Call24AddOrderResponse>(
    "/api/order/addOrder",
    payload as unknown as Record<string, unknown>,
    cfg
  );

  const responseCode = response.code ?? response.result;
  const isSuccess =
    responseCode === 1 ||
    responseCode === "1" ||
    responseCode === "SUCCESS" ||
    Boolean(response.ordNo);
  if (!isSuccess) {
    console.error("[화물24] API raw response:", JSON.stringify(response));
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
  code?: number | string;
  message?: string;
  data?: unknown;
  userVal?: unknown;
  lng?: string | number;
  lat?: string | number;
  addr?: string;
  upDt?: string;
}

export async function getCall24Location(ordNo: string): Promise<Call24LocationResponse> {
  const cfg = getCall24Config();
  return call24Post<Call24LocationResponse>("/api/order/cjLocation", { ordNo }, cfg);
}

function pickCall24LocationValue(
  source: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown {
  if (!source) return undefined;
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
}

function parseCall24UpdatedAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (/^\d{14}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const hh = trimmed.slice(8, 10);
    const mm = trimmed.slice(10, 12);
    const ss = trimmed.slice(12, 14);
    return `${y}-${m}-${d}T${hh}:${mm}:${ss}+09:00`;
  }

  if (/^\d{12}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    const hh = trimmed.slice(8, 10);
    const mm = trimmed.slice(10, 12);
    return `${y}-${m}-${d}T${hh}:${mm}:00+09:00`;
  }

  if (/^\d{8}$/.test(trimmed)) {
    const y = trimmed.slice(0, 4);
    const m = trimmed.slice(4, 6);
    const d = trimmed.slice(6, 8);
    return `${y}-${m}-${d}T00:00:00+09:00`;
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString();
  }

  return null;
}

function normalizeCall24LocationResponse(raw: Call24LocationResponse): {
  lat: number | null;
  lon: number | null;
  addr: string | null;
  updatedAt: string | null;
} {
  const responseCode = raw.code ?? raw.result;
  const topLevelMessage =
    typeof raw.message === "string" && raw.message.trim() ? raw.message.trim() : null;
  const dataNode =
    raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? (raw.data as Record<string, unknown>)
      : null;
  const rootNode = raw as unknown as Record<string, unknown>;

  const lngValue =
    pickCall24LocationValue(dataNode, ["lng", "lon", "longitude", "x"]) ??
    pickCall24LocationValue(rootNode, ["lng", "lon", "longitude", "x"]);
  const latValue =
    pickCall24LocationValue(dataNode, ["lat", "latitude", "y"]) ??
    pickCall24LocationValue(rootNode, ["lat", "latitude", "y"]);
  const addrValue =
    pickCall24LocationValue(dataNode, ["addr", "address", "addrNm"]) ??
    pickCall24LocationValue(rootNode, ["addr", "address", "addrNm"]);
  const upDtValue =
    pickCall24LocationValue(dataNode, ["upDt", "updatedAt", "updateDt", "updDt"]) ??
    pickCall24LocationValue(rootNode, ["upDt", "updatedAt", "updateDt", "updDt"]);

  const lat =
    latValue != null && !Number.isNaN(Number(latValue)) ? Number(latValue) : null;
  const lon =
    lngValue != null && !Number.isNaN(Number(lngValue)) ? Number(lngValue) : null;
  const addr = typeof addrValue === "string" && addrValue.trim() ? addrValue.trim() : null;
  const updatedAt = parseCall24UpdatedAt(upDtValue);

  console.log("[화물24][location] 응답 정규화:", {
    responseCode,
    message: topLevelMessage,
    raw,
    normalized: { lat, lon, addr, updatedAt },
  });

  if (!isCall24SuccessCode(responseCode) && topLevelMessage) {
    throw new Call24ApiError(`화물24 위치 조회 실패: ${topLevelMessage}`, undefined, raw);
  }

  if (lat === null && lon === null && !addr) {
    throw new Call24LocationUnavailableError("화물24 위치정보가 없습니다.", {
      responseCode,
      message: topLevelMessage,
      raw,
    });
  }

  return { lat, lon, addr, updatedAt };
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
    const payload = await mapRequestToCall24Payload(request);
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
    throw new Call24LocationUnavailableError("화물24 등록 정보가 없습니다.", {
      requestId,
      reason: "MISSING_CALL24_ORDER",
    });
  }

  const locationData = await getCall24Location(request.call24OrdNo);
  const normalized = normalizeCall24LocationResponse(locationData);
  const resolvedUpdatedAt = normalized.updatedAt
    ? new Date(normalized.updatedAt)
    : new Date();

  if (normalized.lat !== null && normalized.lon !== null) {
    await prisma.request.update({
      where: { id: requestId },
      data: {
        call24LastLocationLat: normalized.lat,
        call24LastLocationLon: normalized.lon,
        call24LastLocationAt: resolvedUpdatedAt,
      },
    });
  }

  return {
    lat: normalized.lat,
    lon: normalized.lon,
    addr: normalized.addr,
    updatedAt: normalized.updatedAt ?? resolvedUpdatedAt.toISOString(),
  };
}
