import { apiFetch, buildAuthOnlyHeaders } from "./_core";
import type { DispatchTrackingDto } from "./types";

export async function getRequestTracking(
  requestId: number,
  options?: { provider?: "mock" | "hwamul24" | "insung"; mockCase?: string }
): Promise<DispatchTrackingDto> {
  const params = new URLSearchParams();
  if (options?.provider) params.set("provider", options.provider);
  if (options?.mockCase) params.set("mockCase", options.mockCase);
  const query = params.toString();
  const res = await apiFetch(`/requests/${requestId}/tracking${query ? `?${query}` : ""}`, {
    headers: buildAuthOnlyHeaders(),
  });

  if (!res.ok) {
    const data = (await res.clone().json().catch(() => null)) as { message?: string; error?: { message?: string } } | null;
    throw new Error(data?.error?.message ?? data?.message ?? `위치 정보 조회 실패 (status ${res.status})`);
  }

  return res.json() as Promise<DispatchTrackingDto>;
}
