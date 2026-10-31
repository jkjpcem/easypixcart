import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const bucket = process.env.R2_BUCKET!;

const client = new S3Client({
  region: "auto",
  // S3_ENDPOINT overrides R2 so local development can use Supabase's local S3-compatible storage.
  endpoint: process.env.S3_ENDPOINT ?? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  forcePathStyle: Boolean(process.env.S3_ENDPOINT),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export function signedUploadUrl(key: string, contentType: string, expiresIn = 900) {
  return getSignedUrl(client, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn });
}

export function signedDownloadUrl(key: string, expiresIn = 3600) {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export function thumbKeyFor(originalKey: string) {
  return originalKey.replace("/originals/", "/thumbs/").replace(/\.[a-z0-9]+$/, ".jpg");
}
