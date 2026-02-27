// src/api/client.ts
// 하위호환 배럴: 기존 import 경로 유지용
// 도메인별 직접 import: api/auth, api/requests, api/addressBook, api/admin

export {
  setAuthToken,
  setRefreshToken,
  getRefreshToken,
  getAuthToken,
  clearAuthToken,
  setAuthSession,
  setStoredAuthUser,
  getStoredAuthUser,
} from "./_core";

export * from "./auth";
export * from "./requests";
export * from "./addressBook";
export * from "./admin";
