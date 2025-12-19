// src/api/client.ts
import type {
  CreateRequestBody,
  RequestSummary,
  AddressBookEntry,
  CreateAddressBookBody,
  RequestStatus,
  RequestDetail,
  DistanceResponse,
  LoginRequestBody,
  LoginResponse,
} from "./types";

const API_BASE_URL = "http://localhost:4000";
const TOKEN_KEY = "authToken";

export function setAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // 로컬스토리지 없는 환경일 수도 있으니 조용히 무시
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
  } catch {
    // 무시
  }
}

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

// ✅ 공통 헤더 생성 함수
function buildHeaders(hasBody: boolean = false): HeadersInit {
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

// 🔹 특정 배차요청 상세 조회
export async function getRequestDetail(id: number): Promise<RequestDetail> {
  const res = await fetch(`${API_BASE_URL}/requests/${id}`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차요청 상세 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 배차 요청 생성
export async function createRequest(body: CreateRequestBody) {
  const res = await fetch(`${API_BASE_URL}/requests`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `요청 생성 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 배차 목록 조회 (상태/기간 필터)
export async function listRequests(
  status?: RequestStatus,
  from?: string,
  to?: string
): Promise<RequestSummary[]> {
  const params = new URLSearchParams();

  if (status) {
    params.set("status", status);
  }
  if (from) {
    params.set("from", from); // "YYYY-MM-DD"
  }
  if (to) {
    params.set("to", to); // "YYYY-MM-DD"
  }

  const query = params.toString();
  const url = query
    ? `${API_BASE_URL}/requests?${query}`
    : `${API_BASE_URL}/requests`;

  const res = await fetch(url, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차내역 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 주소록 목록 조회
export async function listAddressBook(): Promise<AddressBookEntry[]> {
  const res = await fetch(`${API_BASE_URL}/address-book`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 주소록 저장
export async function createAddressBookEntry(
  body: CreateAddressBookBody
): Promise<AddressBookEntry> {
  const res = await fetch(`${API_BASE_URL}/address-book`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 저장 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 요청 상태 변경
export async function updateRequestStatus(
  id: number,
  status: RequestStatus
): Promise<RequestSummary> {
  const res = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `상태 변경 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 주소 기반 거리 계산 (여긴 인증 필요 없으면 buildHeaders 안 써도 됨)
export async function getDistanceByAddress(
  startAddress: string,
  goalAddress: string
): Promise<DistanceResponse> {
  const res = await fetch(`${API_BASE_URL}/distance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      startAddress,
      goalAddress,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `거리 계산 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 비밀번호 변경 (로그인 필요)
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
    method: "POST",
    headers: buildHeaders(true), // Authorization + Content-Type 같이 설정
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `비밀번호 변경 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}