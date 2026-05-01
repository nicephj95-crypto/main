export type SaveObjectInput = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  keyPrefix: string;
};

export type SaveObjectResult = {
  storageProvider: "LOCAL" | "S3";
  storageKey: string;
  publicUrl?: string;
};

export type StoredObject = {
  buffer: Buffer;
  mimeType?: string;
  contentLength?: number;
};

export interface StorageService {
  saveObject(input: SaveObjectInput): Promise<SaveObjectResult>;
  getObject(storageKey: string): Promise<StoredObject | null>;
  getPublicUrl(storageKey: string): string;
  deleteObject(storageKey: string): Promise<void>;
}
