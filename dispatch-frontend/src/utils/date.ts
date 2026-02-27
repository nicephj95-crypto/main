// src/utils/date.ts

/**
 * ISO 날짜 문자열을 "YYYY.MM.DD\nHH:MM:SS" 형태로 포맷
 */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd}\n${hh}:${mi}:${ss}`;
}
