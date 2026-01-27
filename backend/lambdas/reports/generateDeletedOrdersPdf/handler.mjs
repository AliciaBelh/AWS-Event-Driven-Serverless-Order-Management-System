import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  GetObjectCommand as GetObjectForUrlCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({});

const BUCKET_NAME = process.env.BUCKET_NAME;
const DELETED_PREFIX = process.env.DELETED_PREFIX || "deleted-orders/";
const REPORTS_PREFIX = process.env.REPORTS_PREFIX || "reports/";
const URL_EXPIRES_SECONDS = Number(process.env.URL_EXPIRES_SECONDS || "3600");

// Helper: stream -> string
async function streamToString(stream) {
  return await new Promise((resolve, reject) => {
    const chunks = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

// Split array into chunks
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * Multi-page minimal PDF generator using Helvetica and plain text.
 * - One shared Font object
 * - One Page object + one content stream per page
 */
function createMultiPagePdf(title, allLines) {
  // Keep text PDF-safe (escape \ ( ) and strip non-ASCII to avoid mojibake issues)
  const esc = (s) =>
    String(s)
      .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ") // replace non-ascii with space
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  // Layout constants (A4-ish in points)
  const left = 50;
  const top = 800;
  const lineHeight = 14;

  // How many text lines fit per page (title line + blank space + content)
  // We keep it conservative to avoid cutting at bottom.
  const LINES_PER_PAGE = 45;

  const pages = chunk(allLines, LINES_PER_PAGE);

  // Objects will be:
  // 1: Catalog
  // 2: Pages
  // 3..(2+N): Page objects
  // Next: Font object
  // Next: N content stream objects
  const objects = [];

  const N = pages.length || 1;

  // Placeholder arrays for object numbers
  const pageObjNums = [];
  const contentObjNums = [];

  // Object numbers:
  // 1 catalog
  // 2 pages
  // pages: 3..(2+N)
  for (let i = 0; i < N; i++) pageObjNums.push(3 + i);

  // font object after pages
  const fontObjNum = 3 + N;

  // content objects after font: (fontObjNum+1)..(fontObjNum+N)
  for (let i = 0; i < N; i++) contentObjNums.push(fontObjNum + 1 + i);

  // 1) Catalog
  objects.push(Buffer.from("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"));

  // 2) Pages with Kids
  const kids = pageObjNums.map((n) => `${n} 0 R`).join(" ");
  objects.push(
    Buffer.from(`2 0 obj\n<< /Type /Pages /Kids [${kids}] /Count ${N} >>\nendobj\n`)
  );

  // 3.. page objects (each points to its content + shared font)
  for (let i = 0; i < N; i++) {
    const pageNum = pageObjNums[i];
    const contentNum = contentObjNums[i];
    objects.push(
      Buffer.from(
        `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] ` +
          `/Resources << /Font << /F1 ${fontObjNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`
      )
    );
  }

  // Font object (Helvetica)
  objects.push(
    Buffer.from(
      `${fontObjNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`
    )
  );

  // Content streams (one per page)
  for (let i = 0; i < N; i++) {
    const pageIndex = i + 1;
    const pageLines = pages[i] || [];

    const streamLines = [];
    streamLines.push("BT");
    streamLines.push("/F1 12 Tf");
    streamLines.push(`${left} ${top} Td`);
    // Title + page indicator on every page
    streamLines.push(`(${esc(`${title}  (Page ${pageIndex} of ${N})`)}) Tj`);
    streamLines.push(`0 -${lineHeight * 2} Td`);

    for (const l of pageLines) {
      streamLines.push(`(${esc(l)}) Tj`);
      streamLines.push(`0 -${lineHeight} Td`);
    }
    streamLines.push("ET");

    const stream = streamLines.join("\n");
    const streamBytes = Buffer.from(stream, "utf-8");

    const objNum = contentObjNums[i];
    objects.push(
      Buffer.concat([
        Buffer.from(`${objNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`),
        streamBytes,
        Buffer.from("\nendstream\nendobj\n"),
      ])
    );
  }

  // Assemble PDF with xref
  const header = Buffer.from("%PDF-1.4\n");
  let offset = header.length;

  const offsets = [0]; // xref entry 0
  const bodyParts = [header];

  // We must write objects in order 1..(2+N pages + font + N contents)
  // Our objects[] is already in that order.
  for (const obj of objects) {
    offsets.push(offset);
    bodyParts.push(obj);
    offset += obj.length;
  }

  const xrefStart = offset;
  const objCount = offsets.length; // includes 0

  let xref = `xref\n0 ${objCount}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < objCount; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer =
    `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  bodyParts.push(Buffer.from(xref));
  bodyParts.push(Buffer.from(trailer));

  return Buffer.concat(bodyParts);
}

export const handler = async () => {
  try {
    if (!BUCKET_NAME) return response(500, { message: "Missing BUCKET_NAME env var" });

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

    // 2) Read contents (limit for safety)
    const MAX_FILES_TO_INCLUDE = 200; // higher now that we have multi-page
    const contents = [];

    for (const key of keys.slice(0, MAX_FILES_TO_INCLUDE)) {
      const getRes = await s3.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
      const text = await streamToString(getRes.Body);
      contents.push({ key, text });
    }

    const now = new Date().toISOString();
    const title = `Deleted Orders Summary (${now})`;

    const lines = [];
    lines.push(`Total deleted orders (TXT files found): ${keys.length}`);
    lines.push(`Included in this PDF: ${Math.min(keys.length, MAX_FILES_TO_INCLUDE)}`);
    lines.push("");

    for (const item of contents) {
      lines.push(`--- ${item.key} ---`);
      const cleaned = item.text.replace(/\r/g, "").split("\n").slice(0, 12);
      for (const l of cleaned) lines.push(l);
      lines.push("");
    }

    // 3) Build multi-page PDF bytes
    const pdfBuffer = createMultiPagePdf(title, lines);

    // 4) Upload PDF to S3
    const pdfKey = `${REPORTS_PREFIX}deleted-orders-summary-${now.replace(/[:.]/g, "-")}.pdf`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      })
    );

    // 5) Return presigned URL
    const url = await getSignedUrl(
      s3,
      new GetObjectForUrlCommand({ Bucket: BUCKET_NAME, Key: pdfKey }),
      { expiresIn: URL_EXPIRES_SECONDS }
    );

    return response(200, { message: "PDF summary generated", pdfKey, downloadUrl: url });
  } catch (err) {
    console.error("generateDeletedOrdersPdf error:", err);
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
