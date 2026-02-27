// src/utils/format.ts

/**
 * 배차 상태 코드 → 한글 레이블
 */
export function formatStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "접수중";
    case "DISPATCHING":
      return "배차중";
    case "ASSIGNED":
      return "배차완료";
    case "IN_TRANSIT":
      return "운행중";
    case "COMPLETED":
      return "완료";
    case "CANCELLED":
      return "취소";
    default:
      return status;
  }
}
