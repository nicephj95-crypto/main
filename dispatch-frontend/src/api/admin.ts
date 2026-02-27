// src/api/admin.ts
// ADMIN 전용: 가입요청 관리, 사용자 목록/권한/회사 변경
import type {
  User,
  UserRole,
  SignupRequest,
  SignupRequestStatus,
} from "./types";
import { API_BASE_URL, buildHeaders } from "./_core";

// 가입요청 목록 조회
export async function listSignupRequests(
  status?: SignupRequestStatus
): Promise<SignupRequest[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);

  const query = params.toString();
  const url = query
    ? `${API_BASE_URL}/auth/signup-requests?${query}`
    : `${API_BASE_URL}/auth/signup-requests`;

  const res = await fetch(url, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `가입요청 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 가입요청 승인/반려
export async function reviewSignupRequest(
  requestId: number,
  action: "APPROVE" | "REJECT"
): Promise<{ message: string; request: SignupRequest }> {
  const res = await fetch(`${API_BASE_URL}/auth/signup-requests/${requestId}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `가입요청 처리 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 사용자 목록 조회
export async function listUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/auth/users`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `사용자 목록 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 사용자 권한 변경
export async function changeUserRole(userId: number, role: UserRole): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `권한 변경 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function changeUserCompany(
  userId: number,
  companyName: string | null
): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/company`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify({ companyName }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회사 변경 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  const data = await res.json();
  // 백엔드에서 { message, user } 형태로 보내줬으니까
  return data.user ?? data;
}
