import { SNSClient, SubscribeCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({});
const TOPIC_ARN = process.env.TOPIC_ARN;

export const handler = async (event) => {
  try {
    const body = event?.body ? JSON.parse(event.body) : {};
    const email = body.email;

    if (typeof email !== "string" || !email.includes("@")) {
      return response(400, { message: "Valid email is required" });
    }

    const res = await sns.send(
      new SubscribeCommand({
        TopicArn: TOPIC_ARN,
        Protocol: "email",
        Endpoint: email,
      })
    );

    return response(200, {
      message: "Subscription request sent. Please confirm via email.",
      subscriptionArn: res.SubscriptionArn,
    });
  } catch (err) {
    console.error("subscribeEmail error:", err);
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
