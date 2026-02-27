// src/api/addressBook.ts
import type {
  AddressBookEntry,
  CreateAddressBookBody,
  AddressBookImageAsset,
  AddressBookImportResult,
} from "./types";
import { API_BASE_URL, buildHeaders, buildAuthOnlyHeaders } from "./_core";

// 🔹 주소록 목록 조회 (+검색 + 회사 필터)
export async function listAddressBook(
  query?: string,
  companyName?: string
): Promise<AddressBookEntry[]> {
  const params = new URLSearchParams();

  if (query && query.trim() !== "") params.set("q", query.trim());
  if (companyName && companyName.trim() !== "") params.set("companyName", companyName.trim());

  const queryStr = params.toString();
  const url = queryStr
    ? `${API_BASE_URL}/address-book?${queryStr}`
    : `${API_BASE_URL}/address-book`;

  const res = await fetch(url, { headers: buildHeaders(false) });

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

export async function listAddressBookImages(
  addressBookId: number
): Promise<AddressBookImageAsset[]> {
  const res = await fetch(`${API_BASE_URL}/address-book/${addressBookId}/images`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 이미지 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function uploadAddressBookImages(
  addressBookId: number,
  files: File[]
): Promise<AddressBookImageAsset[]> {
  const form = new FormData();
  for (const file of files) form.append("images", file);

  const res = await fetch(`${API_BASE_URL}/address-book/${addressBookId}/images`, {
    method: "POST",
    headers: buildAuthOnlyHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 이미지 업로드 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

export async function deleteAddressBookImage(
  addressBookId: number,
  imageId: number
): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/address-book/${addressBookId}/images/${imageId}`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 이미지 삭제 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }
}

export async function downloadAddressBookImportTemplate(): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/address-book/template.xlsx`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 템플릿 다운로드 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("content-disposition") || "";
  const fileNameStarMatch = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const fileNameMatch = contentDisposition.match(/filename=\"?([^"]+)\"?/i);
  const fileName = fileNameStarMatch?.[1]
    ? decodeURIComponent(fileNameStarMatch[1])
    : fileNameMatch?.[1] || "address-book-template.xlsx";

  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}

export async function importAddressBookExcel(file: File): Promise<AddressBookImportResult> {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${API_BASE_URL}/address-book/import`, {
    method: "POST",
    headers: buildAuthOnlyHeaders(),
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `주소록 엑셀 업로드 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}

// 🔹 (ADMIN 전용) 회사 목록 조회
export async function listAddressBookCompanies(): Promise<string[]> {
  const res = await fetch(`${API_BASE_URL}/address-book/companies`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `회사 목록 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`
    );
  }

  return res.json();
}
