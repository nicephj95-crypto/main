import fs from "fs";
import path from "path";
import type { Response } from "express";

const uploadsRoot = path.resolve(process.cwd(), "uploads");

function resolveUploadAbsolutePath(storageKey: string): string | null {
  const absolutePath = path.resolve(uploadsRoot, ...storageKey.split("/"));
  if (absolutePath === uploadsRoot) return null;
  if (!absolutePath.startsWith(`${uploadsRoot}${path.sep}`)) return null;
  return absolutePath;
}

export async function sendLocalUploadedFile(
  res: Response,
  storageKey: string,
  mimeType?: string | null,
  originalName?: string | null
): Promise<boolean> {
  const absolutePath = resolveUploadAbsolutePath(storageKey);
  if (!absolutePath) return false;

  try {
    await fs.promises.access(absolutePath, fs.constants.R_OK);
  } catch {
    return false;
  }

  const safeFileName = (originalName || "file").replace(/[\r\n"]/g, "");
  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${safeFileName}"`);
  fs.createReadStream(absolutePath).pipe(res);
  return true;
}
