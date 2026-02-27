// src/api/auth.ts
import type {
  LoginRequestBody,
  LoginResponse,
  UpdateProfileBody,
  UpdateProfileResponse,
  SignupRequestBody,
  SignupResponse,
} from "./types";
import {
  API_BASE_URL,
  buildHeaders,
  getRefreshToken,
  setAuthSession,
  setStoredAuthUser,
  clearAuthToken,
} from "./_core";

// 로그인
export async function login(body: LoginRequestBody): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `로그인 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function refreshToken(): Promise<LoginResponse> {
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    throw new Error("refresh token이 없습니다.");
  }

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: currentRefreshToken }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `토큰 갱신 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  const data = (await res.json()) as LoginResponse;
  setAuthSession(data.token, data.refreshToken);
  setStoredAuthUser(data.user);
  return data;
}

export async function logout(): Promise<void> {
  const currentRefreshToken = getRefreshToken();

  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: currentRefreshToken }),
    });
  } catch {
    // 서버 요청 실패해도 로컬 세션은 제거
  } finally {
    clearAuthToken();
  }
}

export async function signup(body: SignupRequestBody): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회원가입 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `비밀번호 재설정 요청 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function confirmPasswordReset(
  token: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `비밀번호 재설정 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 프로필 수정
export async function updateProfile(body: UpdateProfileBody): Promise<UpdateProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `프로필 수정 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 비밀번호 변경 (로그인 필요)
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    try {
      const data = await res.json();
      if (data?.message) {
        throw new Error(data.message);
      }
    } catch {
      const text = await res.text();
      throw new Error(
        `비밀번호 변경 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
      );
    }
  }

  return res.json();
}
