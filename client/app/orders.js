import { apiFetch, setJson, setLoading, setText } from "./utils.js";

const resultEl = document.getElementById("result");

// Read UI
const listBtn = document.getElementById("listBtn");
const getBtn = document.getElementById("getBtn");
const getIdInput = document.getElementById("getId");

// Create UI
const createBtn = document.getElementById("createBtn");
const createDescInput = document.getElementById("createDesc");
const createPriceInput = document.getElementById("createPrice");

// Update UI
const updateBtn = document.getElementById("updateBtn");
const updateIdInput = document.getElementById("updateId");
const updateDescInput = document.getElementById("updateDesc");
const updatePriceInput = document.getElementById("updatePrice");


function showError(err) {
  setText(
    resultEl,
    `Error: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`
  );
}

// -------- READ: Get all orders --------
listBtn.addEventListener("click", async () => {
  try {
    setLoading(resultEl, "Loading orders...");
    const data = await apiFetch("/orders", { method: "GET" });
    setJson(resultEl, data);
  } catch (err) {
    showError(err);
  }
});

// -------- READ: Get order by ID --------
getBtn.addEventListener("click", async () => {
  const orderId = getIdInput.value.trim();
  if (!orderId) {
    setText(resultEl, "Please enter an orderId.");
    return;
  }

  try {
    setLoading(resultEl, "Loading order...");
    const data = await apiFetch(`/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
    });
    setJson(resultEl, data);
  } catch (err) {
    showError(err);
  }
});

// -------- CREATE: Create order --------
createBtn.addEventListener("click", async () => {
  const orderDescription = createDescInput.value.trim();
  const priceRaw = createPriceInput.value.trim();

  if (!orderDescription) {
    setText(resultEl, "Please enter a description.");
    return;
  }

  const price = Number(priceRaw);
  if (!priceRaw || Number.isNaN(price) || price < 0) {
    setText(resultEl, "Please enter a valid non-negative price.");
    return;
  }

  try {
    setLoading(resultEl, "Creating order...");

    const payload = { orderDescription, price };

    const data = await apiFetch("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // Optional UX: clear inputs after success
    createDescInput.value = "";
    createPriceInput.value = "";

    setJson(resultEl, {
      message: "Order created successfully",
      createdOrder: data,
    });
  } catch (err) {
    showError(err);
  }
});


// -------- UPDATE: Update order --------
updateBtn.addEventListener("click", async () => {
  const orderId = updateIdInput.value.trim();
  const newDesc = updateDescInput.value.trim();
  const priceRaw = updatePriceInput.value.trim();

  if (!orderId) {
    setText(resultEl, "Please enter an orderId to update.");
    return;
  }

  const payload = {};

  // Only include fields that were entered
  if (newDesc) payload.orderDescription = newDesc;

  if (priceRaw) {
    const price = Number(priceRaw);
    if (Number.isNaN(price) || price < 0) {
      setText(resultEl, "Please enter a valid non-negative price (or leave it empty).");
      return;
    }
    payload.price = price;
  }

  if (Object.keys(payload).length === 0) {
    setText(resultEl, "Please enter at least one field to update (description and/or price).");
    return;
  }

  try {
    setLoading(resultEl, "Updating order...");

    const data = await apiFetch(`/orders/${encodeURIComponent(orderId)}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    // Optional UX: clear optional fields after success
    updateDescInput.value = "";
    updatePriceInput.value = "";

    setJson(resultEl, {
      message: "Order updated successfully",
      updatedOrder: data,
    });
  } catch (err) {
    showError(err);
  }
});

// Initial message
setText(resultEl, "Ready. Create an order or use Read actions.");
