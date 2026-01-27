import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({});
const TOPIC_ARN = process.env.TOPIC_ARN;

export const handler = async (event) => {
  try {
    // For EventBridge events, the deleted order is in event.detail
    const order = event?.detail;

    if (!order?.orderId) {
      console.error("Missing order details in event.detail:", JSON.stringify(event));
      return;
    }

    const subject = `Order deleted: ${order.orderId}`;

    const message = [
      "An order was deleted.",
      "",
      `Order ID: ${order.orderId}`,
      `Description: ${order.orderDescription}`,
      `Price: ${order.price}`,
      `Created At: ${order.creationDate}`,
      `Last Modified: ${order.lastModifiedDate}`,
    ].join("\n");

    await sns.send(
      new PublishCommand({
        TopicArn: TOPIC_ARN,
        Subject: subject,
        Message: message,
      })
    );

    console.log("Deletion notification published to SNS for:", order.orderId);
  } catch (err) {
    console.error("notifyOrderDeleted error:", err);
  }
};
