// src/utils/requestUtils.ts
import type { RequestStatus } from "@prisma/client";
import multer from "multer";

export const MAX_REQUEST_IMAGES = 5;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const requestImageUploader = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_IMAGE_SIZE_BYTES,
    files: MAX_REQUEST_IMAGES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(new Error("jpg, png, webp 파일만 업로드할 수 있습니다."));
      return;
    }
    cb(null, true);
  },
});

export function normalizeMultipartFilename(name: string) {
  try {
    // multer/busboy can decode non-ASCII multipart filenames as latin1.
    return Buffer.from(name, "latin1").toString("utf8");
  } catch {
    return name;
  }
}

export const ALL_REQUEST_STATUSES: RequestStatus[] = [
  "PENDING",
  "DISPATCHING",
  "ASSIGNED",
  "IN_TRANSIT",
  "COMPLETED",
  "CANCELLED",
];

export function canStaffChangeStatus(
  current: RequestStatus,
  next: RequestStatus
): boolean {
  if (current === next) return true;

  // 담당자(ADMIN/DISPATCHER)는 언제든 취소 가능
  if (next === "CANCELLED") return true;

  const allowedTransitions = new Set<string>([
    // 정상 진행 흐름
    "PENDING->DISPATCHING",
    "DISPATCHING->ASSIGNED",
    "ASSIGNED->IN_TRANSIT",
    "ASSIGNED->COMPLETED",
    "IN_TRANSIT->COMPLETED",
    // 수동 역순 허용 (요청사항)
    "DISPATCHING->PENDING",
    "ASSIGNED->DISPATCHING",
    "CANCELLED->DISPATCHING",
  ]);

  return allowedTransitions.has(`${current}->${next}`);
}

export function formatStatusLabel(status: RequestStatus) {
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

export function formatStatusLabelForFile(status?: string) {
  if (!status || status === "ALL") return "전체";
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
      return "전체";
  }
}

export function formatDateTimeCell(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}
