import path from "path";
import { LocalStorageService } from "./localStorage";
import type { StorageService } from "./types";

const uploadsRoot = path.join(process.cwd(), "uploads");

// Start with local storage. Keep factory shape so S3/R2 can replace later.
export const storageService: StorageService = new LocalStorageService(uploadsRoot);

