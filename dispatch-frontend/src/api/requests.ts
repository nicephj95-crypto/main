// src/api/requests.ts
import type {
  CreateRequestBody,
  RequestSummary,
  RequestStatus,
  RequestDetail,
  DistanceResponse,
  RequestListResponse,
  RequestImageAsset,
} from "./types";
import { apiFetch, buildHeaders, buildAuthOnlyHeaders } from "./_core";

// 🔹 최근 N건 배차내역
export async function listRecentRequests(limit: number = 5): Promise<RequestSummary[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const res = await apiFetch(`/requests/recent?${params.toString()}`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `최근 배차내역 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 배차 요청 생성
export async function createRequest(body: CreateRequestBody) {
  const res = await apiFetch("/requests", {
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

  if (status && status !== "ALL") params.set("status", status);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));

  const query = params.toString();
  const url = query
    ? `/requests?${query}`
    : "/requests";

  const res = await apiFetch(url, { headers: buildHeaders(false) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차내역 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 배차내역 엑셀 다운로드
export async function exportRequestListExcel(params?: {
  status?: RequestStatus | "ALL";
  from?: string;
  to?: string;
  pickupKeyword?: string;
  dropoffKeyword?: string;
}): Promise<void> {
  const qs = new URLSearchParams();
  if (params?.status && params.status !== "ALL") qs.set("status", params.status);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.pickupKeyword?.trim()) qs.set("pickupKeyword", params.pickupKeyword.trim());
  if (params?.dropoffKeyword?.trim()) qs.set("dropoffKeyword", params.dropoffKeyword.trim());

  const query = qs.toString();
  const url = query
    ? `/requests/export.xlsx?${query}`
    : "/requests/export.xlsx";

  const res = await apiFetch(url, { headers: buildHeaders(false) });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차내역 엑셀 다운로드 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition") || "";
  const fileNameStarMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const fileNameMatch = contentDisposition.match(/filename=\"?([^"]+)\"?/i);
  const fileName = fileNameStarMatch?.[1]
    ? decodeURIComponent(fileNameStarMatch[1])
    : fileNameMatch?.[1] || "dispatch-requests.xlsx";

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

// 특정 배차요청 상세 조회
export async function getRequestDetail(id: number): Promise<RequestDetail> {
  const res = await apiFetch(`/requests/${id}`, {
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

export async function listRequestImages(id: number): Promise<RequestImageAsset[]> {
  const res = await apiFetch(`/requests/${id}/images`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `요청 이미지 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function uploadRequestImages(
  id: number,
  files: File[],
  kind: "cargo" | "receipt" = "cargo"
): Promise<RequestImageAsset[]> {
  const form = new FormData();
  form.append("kind", kind);
  for (const file of files) {
    form.append("images", file);
  }

  const res = await apiFetch(`/requests/${id}/images`, {
    method: "POST",
    headers: buildAuthOnlyHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `요청 이미지 업로드 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function deleteRequestImage(requestId: number, imageId: number): Promise<void> {
  const res = await apiFetch(`/requests/${requestId}/images/${imageId}`, {
    method: "DELETE",
    headers: buildAuthOnlyHeaders(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `이미지 삭제 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }
}

// 요청 상태 변경
export async function updateRequestStatus(
  id: number,
  status: RequestStatus
): Promise<RequestSummary> {
  const res = await apiFetch(`/requests/${id}/status`, {
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

export async function saveRequestAssignment(
  id: number,
  body: {
    driverName: string;
    driverPhone: string;
    vehicleNumber: string;
    vehicleTonnage?: number | null;
    vehicleType: string;
    actualFare?: number | null;
    billingPrice?: number | null;
  }
): Promise<RequestDetail> {
  const res = await apiFetch(`/requests/${id}/assignment`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차정보 저장 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function deleteRequestAssignment(id: number): Promise<RequestDetail> {
  const res = await apiFetch(`/requests/${id}/assignment`, {
    method: "DELETE",
    headers: buildHeaders(true),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `배차정보 삭제 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 주소 기반 거리 계산
export async function getDistanceByAddress(
  startAddress: string,
  goalAddress: string
): Promise<DistanceResponse> {
  const res = await apiFetch("/distance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startAddress, goalAddress }),
  }, { auth: false });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `거리 계산 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}
