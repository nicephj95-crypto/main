// src/services/insungAuth.ts
//
// 인성 consumer-key 기반 인증 helper.
//
// ukey/akey 생성 규칙 (인성 측 문서):
//   - random8 = 영숫자 8자리 (매 요청마다 새로 생성)
//   - ukey   = random8 + consumerKey
//   - akey   = md5(ukey)
//
// 이 파일은 생성 로직만 담당한다. 실제 HTTP 호출은 하지 않는다.
// live 등록은 services/insungIntegrationService.ts에서 처리하며
// INSUNG_ENABLE_LIVE_REGISTER=true일 때만 가능하다.

import { createHash, randomBytes } from "crypto";
import axios from "axios";
import {
  loadInsungConfig,
  type InsungConfig,
} from "../config/insungConfig";

export type InsungAuth = {
  random8: string;
  ukey: string;
  akey: string;
  mCode: string;
  ccCode: string;
  userId: string;
  responseType: string;
};

const RANDOM8_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/**
 * 영숫자 8자리 문자열 생성. crypto.randomBytes 기반.
 */
export function generateRandom8(): string {
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += RANDOM8_ALPHABET[bytes[i] % RANDOM8_ALPHABET.length];
  }
  return out;
}

/**
 * ukey = random8 + consumerKey.
 * consumerKey가 비어있거나 공백이면 throw.
 * random8을 주입받으면 그 값을 사용 (테스트/preview 고정화 용).
 */
export function buildUkey(
  consumerKey: string,
  random8?: string
): { random8: string; ukey: string } {
  const trimmed = typeof consumerKey === "string" ? consumerKey.trim() : "";
  if (!trimmed) {
    throw new Error("[insung] consumerKey가 비어있거나 공백만 포함합니다.");
  }
  const r8 = random8 ?? generateRandom8();
  if (r8.length !== 8) {
    throw new Error(
      `[insung] random8은 정확히 8자여야 합니다. 받은 길이: ${r8.length}`
    );
  }
  return { random8: r8, ukey: `${r8}${trimmed}` };
}

/**
 * akey = md5(ukey) — hex lowercase 32자.
 */
export function buildAkey(ukey: string): string {
  if (!ukey) {
    throw new Error("[insung] ukey가 비어있습니다.");
  }
  return createHash("md5").update(ukey).digest("hex");
}

/**
 * env에서 config를 읽어 (random8, ukey, akey)와 정적 인증값을 묶어 반환.
 * 외부 호출 없음 — 순수 계산.
 */
export function buildInsungAuth(
  config: InsungConfig = loadInsungConfig(),
  opts?: { random8?: string }
): InsungAuth {
  const { random8, ukey } = buildUkey(config.consumerKey, opts?.random8);
  const akey = buildAkey(ukey);
  return {
    random8,
    ukey,
    akey,
    mCode: config.mCode,
    ccCode: config.ccCode,
    userId: config.userId,
    responseType: config.responseType,
  };
}

function maskMiddle(value: string): string {
  if (!value) return "";
  if (value.length <= 8) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)}`;
}

export type InsungAuthPreview = {
  mCode: string;
  ccCode: string;
  userId: string;
  responseType: string;
  random8: string;
  ukey: string;
  ukeyMasked: string;
  akey: string;
  akeyMasked: string;
  liveRegisterEnabled: boolean;
  willCallLiveApi: false;
};

/**
 * 외부 호출 없이 인증 구성만 확인하기 위한 dry-run 프리뷰.
 * ukey/akey는 전체 값과 마스킹 값 둘 다 포함 — 생성 로직 검증 목적.
 *
 * random8을 주입하면 결정적으로 동일 ukey/akey가 나오므로
 * 테스트에서 assertion에 사용 가능.
 */
export function previewInsungAuth(opts?: {
  random8?: string;
  config?: InsungConfig;
}): InsungAuthPreview {
  const config = opts?.config ?? loadInsungConfig();
  const auth = buildInsungAuth(config, { random8: opts?.random8 });
  return {
    mCode: config.mCode,
    ccCode: config.ccCode,
    userId: config.userId,
    responseType: config.responseType,
    random8: auth.random8,
    ukey: auth.ukey,
    ukeyMasked: maskMiddle(auth.ukey),
    akey: auth.akey,
    akeyMasked: maskMiddle(auth.akey),
    liveRegisterEnabled: config.liveRegisterEnabled,
    willCallLiveApi: false,
  };
}

export type InsungOauthVerifyResult = {
  success: boolean;
  code: string;
  msg: string;
  token: string;
  tokenProvided: boolean;
  httpStatus: number;
  request: {
    url: string;
    params: Record<string, string>;
    maskedParams: Record<string, string>;
  };
  raw: unknown;
};

/**
 * 인성 oauth 인증/토큰 확인 전용 호출.
 *
 * GET {base}/api/oauth/?type=...&m_code=...&cc_code=...&ukey=...&akey=...
 *
 * 등록 API(/api/order_regist/)는 절대 호출하지 않는다.
 * liveRegisterEnabled 플래그와 무관하게 항상 동작 — oauth 확인은
 * 운영 등록이 아니라 "인증 조합 유효성 점검"이기 때문.
 */
export async function verifyInsungOauth(opts?: {
  random8?: string;
  config?: InsungConfig;
  timeoutMs?: number;
}): Promise<InsungOauthVerifyResult> {
  const config = opts?.config ?? loadInsungConfig();
  const auth = buildInsungAuth(config, { random8: opts?.random8 });

  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const url = `${baseUrl}/api/oauth/`;

  const params: Record<string, string> = {
    type: config.responseType,
    m_code: config.mCode,
    cc_code: config.ccCode,
    ukey: auth.ukey,
    akey: auth.akey,
  };

  const maskedParams: Record<string, string> = {
    ...params,
    ukey: maskMiddle(auth.ukey),
    akey: maskMiddle(auth.akey),
  };

  const res = await axios.get(url, {
    params,
    timeout: opts?.timeoutMs ?? 10_000,
    validateStatus: () => true,
  });

  // 인성 oauth 응답은 배열로 래핑되어 내려온다: [{ code, msg, token }]
  // 객체 형태로도 올 가능성에 대비해 둘 다 지원.
  const body = res.data as unknown;
  const entry: Record<string, unknown> =
    Array.isArray(body) && body.length > 0
      ? ((body[0] as Record<string, unknown>) ?? {})
      : ((body as Record<string, unknown>) ?? {});
  const code = typeof entry.code === "string" ? entry.code : String(entry.code ?? "");
  const msg = typeof entry.msg === "string" ? entry.msg : "";
  const token = typeof entry.token === "string" ? entry.token : "";

  return {
    success: code === "1000",
    code,
    msg,
    token,
    tokenProvided: token.length > 0,
    httpStatus: res.status,
    request: { url, params, maskedParams },
    raw: body,
  };
}
