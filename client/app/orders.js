import { apiFetch, setJson, setLoading, setText } from "./utils.js";

const resultEl = document.getElementById("result");
const listBtn = document.getElementById("listBtn");
const getBtn = document.getElementById("getBtn");
const getIdInput = document.getElementById("getId");

function showError(err) {
  setText(resultEl, `Error: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`);
}

listBtn.addEventListener("click", async () => {
  try {
    setLoading(resultEl, "Loading orders...");
    const data = await apiFetch("/orders", { method: "GET" });
    setJson(resultEl, data);
  } catch (err) {
    showError(err);
  }
});

getBtn.addEventListener("click", async () => {
  const orderId = getIdInput.value.trim();
  if (!orderId) {
    setText(resultEl, "Please enter an orderId.");
    return;
  }

  try {
    setLoading(resultEl, "Loading order...");
    const data = await apiFetch(`/orders/${encodeURIComponent(orderId)}`, { method: "GET" });
    setJson(resultEl, data);
  } catch (err) {
    showError(err);
  }
});

// Initial message
setText(resultEl, "Ready. Click 'Get All Orders' to start.");
