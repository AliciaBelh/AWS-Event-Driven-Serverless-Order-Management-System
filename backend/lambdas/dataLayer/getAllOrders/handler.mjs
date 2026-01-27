import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const ddb = new DynamoDBClient({});
const TABLE_NAME = "orders";

export const handler = async () => {
  try {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
      }),
    );

    const items = (result.Items || []).map((it) => unmarshall(it));

    // Sort by creationDate ascending (oldest -> newest)
    items.sort((a, b) =>
      (a.creationDate || "").localeCompare(b.creationDate || ""),
    );

    return response(200, items);
  } catch (err) {
    console.error("getAllOrders error:", err);
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
