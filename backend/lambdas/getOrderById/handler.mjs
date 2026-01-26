import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = "orders";

export const handler = async (event) => {
  try {
    const orderId = event?.pathParameters?.orderId;

    if (!orderId) {
      return response(400, { message: "orderId is required in path" });
    }

    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: "orderId = :oid",
        ExpressionAttributeValues: {
          ":oid": { S: orderId },
        },
      }),
    );

    const item = result.Items?.[0];
    if (!item) {
      return response(404, { message: "Order not found" });
    }

    return response(200, unmarshall(item));
  } catch (err) {
    console.error("getOrderById error:", err);
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
