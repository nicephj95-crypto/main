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

export class LocalStorageService implements StorageService {
  private readonly rootDir: string;

  constructor(rootDir: string) {
    this.rootDir = rootDir;
  }

  async saveObject(input: SaveObjectInput): Promise<SaveObjectResult> {
    const ext = getExtension(input.originalName, input.mimeType);
    const fileName = `${Date.now()}_${randomUUID()}.${ext}`;
    const storageKey = path.posix.join(input.keyPrefix, fileName);
    const absPath = path.join(this.rootDir, ...storageKey.split("/"));

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
    const absPath = path.join(this.rootDir, ...storageKey.split("/"));
    try {
      await fs.unlink(absPath);
    } catch {
      // ignore missing file
    }
  }
}

