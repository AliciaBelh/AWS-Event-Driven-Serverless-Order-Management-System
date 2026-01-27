import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;
const DELETED_PREFIX = process.env.DELETED_PREFIX || "deleted-orders/";

export const handler = async () => {
  try {
    if (!BUCKET_NAME) {
      return response(500, { message: "Missing BUCKET_NAME env var" });
    }

    const keys = [];
    let continuationToken = undefined;

    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: BUCKET_NAME,
          Prefix: DELETED_PREFIX,
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of res.Contents || []) {
        if (obj.Key && obj.Key.endsWith(".txt")) keys.push(obj.Key);
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    return response(200, {
      bucket: BUCKET_NAME,
      prefix: DELETED_PREFIX,
      txtFilesCount: keys.length,
      txtFiles: keys,
    });
  } catch (err) {
    console.error("list deleted orders error:", err);
    return response(500, { message: "Internal Server Error" });
  }
};

function response(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(data),
  };
}
