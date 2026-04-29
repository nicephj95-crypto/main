// src/api/admin.ts
// ADMIN 전용: 가입요청 관리, 사용자 목록/권한/회사 변경
import type {
  User,
  UserRole,
  SignupRequestStatus,
  SignupRequestsListResponse,
  ReviewSignupRequestBody,
  ReviewSignupRequestResponse,
  CompanyName,
  AuditLogEntry,
  UsersListResponse,
} from "./types";
import { apiFetch, buildHeaders } from "./_core";

// 가입요청 목록 조회
export async function listSignupRequests(
  options?: {
    status?: SignupRequestStatus;
    q?: string;
    page?: number;
    size?: number;
  }
): Promise<SignupRequestsListResponse> {
  const queryParams = new URLSearchParams();
  if (options?.status) queryParams.set("status", options.status);
  if (options?.q?.trim()) queryParams.set("q", options.q.trim());
  queryParams.set("page", String(options?.page && options.page > 0 ? options.page : 1));
  queryParams.set("size", String(options?.size && options.size > 0 ? options.size : 20));

  const query = queryParams.toString();
  const url = query
    ? `/auth/signup-requests?${query}`
    : "/auth/signup-requests";

  const res = await apiFetch(url, {
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
  body: ReviewSignupRequestBody
): Promise<ReviewSignupRequestResponse> {
  const res = await apiFetch(`/auth/signup-requests/${requestId}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
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
export async function listUsers(params?: {
  q?: string;
  companyName?: string;
  page?: number;
  size?: number;
}): Promise<UsersListResponse> {
  const query = new URLSearchParams();
  if (params?.q?.trim()) query.set("q", params.q.trim());
  if (params?.companyName?.trim()) query.set("companyName", params.companyName.trim());
  query.set("page", String(params?.page && params.page > 0 ? params.page : 1));
  query.set("size", String(params?.size && params.size > 0 ? params.size : 20));

  const res = await apiFetch(`/auth/users?${query.toString()}`, {
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
  const res = await apiFetch(`/auth/users/${userId}/role`, {
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
  const res = await apiFetch(`/auth/users/${userId}/company`, {
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
  return data.user ?? data;
}

// 회사 목록 조회 (업체선택 드롭다운용)
export async function listCompanies(): Promise<CompanyName[]> {
  const res = await apiFetch("/auth/companies", {
    headers: buildHeaders(false),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`회사 목록 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }
  return res.json();
}

// 변경이력 조회 (ADMIN 전용)
export async function fetchAuditLogs(params: {
  resource?: string;
  resourceId?: number;
  target?: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: AuditLogEntry[]; total: number }> {
  const query = new URLSearchParams();
  if (params.resource) query.set("resource", params.resource);
  if (params.resourceId != null) query.set("resourceId", String(params.resourceId));
  if (params.target) query.set("target", params.target);
  if (params.limit) query.set("limit", String(params.limit));
  if (params.offset) query.set("offset", String(params.offset));

  const url = `/audit-logs?${query.toString()}`;
  const res = await apiFetch(url, { headers: buildHeaders(false) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`변경이력 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }
  return res.json();
}

export async function updateUserDetails(
  userId: number,
  data: {
    role?: UserRole;
    companyName?: string | null;
    phone?: string | null;
    department?: string | null;
    isActive?: boolean;
    showQuotedPrice?: boolean;
  }
): Promise<User> {
  const res = await apiFetch(`/auth/users/${userId}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `사용자 정보 변경 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  const result = await res.json();
  return result.user ?? result;
}

// ── 사이트 설정 ────────────────────────────────────────────
export type SiteSettings = {
  showQuotedPrice: string; // "true" | "false"
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const res = await apiFetch("/settings", { headers: buildHeaders(false) });
  if (!res.ok) throw new Error("설정 조회 실패");
  return res.json() as Promise<SiteSettings>;
}

export async function updateSiteSettings(patch: Partial<Record<keyof SiteSettings, string | boolean>>): Promise<void> {
  const res = await apiFetch("/settings", {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error("설정 저장 실패");
}
