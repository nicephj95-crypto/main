// src/utils/pagination.ts

const PAGE_WINDOW_SIZE = 8;

/**
 * 현재 페이지와 전체 페이지 수를 받아 페이지네이션 번호 배열 반환.
 * 생략 구간은 "..." 문자열로 표시.
 */
export function getPaginationNumbers(
  page: number,
  totalPages: number
): (number | "...")[] {
  if (totalPages <= PAGE_WINDOW_SIZE + 1) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const visibleCore = Math.max(1, PAGE_WINDOW_SIZE - 1);
  const coreEnd = Math.min(
    totalPages - 1,
    Math.max(visibleCore, page + (visibleCore - 3))
  );
  const coreStart = Math.max(1, coreEnd - visibleCore + 1);
  const nums: (number | "...")[] = [];
  for (let p = coreStart; p <= coreEnd; p++) nums.push(p);
  if (coreEnd < totalPages - 1) nums.push("...");
  nums.push(totalPages);
  return nums;
}
