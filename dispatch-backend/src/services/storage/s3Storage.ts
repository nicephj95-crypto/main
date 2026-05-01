import path from "path";
import { randomUUID } from "crypto";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import type { SaveObjectInput, SaveObjectResult, StorageService, StoredObject } from "./types";

function getExtension(originalName: string, mimeType: string) {
  const extFromName = path.extname(originalName || "").replace(".", "").toLowerCase();
  if (extFromName) return extFromName;
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "bin";
}

function sanitizeKeySegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._=-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sanitizeKeyPrefix(keyPrefix: string): string {
  return keyPrefix
    .split("/")
    .map(sanitizeKeySegment)
    .filter((seg) => seg && seg !== "." && seg !== "..")
    .join("/");
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);

  const maybeTransform = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof maybeTransform.transformToByteArray === "function") {
    return Buffer.from(await maybeTransform.transformToByteArray());
  }

  const stream = body as NodeJS.ReadableStream;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export class S3StorageService implements StorageService {
  private readonly client: S3Client;
  private readonly bucketName: string;

  constructor(options: {
    region: string;
    bucketName: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  }) {
    this.bucketName = options.bucketName;
    this.client = new S3Client({
      region: options.region,
      credentials:
        options.accessKeyId && options.secretAccessKey
          ? {
              accessKeyId: options.accessKeyId,
              secretAccessKey: options.secretAccessKey,
            }
          : undefined,
    });
  }

  async saveObject(input: SaveObjectInput): Promise<SaveObjectResult> {
    const ext = getExtension(input.originalName, input.mimeType);
    const safePrefix = sanitizeKeyPrefix(input.keyPrefix);
    const key = [safePrefix, `${Date.now()}-${randomUUID()}.${ext}`].filter(Boolean).join("/");

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: input.buffer,
        ContentType: input.mimeType,
        Metadata: {
          originalName: encodeURIComponent(input.originalName || "file"),
        },
      })
    );

    return {
      storageProvider: "S3",
      storageKey: key,
      publicUrl: this.getPublicUrl(key),
    };
  }

  async getObject(storageKey: string): Promise<StoredObject | null> {
    try {
      const output = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        })
      );
      return {
        buffer: await bodyToBuffer(output.Body),
        mimeType: output.ContentType,
        contentLength: output.ContentLength,
      };
    } catch (err: any) {
      if (err?.name === "NoSuchKey" || err?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  getPublicUrl(storageKey: string): string {
    return `s3://${this.bucketName}/${storageKey}`;
  }

  async deleteObject(storageKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      })
    );
  }
}
