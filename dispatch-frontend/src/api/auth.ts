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
  apiFetch,
  clearAuthToken,
  refreshSessionSingleFlight,
} from "./_core";

// 로그인
export async function login(body: LoginRequestBody): Promise<LoginResponse> {
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { auth: false, retryOn401: false, credentials: "include" });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `로그인 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function refreshToken(): Promise<LoginResponse> {
  const data = (await refreshSessionSingleFlight()) as LoginResponse;
  return data;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", {
      method: "POST",
    }, { auth: false, retryOn401: false, credentials: "include" });
  } catch {
    // 서버 요청 실패해도 로컬 세션은 제거
  } finally {
    clearAuthToken();
  }
}

export async function signup(body: SignupRequestBody): Promise<SignupResponse> {
  const res = await apiFetch("/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, { auth: false, retryOn401: false });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회원가입 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await apiFetch("/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  }, { auth: false, retryOn401: false });

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
  const res = await apiFetch("/auth/password-reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  }, { auth: false, retryOn401: false });

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
  const res = await apiFetch("/auth/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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
  const res = await apiFetch("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
