// src/api/_core.ts
// 공통 상수, 토큰 관리, 헤더 생성 유틸

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const TOKEN_KEY = "authToken";
const AUTH_USER_KEY = "authUser";
let accessTokenMemory: string | null = null;
let refreshInFlight: Promise<any> | null = null;

// ─────────────────────────────────────────────
// 토큰 관리 유틸
// ─────────────────────────────────────────────
export function setAuthToken(token: string) {
  accessTokenMemory = token;
}

// refresh token은 HttpOnly 쿠키로 관리되므로 아래는 하위호환용 no-op
export function setRefreshToken(_token: string) { /* no-op: HttpOnly cookie */ }
export function getRefreshToken(): string | null { return null; }

export function getAuthToken(): string | null {
  return accessTokenMemory;
}

export function clearAuthToken() {
  accessTokenMemory = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // 무시
  }
}

export function setAuthSession(accessToken: string) {
  setAuthToken(accessToken);
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

function mergeHeaders(base: HeadersInit | undefined, extra: HeadersInit): Headers {
  const merged = new Headers(base ?? {});
  const append = new Headers(extra);
  append.forEach((value, key) => merged.set(key, value));
  return merged;
}

export async function refreshSessionSingleFlight(): Promise<any> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) {
      clearAuthToken();
      const text = await res.text();
      throw new Error(`토큰 갱신 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
    }

    const data = await res.json();
    if (data?.token) {
      setAuthSession(data.token);
    }
    if (data?.user) {
      setStoredAuthUser(data.user);
    }
    return data;
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  options?: {
    auth?: boolean;
    retryOn401?: boolean;
    credentials?: RequestCredentials;
  }
): Promise<Response> {
  const auth = options?.auth ?? true;
  const retryOn401 = options?.retryOn401 ?? true;
  const credentials = options?.credentials;
  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  const token = getAuthToken();
  const firstHeaders = auth && token
    ? mergeHeaders(init.headers, { Authorization: `Bearer ${token}` })
    : new Headers(init.headers ?? {});

  const firstRes = await fetch(url, { ...init, headers: firstHeaders, credentials });

  if (!auth || !retryOn401 || firstRes.status !== 401) {
    return firstRes;
  }

  try {
    await refreshSessionSingleFlight();
  } catch {
    return firstRes;
  }

  const retriedToken = getAuthToken();
  const retryHeaders = retriedToken
    ? mergeHeaders(init.headers, { Authorization: `Bearer ${retriedToken}` })
    : new Headers(init.headers ?? {});

  return fetch(url, { ...init, headers: retryHeaders, credentials });
}
