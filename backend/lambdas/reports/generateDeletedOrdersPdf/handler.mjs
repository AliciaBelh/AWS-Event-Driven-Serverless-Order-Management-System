import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET_NAME = process.env.BUCKET_NAME;
const DELETED_PREFIX = process.env.DELETED_PREFIX || "deleted-orders/";

// Helper: stream -> string
async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export const handler = async () => {
  try {
    if (!BUCKET_NAME) {
      return response(500, { message: "Missing BUCKET_NAME env var" });
    }

    // 1) List TXT files
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

    // 2) Read each TXT (limit how much we return in response)
    const previews = [];
    const MAX_FILES = 20; // safe limit for now
    const MAX_CHARS_PER_FILE = 800;

    for (const key of keys.slice(0, MAX_FILES)) {
      const getRes = await s3.send(
        new GetObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
        })
      );

      const text = await streamToString(getRes.Body);
      previews.push({
        key,
        preview: text.slice(0, MAX_CHARS_PER_FILE),
      });
    }

    return response(200, {
      bucket: BUCKET_NAME,
      prefix: DELETED_PREFIX,
      txtFilesCount: keys.length,
      returnedPreviews: previews.length,
      previews,
      note:
        keys.length > MAX_FILES
          ? `Only first ${MAX_FILES} files were read for preview.`
          : "All files were read for preview.",
    });
  } catch (err) {
    console.error("read deleted orders error:", err);
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
