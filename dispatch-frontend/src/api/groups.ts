import type {
  GroupContact,
  GroupDepartment,
  GroupsListResponse,
} from "./types";
import { apiFetch, buildHeaders } from "./_core";

export async function listGroups(params?: {
  q?: string;
  page?: number;
  size?: number;
}): Promise<GroupsListResponse> {
  const query = new URLSearchParams();
  if (params?.q?.trim()) query.set("q", params.q.trim());
  query.set("page", String(params?.page && params.page > 0 ? params.page : 1));
  query.set("size", String(params?.size && params.size > 0 ? params.size : 20));

  const res = await apiFetch(`/groups?${query.toString()}`, {
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`그룹 목록 조회 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }

  return res.json();
}

export async function createGroupDepartment(groupId: number, name: string): Promise<GroupDepartment> {
  const res = await apiFetch(`/groups/${groupId}/departments`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`부서 생성 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }

  return res.json();
}

export async function updateGroupDepartment(departmentId: number, name: string): Promise<GroupDepartment> {
  const res = await apiFetch(`/groups/departments/${departmentId}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`부서 수정 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }

  return res.json();
}

export async function deleteGroupDepartment(departmentId: number): Promise<void> {
  const res = await apiFetch(`/groups/departments/${departmentId}`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`부서 삭제 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }
}

export async function createGroupContact(
  groupId: number,
  payload: {
    departmentId: number;
    name: string;
    position?: string;
    phone?: string;
    email?: string;
  }
): Promise<GroupContact> {
  const res = await apiFetch(`/groups/${groupId}/contacts`, {
    method: "POST",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`인원 생성 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }

  return res.json();
}

export async function updateGroupContact(
  contactId: number,
  payload: {
    departmentId: number;
    name: string;
    position?: string;
    phone?: string;
    email?: string;
  }
): Promise<GroupContact> {
  const res = await apiFetch(`/groups/contacts/${contactId}`, {
    method: "PATCH",
    headers: buildHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`인원 수정 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }

  return res.json();
}

export async function deleteGroupContact(contactId: number): Promise<void> {
  const res = await apiFetch(`/groups/contacts/${contactId}`, {
    method: "DELETE",
    headers: buildHeaders(false),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`인원 삭제 실패 (status ${res.status}) - ${text || "알 수 없는 에러"}`);
  }
}
