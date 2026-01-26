import {
  DynamoDBClient,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = "orders";

export const handler = async (event) => {
  try {
    const orderId = event?.pathParameters?.orderId;
    if (!orderId)
      return response(400, { message: "orderId is required in path" });

    // 1) Find the existing order (need creationDate to delete)
    const scanRes = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "orderId = :oid",
        ExpressionAttributeValues: {
          ":oid": { S: orderId },
        },
      }),
    );

    const existingItem = scanRes.Items?.[0];
    if (!existingItem) return response(404, { message: "Order not found" });

    const existing = unmarshall(existingItem);

    // 2) Delete using the real key
    await ddb.send(
      new DeleteItemCommand({
        TableName: TABLE_NAME,
        Key: {
          orderId: { S: existing.orderId },
          creationDate: { S: existing.creationDate },
        },
      }),
    );

    // Return the deleted order details
    return response(200, {
      message: "Order deleted",
      deletedOrder: existing,
    });
  } catch (err) {
    console.error("deleteOrder error:", err);
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
