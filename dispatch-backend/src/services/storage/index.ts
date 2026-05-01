import path from "path";
import { LocalStorageService } from "./localStorage";
import { S3StorageService } from "./s3Storage";
import type { StorageService } from "./types";

const uploadsRoot = path.join(process.cwd(), "uploads");
const localStorageService = new LocalStorageService(uploadsRoot);

function createStorageService(): StorageService {
  const bucketName = process.env.S3_BUCKET_NAME?.trim();
  const region = process.env.AWS_REGION?.trim();

  if (bucketName && region) {
    return new S3StorageService({
      region,
      bucketName,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
    });
  }

  return localStorageService;
}

export const storageService: StorageService = createStorageService();

export function getStorageServiceForProvider(provider?: string | null): StorageService {
  if (provider === "LOCAL") return localStorageService;
  return storageService;
}
