import {
  SNSClient,
  ListSubscriptionsByTopicCommand,
  UnsubscribeCommand,
} from "@aws-sdk/client-sns";

const sns = new SNSClient({});
const TOPIC_ARN = process.env.TOPIC_ARN;

export const handler = async (event) => {
  try {
    const body = event?.body ? JSON.parse(event.body) : {};
    const email = body.email;

    if (typeof email !== "string" || !email.includes("@")) {
      return response(400, { message: "Valid email is required" });
    }

    // 1) Find the subscription ARN for this email (may require pagination)
    let nextToken = undefined;
    let foundSubArn = null;

    do {
      const res = await sns.send(
        new ListSubscriptionsByTopicCommand({
          TopicArn: TOPIC_ARN,
          NextToken: nextToken,
        })
      );

      const match = (res.Subscriptions || []).find(
        (s) => (s.Endpoint || "").toLowerCase() === email.toLowerCase()
      );

      if (match) {
        foundSubArn = match.SubscriptionArn;
        break;
      }

      nextToken = res.NextToken;
    } while (nextToken);

    if (!foundSubArn) {
      return response(404, { message: "Email is not subscribed to this topic" });
    }

    // If user never confirmed subscription, SNS keeps this literal value
    if (foundSubArn === "PendingConfirmation") {
      return response(409, {
        message:
          "Subscription is still pending confirmation. Please confirm via the email SNS sent.",
      });
    }

    // 2) Unsubscribe
    await sns.send(new UnsubscribeCommand({ SubscriptionArn: foundSubArn }));

    return response(200, { message: "Unsubscribed successfully", email });
  } catch (err) {
    console.error("unsubscribeEmail error:", err);
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
