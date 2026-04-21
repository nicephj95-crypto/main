// src/config/insungConfig.ts
//
// 인성 연동(consumer-key 기반)용 환경변수 로더.
// env.ts는 모든 INSUNG_* 를 optional로 두고, 여기서 live 등록에 필요한
// 필수값만 strict하게 검증한다. 누락 시 InsungConfigError를 throw.
//
// 필수 env:
//   - INSUNG_BASE_URL
//   - INSUNG_M_CODE
//   - INSUNG_CC_CODE
//   - INSUNG_CONSUMER_KEY
//   - INSUNG_USER_ID
//   - INSUNG_RESPONSE_TYPE
//   - INSUNG_ENABLE_LIVE_REGISTER
//
// TODO: INSUNG_USER_ID="오성글로벌" 값이 실제 인성 측 user_id로 적절한지
//       연동 담당자와 재확인 필요. 회사 표시명과 API 인증용 user_id가
//       다를 수 있음.

import { env } from "./env";

export class InsungConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsungConfigError";
  }
}

export type InsungConfig = {
  baseUrl: string;
  mCode: string;
  ccCode: string;
  consumerKey: string;
  userId: string;
  responseType: string;
  liveRegisterEnabled: boolean;
};

const REQUIRED_KEYS = [
  "INSUNG_BASE_URL",
  "INSUNG_M_CODE",
  "INSUNG_CC_CODE",
  "INSUNG_CONSUMER_KEY",
  "INSUNG_USER_ID",
  "INSUNG_RESPONSE_TYPE",
  "INSUNG_ENABLE_LIVE_REGISTER",
] as const;

type RequiredKey = (typeof REQUIRED_KEYS)[number];

function readValidated(): Record<RequiredKey, string | undefined> {
  return {
    INSUNG_BASE_URL: env.INSUNG_BASE_URL,
    INSUNG_M_CODE: env.INSUNG_M_CODE,
    INSUNG_CC_CODE: env.INSUNG_CC_CODE,
    INSUNG_CONSUMER_KEY: env.INSUNG_CONSUMER_KEY,
    INSUNG_USER_ID: env.INSUNG_USER_ID,
    INSUNG_RESPONSE_TYPE: env.INSUNG_RESPONSE_TYPE,
    INSUNG_ENABLE_LIVE_REGISTER: env.INSUNG_ENABLE_LIVE_REGISTER,
  };
}

function parseLiveRegister(raw: string): boolean {
  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1" || normalized === "yes") return true;
  if (normalized === "false" || normalized === "0" || normalized === "no") return false;
  throw new InsungConfigError(
    `[insung] INSUNG_ENABLE_LIVE_REGISTER 값은 true/false 이어야 합니다. 받은 값: "${raw}"`
  );
}

export function loadInsungConfig(): InsungConfig {
  const values = readValidated();
  const missing: RequiredKey[] = [];
  for (const key of REQUIRED_KEYS) {
    if (!values[key] || values[key]!.trim().length === 0) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new InsungConfigError(
      `[insung] 필수 환경변수 누락: ${missing.join(", ")}`
    );
  }

  const consumerKey = values.INSUNG_CONSUMER_KEY!.trim();
  if (!consumerKey) {
    throw new InsungConfigError(
      "[insung] INSUNG_CONSUMER_KEY가 비어있거나 공백만 포함합니다."
    );
  }

  return {
    baseUrl: values.INSUNG_BASE_URL!.trim(),
    mCode: values.INSUNG_M_CODE!.trim(),
    ccCode: values.INSUNG_CC_CODE!.trim(),
    consumerKey,
    userId: values.INSUNG_USER_ID!.trim(),
    responseType: values.INSUNG_RESPONSE_TYPE!.trim(),
    liveRegisterEnabled: parseLiveRegister(values.INSUNG_ENABLE_LIVE_REGISTER!),
  };
}

/**
 * 실제 외부 등록 POST 호출 직전에 호출되는 가드.
 * INSUNG_ENABLE_LIVE_REGISTER=false 인 한 항상 throw.
 */
export function assertInsungLiveRegisterEnabled(config?: InsungConfig): void {
  const cfg = config ?? loadInsungConfig();
  if (!cfg.liveRegisterEnabled) {
    throw new InsungConfigError(
      "[insung] live register 차단: INSUNG_ENABLE_LIVE_REGISTER=true 일 때만 실제 호출이 허용됩니다."
    );
  }
}
