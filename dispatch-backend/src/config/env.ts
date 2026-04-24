type NodeEnv = "development" | "test" | "production";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[env] Missing required environment variable: ${name}`);
  }
  return value;
}

function parseNodeEnv(value: string | undefined): NodeEnv {
  if (value === "test" || value === "production") {
    return value;
  }
  return "development";
}

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  const normalized = value
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
    .map((origin) => origin.replace(/\/+$/, ""));

  if (normalized.some((origin) => origin === "*")) {
    throw new Error("[env] CORS_ORIGINS에 '*'는 허용되지 않습니다. 명시적 도메인만 설정하세요.");
  }

  return Array.from(new Set(normalized));
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const env = {
  NODE_ENV: parseNodeEnv(process.env.NODE_ENV),
  JWT_SECRET: getRequiredEnv("JWT_SECRET"),

  // 인성 연동 (선택 — 없으면 연동 비활성)
  INSUNG_BASE_URL: getOptionalEnv("INSUNG_BASE_URL"),
  INSUNG_M_CODE: getOptionalEnv("INSUNG_M_CODE"),
  INSUNG_CC_CODE: getOptionalEnv("INSUNG_CC_CODE"),
  INSUNG_USER_ID: getOptionalEnv("INSUNG_USER_ID"),
  INSUNG_UKEY: getOptionalEnv("INSUNG_UKEY"),
  // INSUNG_TOKEN: 발급된 토큰을 직접 지정하면 oauth 호출 생략 (token-first 모드)
  INSUNG_TOKEN: getOptionalEnv("INSUNG_TOKEN"),
  // 신규 consumer-key 기반 인증 (insungConfig.ts에서 strict 검증)
  INSUNG_CONSUMER_KEY: getOptionalEnv("INSUNG_CONSUMER_KEY"),
  // 선택: 있으면 ukey = PREFIX + CONSUMER_KEY 로 고정(결정론). 없으면 random8 생성.
  INSUNG_UKEY_PREFIX: getOptionalEnv("INSUNG_UKEY_PREFIX"),
  INSUNG_RESPONSE_TYPE: getOptionalEnv("INSUNG_RESPONSE_TYPE"),
  INSUNG_ENABLE_LIVE_REGISTER: getOptionalEnv("INSUNG_ENABLE_LIVE_REGISTER"),

  // 화물24 연동 (선택 — 없으면 연동 비활성)
  CALL24_BASE_URL: getOptionalEnv("CALL24_BASE_URL"),
  CALL24_API_KEY: getOptionalEnv("CALL24_API_KEY"),
  CALL24_AES_KEY: getOptionalEnv("CALL24_AES_KEY"),
  CALL24_AES_IV: getOptionalEnv("CALL24_AES_IV"),
  CALL24_ADDR_API_PATH: getOptionalEnv("CALL24_ADDR_API_PATH"),
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),
  DISTANCE_API_TIMEOUT_MS: parsePositiveInt(
    process.env.DISTANCE_API_TIMEOUT_MS,
    5000
  ),
  DISTANCE_RATE_LIMIT_WINDOW_MS: parsePositiveInt(
    process.env.DISTANCE_RATE_LIMIT_WINDOW_MS,
    60000
  ),
  DISTANCE_RATE_LIMIT_MAX: parsePositiveInt(
    process.env.DISTANCE_RATE_LIMIT_MAX,
    20
  ),
  PASSWORD_RESET_TOKEN_TTL_MINUTES: parsePositiveInt(
    process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
    30
  ),
  REFRESH_TOKEN_TTL_DAYS: parsePositiveInt(
    process.env.REFRESH_TOKEN_TTL_DAYS,
    14
  ),
  FRONTEND_BASE_URL: getOptionalEnv("FRONTEND_BASE_URL"),
  RESEND_API_KEY: getOptionalEnv("RESEND_API_KEY"),
  RESEND_FROM_EMAIL: getOptionalEnv("RESEND_FROM_EMAIL"),
};
