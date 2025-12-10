// src/api/client.ts
import type {
  CreateRequestBody,
  RequestSummary,
  AddressBookEntry,
  CreateAddressBookBody,
  RequestStatus,
  RequestDetail, 
} from "./types";

const API_BASE_URL = "http://localhost:4000";


// 🔹 특정 배차요청 상세 조회
export async function getRequestDetail(id: number): Promise<RequestDetail> {
  const res = await fetch(`${API_BASE_URL}/requests/${id}`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차요청 상세 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function createRequest(body: CreateRequestBody) {
  const res = await fetch(`${API_BASE_URL}/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
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
    params.set("to", to);     // "YYYY-MM-DD"
  }

  const query = params.toString();
  const url = query
    ? `${API_BASE_URL}/requests?${query}`
    : `${API_BASE_URL}/requests`;

  const res = await fetch(url);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차내역 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 주소록 목록 조회
export async function listAddressBook(): Promise<AddressBookEntry[]> {
  const res = await fetch(`${API_BASE_URL}/address-book`);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function createAddressBookEntry(
  body: CreateAddressBookBody
): Promise<AddressBookEntry> {
  const res = await fetch(`${API_BASE_URL}/address-book`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

export async function updateRequestStatus(
  id: number,
  status: RequestStatus
): Promise<RequestSummary> {
  const res = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
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