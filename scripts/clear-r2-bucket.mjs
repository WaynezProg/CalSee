/**
 * Script to clear all objects from R2 bucket
 * Usage: node scripts/clear-r2-bucket.mjs
 *
 * Requires environment variables:
 * - AWS_ACCESS_KEY_ID (R2 Access Key ID)
 * - AWS_SECRET_ACCESS_KEY (R2 Secret Access Key)
 * - AWS_REGION (e.g., auto)
 * - S3_BUCKET_NAME (bucket name)
 * - S3_ENDPOINT (R2 endpoint URL)
 */

import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";

// Load environment variables from .env.production.local (for R2 cleanup)
config({ path: ".env.production.local" });

const BUCKET_NAME = process.env.S3_BUCKET || process.env.S3_BUCKET_NAME;
const ENDPOINT = process.env.S3_ENDPOINT;
const REGION = process.env.S3_REGION || process.env.AWS_REGION || "auto";
const ACCESS_KEY = process.env.S3_ACCESS_KEY || process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.S3_SECRET_KEY || process.env.AWS_SECRET_ACCESS_KEY;

if (!BUCKET_NAME || !ENDPOINT) {
  console.error("Missing required environment variables:");
  console.error("- S3_BUCKET:", BUCKET_NAME ? "OK" : "MISSING");
  console.error("- S3_ENDPOINT:", ENDPOINT ? "OK" : "MISSING");
  process.exit(1);
}

const s3Client = new S3Client({
  region: REGION,
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY || "",
    secretAccessKey: SECRET_KEY || "",
  },
});

async function clearBucket() {
  console.log(`Clearing bucket: ${BUCKET_NAME}`);
  console.log(`Endpoint: ${ENDPOINT}`);
  console.log("");

  let totalDeleted = 0;
  let continuationToken = undefined;

  do {
    // List objects
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length === 0) {
      console.log("No more objects to delete.");
      break;
    }

    console.log(`Found ${objects.length} objects to delete...`);

    // Delete objects in batch
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: BUCKET_NAME,
      Delete: {
        Objects: objects.map((obj) => ({ Key: obj.Key })),
        Quiet: false,
      },
    });

    const deleteResponse = await s3Client.send(deleteCommand);
    const deletedCount = deleteResponse.Deleted?.length || 0;
    totalDeleted += deletedCount;

    console.log(`Deleted ${deletedCount} objects.`);

    if (deleteResponse.Errors && deleteResponse.Errors.length > 0) {
      console.error("Errors:", deleteResponse.Errors);
    }

    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  console.log("");
  console.log(`Total deleted: ${totalDeleted} objects`);
  console.log("Bucket cleared successfully!");
}

clearBucket().catch((err) => {
  console.error("Error clearing bucket:", err);
  process.exit(1);
});
