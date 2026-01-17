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
  UpdateProfileBody,
  UpdateProfileResponse,
  User,
  UserRole,
  SignupRequestBody,   
  SignupResponse, 
  RequestListResponse,
} from "./types";

const API_BASE_URL = "http://localhost:4000";
const TOKEN_KEY = "authToken";

// 🔹 최근 N건 배차내역 (로그인 유저 기준)
export async function listRecentRequests(
  limit: number = 5
): Promise<RequestSummary[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const res = await fetch(
    `${API_BASE_URL}/requests/recent?${params.toString()}`,
    {
      headers: buildHeaders(false),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `최근 배차내역 조회 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  return res.json();
}

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

// ─────────────────────────────────────────────
// 공통 헤더 생성 함수
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// 인증 / 유저 관련
// ─────────────────────────────────────────────

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

// ✅ 회원가입 API
export async function signup(
  body: SignupRequestBody
): Promise<SignupResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/signup`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회원가입 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  return res.json();
}

// 프로필 수정
export async function updateProfile(
  body: UpdateProfileBody
): Promise<UpdateProfileResponse> {
  const res = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `프로필 수정 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
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
    headers: buildHeaders(true), // 토큰 + JSON 헤더 자동 포함
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  if (!res.ok) {
    // 에러 메시지 깔끔하게 뽑기
    try {
      const data = await res.json();
      if (data?.message) {
        throw new Error(data.message);
      }
    } catch {
      const text = await res.text();
      throw new Error(
        `비밀번호 변경 실패 (status ${res.status}) - ${
          text || "알 수 없는 에러"
        }`
      );
    }
  }

  // { message: "비밀번호가 성공적으로 변경되었습니다. ..." }
  return res.json();
}

// ─────────────────────────────────────────────
// 배차 요청 관련
// ─────────────────────────────────────────────

// 배차 요청 생성
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

// 🔹 배차 목록 조회 (상태/기간 + 페이지네이션)
export async function listRequests(
  status?: RequestStatus | "ALL",
  from?: string,
  to?: string,
  page: number = 1,
  pageSize: number = 20
): Promise<RequestListResponse> {
  const params = new URLSearchParams();

  if (status && status !== "ALL") {
    params.set("status", status);
  }
  if (from) {
    params.set("from", from); // "YYYY-MM-DD"
  }
  if (to) {
    params.set("to", to); // "YYYY-MM-DD"
  }
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

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
      `배차내역 조회 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  // { items, total, page, pageSize } 구조
  return res.json();
}

// 특정 배차요청 상세 조회
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

// 요청 상태 변경
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

// ─────────────────────────────────────────────
// 주소록 관련
// ─────────────────────────────────────────────

// 🔹 주소록 목록 조회 (+검색 + 회사 필터)
export async function listAddressBook(
  query?: string,
  companyName?: string
): Promise<AddressBookEntry[]> {
  const params = new URLSearchParams();

  if (query && query.trim() !== "") {
    params.set("q", query.trim());
  }
  if (companyName && companyName.trim() !== "") {
    params.set("companyName", companyName.trim());
  }

  const queryStr = params.toString();
  const url = queryStr
    ? `${API_BASE_URL}/address-book?${queryStr}`
    : `${API_BASE_URL}/address-book`;

  const res = await fetch(url, {
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

// 주소록 저장
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

// 주소록 수정
export async function updateAddressBookEntry(
  id: number,
  body: Partial<CreateAddressBookBody>
): Promise<AddressBookEntry> {
  const res = await fetch(`${API_BASE_URL}/address-book/${id}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 수정 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 주소록 삭제
export async function deleteAddressBookEntry(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/address-book/${id}`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 삭제 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }
  // 204일 수도 있으니 body 없음
}

// 🔹 (ADMIN 전용) 회사 목록 조회
export async function listAddressBookCompanies(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/address-book/companies`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회사 목록 조회 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  return res.json(); // ["회사A", "회사B", ...]
}

// ─────────────────────────────────────────────
// 거리 계산
// ─────────────────────────────────────────────

// 주소 기반 거리 계산
export async function getDistanceByAddress(
  startAddress: string,
  goalAddress: string
): Promise<DistanceResponse> {
  const res = await fetch(`${API_BASE_URL}/distance`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }, // 지금은 토큰 필요 없게 사용 중
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

// 🔹 (ADMIN 전용) 사용자 목록 조회
export async function listUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE_URL}/auth/users`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `사용자 목록 조회 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  return res.json();
}

// 🔹 (ADMIN 전용) 사용자 권한 변경
export async function changeUserRole(
  userId: number,
  role: UserRole
): Promise<User> {
  const res = await fetch(`${API_BASE_URL}/auth/users/${userId}/role`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify({ role }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `권한 변경 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  return res.json();
}

export async function changeUserCompany(
  userId: number,
  companyName: string | null
): Promise<User> {
  const res = await fetch(
    `${API_BASE_URL}/auth/users/${userId}/company`,
    {
      method: "PATCH",
      headers: buildHeaders(true),
      body: JSON.stringify({ companyName }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회사 변경 실패 (status ${res.status}) - ${
        text || "알 수 없는 에러"
      }`
    );
  }

  const data = await res.json();
  // 백엔드에서 { message, user } 형태로 보내줬으니까
  return data.user ?? data;
}