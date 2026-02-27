export type SaveObjectInput = {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  keyPrefix: string;
};

export type SaveObjectResult = {
  storageProvider: "LOCAL";
  storageKey: string;
  publicUrl?: string;
};

export interface StorageService {
  saveObject(input: SaveObjectInput): Promise<SaveObjectResult>;
  getPublicUrl(storageKey: string): string;
  deleteObject(storageKey: string): Promise<void>;
}

