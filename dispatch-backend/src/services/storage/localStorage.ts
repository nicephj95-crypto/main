import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { SaveObjectInput, SaveObjectResult, StorageService } from "./types";

function getExtension(originalName: string, mimeType: string) {
  const extFromName = path.extname(originalName || "").replace(".", "").toLowerCase();
  if (extFromName) return extFromName;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

function sanitizeKeyPrefix(keyPrefix: string): string {
  return keyPrefix
    .split("/")
    .map((seg) => seg.trim())
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/");
}

function resolveWithinRoot(rootDir: string, storageKey: string): string {
  const resolvedRoot = path.resolve(rootDir);
  const absolutePath = path.resolve(resolvedRoot, ...storageKey.split("/"));
  if (absolutePath === resolvedRoot) {
    throw new Error("유효하지 않은 저장 경로입니다.");
  }
  if (!absolutePath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error("저장 경로가 루트 범위를 벗어났습니다.");
  }
  return absolutePath;
}

export class LocalStorageService implements StorageService {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async saveObject(input: SaveObjectInput): Promise<SaveObjectResult> {
    const ext = getExtension(input.originalName, input.mimeType);
    const safePrefix = sanitizeKeyPrefix(input.keyPrefix);
    const fileName = `${randomUUID()}.${ext}`;
    const storageKey = safePrefix ? path.posix.join(safePrefix, fileName) : fileName;
    const absPath = resolveWithinRoot(this.rootDir, storageKey);

    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, input.buffer);

    return {
      storageProvider: "LOCAL",
      storageKey,
      publicUrl: this.getPublicUrl(storageKey),
    };
  }

  getPublicUrl(storageKey: string): string {
    return `/uploads/${storageKey}`;
  }

  async deleteObject(storageKey: string): Promise<void> {
    let absPath: string;
    try {
      absPath = resolveWithinRoot(this.rootDir, storageKey);
    } catch {
      return;
    }
    try {
      await fs.unlink(absPath);
    } catch {
      // ignore missing file
    }
  }
}
