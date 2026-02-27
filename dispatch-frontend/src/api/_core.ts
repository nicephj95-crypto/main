// src/api/_core.ts
// 공통 상수, 토큰 관리, 헤더 생성 유틸

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const TOKEN_KEY = "authToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const AUTH_USER_KEY = "authUser";

// ─────────────────────────────────────────────
// 토큰 관리 유틸
// ─────────────────────────────────────────────
export function setAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 로컬스토리지 없는 환경일 수도 있으니 조용히 무시
  }
}

export function setRefreshToken(token: string) {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // 무시
  }
}

export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // 무시
  }
}

export function setAuthSession(accessToken: string, refreshToken: string) {
  setAuthToken(accessToken);
  setRefreshToken(refreshToken);
}

export function setStoredAuthUser(user: {
  id: number;
  name: string;
  email: string;
  role: string;
}) {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getStoredAuthUser<T = {
  id: number;
  name: string;
  email: string;
  role: string;
}>(): T | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────
// 공통 헤더 생성 함수 (도메인 파일 내부 전용)
// ─────────────────────────────────────────────
export function buildHeaders(hasBody: boolean = false): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();

  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}

export function buildAuthOnlyHeaders(): HeadersInit {
  const headers: HeadersInit = {};
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}
