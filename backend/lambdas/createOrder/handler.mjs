import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import crypto from "crypto";

const ddb = new DynamoDBClient({});
const TABLE_NAME = "orders";

export const handler = async (event) => {
  try {
    const body = event?.body ? JSON.parse(event.body) : {};

    const price = body.price;
    const orderDescription = body.orderDescription;

    // Basic validation (keep it minimal for now)
    if (
      typeof orderDescription !== "string" ||
      orderDescription.trim() === ""
    ) {
      return response(400, {
        message: "orderDescription is required (string)",
      });
    }
    if (typeof price !== "number" || Number.isNaN(price) || price < 0) {
      return response(400, { message: "price is required (number >= 0)" });
    }

    const now = new Date().toISOString();

    const order = {
      orderId: crypto.randomUUID(),
      creationDate: now,
      lastModifiedDate: now,
      price,
      orderDescription: orderDescription.trim(),
    };

    await ddb.send(
      new PutItemCommand({
        TableName: TABLE_NAME,
        Item: marshall(order),
      }),
    );

    return response(201, order);
  } catch (err) {
    console.error("createOrder error:", err);
    return response(500, { message: "Internal Server Error" });
  }
};

// Helper to include CORS headers (useful later for the web client)
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
