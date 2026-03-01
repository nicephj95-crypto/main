// src/utils/addressBookUtils.ts
import multer from "multer";
import path from "path";

export const MAX_ADDRESS_IMAGES = 5;
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_IMAGE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);
const ALLOWED_EXCEL_EXT = new Set(["xlsx", "xls"]);

function getFileExtension(name: string): string {
  return path.extname(name || "").replace(".", "").toLowerCase();
}

export const addressImageUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_SIZE_BYTES, files: MAX_ADDRESS_IMAGES },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_MIME.has(file.mimetype)) {
      cb(new Error("jpg, png, webp 파일만 업로드할 수 있습니다."));
      return;
    }
    const ext = getFileExtension(file.originalname);
    if (!ALLOWED_IMAGE_EXT.has(ext)) {
      cb(new Error("jpg, jpeg, png, webp 확장자 파일만 업로드할 수 있습니다."));
      return;
    }
    cb(null, true);
  },
});

export const addressBookExcelUploader = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = getFileExtension(file.originalname);
    if (!ALLOWED_EXCEL_EXT.has(ext)) {
      cb(new Error("xlsx, xls 파일만 업로드할 수 있습니다."));
      return;
    }
    cb(null, true);
  },
});

export function normalizeMultipartFilename(name: string) {
  try {
    return Buffer.from(name, "latin1").toString("utf8");
  } catch {
    return name;
  }
}

export function normCell(value: unknown) {
  if (value == null) return "";
  return String(value).trim();
}

export function normalizeDupKey(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildAddressBookDuplicateKey(
  businessName: string,
  placeName: string,
  address: string
) {
  return [
    normalizeDupKey(businessName),
    normalizeDupKey(placeName),
    normalizeDupKey(address),
  ].join("||");
}

export function isValidHHMM(value: string) {
  if (!value) return true;
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hh, mm] = value.split(":").map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function normalizeExcelHHMM(value: unknown): string {
  const raw = normCell(value);
  if (!raw) return "";

  // e.g. 9:00, 09:00, 09:00:00
  const colonMatch = raw.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (colonMatch) {
    const hh = Number(colonMatch[1]);
    const mm = Number(colonMatch[2]);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  // e.g. 1200, 900
  const digitsOnly = raw.replace(/\D/g, "");
  if (/^\d{3,4}$/.test(digitsOnly)) {
    const hhStr = digitsOnly.length === 3 ? digitsOnly.slice(0, 1) : digitsOnly.slice(0, 2);
    const mmStr = digitsOnly.length === 3 ? digitsOnly.slice(1) : digitsOnly.slice(2);
    const hh = Number(hhStr);
    const mm = Number(mmStr);
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  // e.g. 12시, 12시30분
  const koreanMatch = raw.match(/^(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/);
  if (koreanMatch) {
    const hh = Number(koreanMatch[1]);
    const mm = Number(koreanMatch[2] ?? "0");
    if (hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59) {
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }
  }

  return raw;
}
