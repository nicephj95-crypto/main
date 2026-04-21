import type { DispatchTrackingStatus } from "./trackingTypes";

export function normalizeInternalRequestStatus(status: string | null | undefined): DispatchTrackingStatus {
  switch (status) {
    case "PENDING":
      return "RECEIVED";
    case "DISPATCHING":
      return "DISPATCHING";
    case "ASSIGNED":
      return "DISPATCHED";
    case "IN_TRANSIT":
      return "IN_TRANSIT";
    case "COMPLETED":
      return "COMPLETED";
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "UNKNOWN";
  }
}

export function normalizeHwamul24Status(status: unknown): DispatchTrackingStatus {
  const value = String(status ?? "").trim().toUpperCase();
  if (!value) return "UNKNOWN";
  if (["CANCEL", "CANCELLED", "취소"].includes(value)) return "CANCELLED";
  if (["COMPLETE", "COMPLETED", "DONE", "운행완료", "완료"].includes(value)) return "COMPLETED";
  if (["ARRIVED", "도착"].includes(value)) return "ARRIVED";
  if (["IN_TRANSIT", "DRIVING", "운송중", "운행중"].includes(value)) return "IN_TRANSIT";
  if (["DISPATCHED", "ASSIGNED", "배차완료"].includes(value)) return "DISPATCHED";
  if (["DISPATCHING", "배차중"].includes(value)) return "DISPATCHING";
  if (["RECEIVED", "접수"].includes(value)) return "RECEIVED";
  return "UNKNOWN";
}

export function normalizeInsungStatus(status: unknown): DispatchTrackingStatus {
  const value = String(status ?? "").trim().toUpperCase();
  if (!value) return "UNKNOWN";
  if (["CANCEL", "CANCELLED"].includes(value)) return "CANCELLED";
  if (["COMPLETE", "COMPLETED", "DONE"].includes(value)) return "COMPLETED";
  if (["ARRIVED"].includes(value)) return "ARRIVED";
  if (["IN_TRANSIT", "DRIVING"].includes(value)) return "IN_TRANSIT";
  if (["DISPATCHED", "ASSIGNED"].includes(value)) return "DISPATCHED";
  if (["DISPATCHING"].includes(value)) return "DISPATCHING";
  if (["RECEIVED"].includes(value)) return "RECEIVED";
  return "UNKNOWN";
}
