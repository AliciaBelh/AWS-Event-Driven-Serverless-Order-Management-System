import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});
const BUCKET_NAME = "deleted-orders-backup-alicia";

export const handler = async (event) => {
  try {
    const deletedOrder = event.detail;

    if (!deletedOrder || !deletedOrder.orderId) {
      console.error("Invalid event payload:", event);
      return;
    }

    const fileName = `deleted-orders/${deletedOrder.orderId}-${deletedOrder.creationDate}.txt`;

    const content = `
Order ID: ${deletedOrder.orderId}
Description: ${deletedOrder.orderDescription}
Price: ${deletedOrder.price}
Created At: ${deletedOrder.creationDate}
Deleted At: ${new Date().toISOString()}
`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: fileName,
        Body: content,
        ContentType: "text/plain",
      })
    );

    console.log("Deleted order backed up to S3:", fileName);
  } catch (err) {
    console.error("S3 backup failed:", err);
  }
};
