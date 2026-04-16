const JPEG_HEADER = [0xff, 0xd8, 0xff];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const RIFF_HEADER = [0x52, 0x49, 0x46, 0x46];
const WEBP_HEADER = [0x57, 0x45, 0x42, 0x50];

function startsWithBytes(buffer: Buffer, header: number[]) {
  if (buffer.length < header.length) return false;
  return header.every((value, index) => buffer[index] === value);
}

function isValidJpeg(buffer: Buffer) {
  return startsWithBytes(buffer, JPEG_HEADER);
}

function isValidPng(buffer: Buffer) {
  return startsWithBytes(buffer, PNG_HEADER);
}

function isValidWebp(buffer: Buffer) {
  if (buffer.length < 12) return false;
  return (
    startsWithBytes(buffer, RIFF_HEADER) &&
    WEBP_HEADER.every((value, index) => buffer[index + 8] === value)
  );
}

export function isSupportedImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") return isValidJpeg(buffer);
  if (mimeType === "image/png") return isValidPng(buffer);
  if (mimeType === "image/webp") return isValidWebp(buffer);
  return false;
}

export function validateUploadedImageFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    if (!isSupportedImageSignature(file.buffer, file.mimetype)) {
      return {
        ok: false as const,
        message: `${file.originalname} 파일 검증에 실패했습니다. 실제 jpg/png/webp 이미지 파일만 업로드할 수 있습니다.`,
      };
    }
  }

  return { ok: true as const };
}
