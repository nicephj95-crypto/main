import type React from "react";

const MAX_CLIPBOARD_IMAGE_BYTES = 850 * 1024;
const MAX_CANVAS_SIDE = 2400;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromMime(type: string) {
  if (type === "image/jpeg") return "jpg";
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "png";
}

function ensureImageExtension(name: string, mimeType: string, fallbackBase: string) {
  const ext = extensionFromMime(mimeType);
  const base = (name || fallbackBase).replace(/\.[^.]+$/, "") || fallbackBase;
  return `${base}.${ext}`;
}

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg" | "image/webp",
  quality?: number
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function canvasFromImageFile(file: File) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("붙여넣은 이미지를 읽을 수 없습니다."));
      img.src = url;
    });

    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    const scale = Math.min(1, MAX_CANVAS_SIDE / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext("2d");
    if (!canvas.width || !canvas.height || !context) {
      throw new Error("붙여넣은 이미지를 처리할 수 없습니다.");
    }

    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function resizeCanvas(source: HTMLCanvasElement, maxSide: number) {
  const scale = Math.min(1, maxSide / Math.max(source.width, source.height));
  if (scale >= 1) return source;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return source;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

async function normalizeClipboardImageFile(file: File, index: number) {
  const fallbackBase = `pasted-image-${Date.now()}-${index}`;

  if (SUPPORTED_IMAGE_TYPES.has(file.type) && file.size <= MAX_CLIPBOARD_IMAGE_BYTES) {
    return new File(
      [file],
      ensureImageExtension(file.name, file.type, fallbackBase),
      { type: file.type }
    );
  }

  const sourceCanvas = await canvasFromImageFile(file);
  for (const maxSide of [2400, 2000, 1600, 1200, 900, 720]) {
    const canvas = resizeCanvas(sourceCanvas, maxSide);

    const pngBlob = await blobFromCanvas(canvas, "image/png");
    if (pngBlob && pngBlob.size <= MAX_CLIPBOARD_IMAGE_BYTES) {
      return new File([pngBlob], `${fallbackBase}.png`, { type: "image/png" });
    }

    for (const quality of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]) {
      const jpegBlob = await blobFromCanvas(canvas, "image/jpeg", quality);
      if (jpegBlob && jpegBlob.size <= MAX_CLIPBOARD_IMAGE_BYTES) {
        return new File([jpegBlob], `${fallbackBase}.jpg`, { type: "image/jpeg" });
      }
    }
  }

  const fallbackCanvas = resizeCanvas(sourceCanvas, 720);
  const jpegBlob = await blobFromCanvas(fallbackCanvas, "image/jpeg", 0.4);
  if (jpegBlob) {
    return new File([jpegBlob], `${fallbackBase}.jpg`, { type: "image/jpeg" });
  }

  throw new Error("붙여넣은 이미지를 업로드 가능한 형식으로 변환할 수 없습니다.");
}

export function imageFilesFromClipboard(event: React.ClipboardEvent<HTMLElement>): File[] {
  return Array.from(event.clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      const type = SUPPORTED_IMAGE_TYPES.has(file.type) ? file.type : "image/png";
      return new File(
        [file],
        ensureImageExtension(file.name, type, `pasted-image-${Date.now()}-${index}`),
        { type }
      );
    })
    .filter((file): file is File => file !== null);
}

export async function normalizedImageFilesFromClipboard(
  event: React.ClipboardEvent<HTMLElement>
): Promise<File[]> {
  const files = Array.from(event.clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);

  return Promise.all(files.map((file, index) => normalizeClipboardImageFile(file, index)));
}

export function fileListFromFiles(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}
