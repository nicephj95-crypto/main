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
  CORS_ORIGINS: parseCorsOrigins(process.env.CORS_ORIGINS),
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
