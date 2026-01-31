// Hardcoded API base URL (no user input)
const API_BASE_URL = "https://jn4db2lf76.execute-api.us-east-1.amazonaws.com/dev";

const resultEl = document.getElementById("result");

function setResult(obj) {
  resultEl.textContent = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

// Wire buttons (no API calls yet)
document.getElementById("createBtn").addEventListener("click", () => {
  setResult({ todo: "Create order (POST /orders) - not implemented yet" });
});

document.getElementById("listBtn").addEventListener("click", () => {
  setResult({ todo: "List orders (GET /orders) - not implemented yet" });
});

document.getElementById("getBtn").addEventListener("click", () => {
  setResult({ todo: "Get order by ID (GET /orders/{orderId}) - not implemented yet" });
});

document.getElementById("updateBtn").addEventListener("click", () => {
  setResult({ todo: "Update order (PUT /orders/{orderId}) - not implemented yet" });
});

document.getElementById("deleteBtn").addEventListener("click", () => {
  setResult({ todo: "Delete order (DELETE /orders/{orderId}) - not implemented yet" });
});

setResult({
  message: "Orders CRUD UI loaded",
  apiBaseUrl: API_BASE_URL,
  next: "We will implement one API call at a time.",
});
