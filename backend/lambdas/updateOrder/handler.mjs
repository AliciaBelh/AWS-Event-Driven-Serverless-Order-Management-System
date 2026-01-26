import { DynamoDBClient, ScanCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = "orders";

export const handler = async (event) => {
  try {
    const orderId = event?.pathParameters?.orderId;
    if (!orderId) return response(400, { message: "orderId is required in path" });

    const body = event?.body ? JSON.parse(event.body) : {};
    const hasPrice = Object.prototype.hasOwnProperty.call(body, "price");
    const hasDesc = Object.prototype.hasOwnProperty.call(body, "orderDescription");

    if (!hasPrice && !hasDesc) {
      return response(400, { message: "Provide at least one field: price and/or orderDescription" });
    }

    if (hasPrice && (typeof body.price !== "number" || Number.isNaN(body.price) || body.price < 0)) {
      return response(400, { message: "price must be a number >= 0" });
    }

    if (hasDesc && (typeof body.orderDescription !== "string" || body.orderDescription.trim() === "")) {
      return response(400, { message: "orderDescription must be a non-empty string" });
    }

    // 1) Find the existing order (we need creationDate for the DynamoDB key)
    const scanRes = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "orderId = :oid",
        ExpressionAttributeValues: {
          ":oid": { S: orderId },
        },
      })
    );

    const existing = scanRes.Items?.[0];
    if (!existing) return response(404, { message: "Order not found" });

    const existingObj = unmarshall(existing);
    const creationDate = existingObj.creationDate;

    // 2) Build update expression dynamically
    const updates = [];
    const names = {};
    const values = {};

    if (hasPrice) {
      names["#price"] = "price";
      values[":price"] = { N: String(body.price) };
      updates.push("#price = :price");
    }

    if (hasDesc) {
      names["#desc"] = "orderDescription";
      values[":desc"] = { S: body.orderDescription.trim() };
      updates.push("#desc = :desc");
    }

    const now = new Date().toISOString();
    names["#lmd"] = "lastModifiedDate";
    values[":lmd"] = { S: now };
    updates.push("#lmd = :lmd");

    const updateRes = await ddb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          orderId: { S: orderId },
          creationDate: { S: creationDate },
        },
        UpdateExpression: "SET " + updates.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
      })
    );

    const updated = unmarshall(updateRes.Attributes);
    return response(200, updated);
  } catch (err) {
    console.error("updateOrder error:", err);
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
