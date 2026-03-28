import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  NoSuchKey,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Response } from "express";
import fs from "fs";
import path from "path";

const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_REGION = process.env.AWS_S3_REGION || "us-east-1";

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({ region: S3_REGION });
  }
  return s3Client;
}

export function isS3Enabled(): boolean {
  return !!S3_BUCKET;
}

export async function uploadFileToS3(
  localFilePath: string,
  s3Key: string,
  contentType?: string
): Promise<string> {
  if (!S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  const fileStream = fs.createReadStream(localFilePath);
  const fileSize = fs.statSync(localFilePath).size;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: fileStream,
    ContentLength: fileSize,
    ContentType: contentType || "application/octet-stream",
  });

  await getS3Client().send(command);
  return s3Key;
}

export async function uploadBufferToS3(
  buffer: Buffer,
  s3Key: string,
  contentType?: string
): Promise<string> {
  if (!S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType || "application/octet-stream",
  });

  await getS3Client().send(command);
  return s3Key;
}

export async function getPresignedUrl(
  s3Key: string,
  expiresInSeconds = 3600,
  overrides?: {
    responseContentDisposition?: string;
    responseContentType?: string;
  }
): Promise<string> {
  if (!S3_BUCKET) {
    throw new Error("AWS_S3_BUCKET is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
    ResponseContentDisposition: overrides?.responseContentDisposition,
    ResponseContentType: overrides?.responseContentType,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn: expiresInSeconds });
}

export async function deleteFromS3(s3Key: string): Promise<void> {
  if (!S3_BUCKET) return;

  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: s3Key,
  });

  await getS3Client().send(command);
}

export function getS3KeyForFile(filename: string, prefix = "uploads"): string {
  return `${prefix}/${filename}`;
}

function isS3NotFoundError(err: unknown): boolean {
  if (err instanceof NoSuchKey) return true;
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e?.name === "NoSuchKey" ||
    e?.Code === "NoSuchKey" ||
    e?.$metadata?.httpStatusCode === 404
  );
}

/**
 * Serve a file from S3 (via presigned URL redirect) or local disk fallback.
 * The presigned URL encodes response headers so Content-Disposition/Content-Type
 * are preserved end-to-end even after the S3 redirect.
 * Returns 404 when the file is not found in either location.
 */
export async function serveOrRedirectS3File(
  res: Response,
  s3Key: string,
  fallbackLocalPath: string,
  options: {
    contentDisposition?: string;
    contentType?: string;
  } = {}
): Promise<void> {
  if (isS3Enabled()) {
    try {
      const url = await getPresignedUrl(s3Key, 3600, {
        responseContentDisposition: options.contentDisposition,
        responseContentType: options.contentType,
      });
      res.redirect(url);
    } catch (err: unknown) {
      if (isS3NotFoundError(err)) {
        res.status(404).json({ message: "File not found" });
      } else {
        throw err;
      }
    }
    return;
  }

  if (!fs.existsSync(fallbackLocalPath)) {
    res.status(404).json({ message: "File not found" });
    return;
  }
  if (options.contentDisposition) {
    res.setHeader("Content-Disposition", options.contentDisposition);
  }
  if (options.contentType) {
    res.setHeader("Content-Type", options.contentType);
  }
  res.sendFile(path.resolve(fallbackLocalPath));
}

/**
 * Download an S3 object to a local temporary file path and return that path.
 * Caller is responsible for cleaning up the temp file after use.
 * Returns null if S3 is not enabled.
 */
export async function downloadFileFromS3(
  s3Key: string,
  localDestPath: string
): Promise<string | null> {
  if (!S3_BUCKET) return null;

  const command = new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key });
  const response = await getS3Client().send(command);
  if (!response.Body) {
    throw new Error(`S3 object has no body: ${s3Key}`);
  }

  const writeStream = fs.createWriteStream(localDestPath);
  return new Promise<string>((resolve, reject) => {
    const readable = response.Body as NodeJS.ReadableStream;
    readable.pipe(writeStream);
    writeStream.on("finish", () => resolve(localDestPath));
    writeStream.on("error", reject);
    readable.on("error", reject);
  });
}
