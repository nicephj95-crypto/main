import type { Response } from "express";
import { getStorageServiceForProvider } from "../services/storage";

export async function sendStoredImageFile(
  res: Response,
  storageKey: string,
  mimeType?: string | null,
  originalName?: string | null,
  storageProvider?: string | null
): Promise<boolean> {
  const object = await getStorageServiceForProvider(storageProvider).getObject(storageKey);
  if (!object) return false;

  const safeFileName = (originalName || "file").replace(/[\r\n"]/g, "");
  res.setHeader("Content-Type", mimeType || object.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);
  if (object.contentLength != null) {
    res.setHeader("Content-Length", String(object.contentLength));
  }
  res.send(object.buffer);
  return true;
}
