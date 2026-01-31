import { apiFetch, setJson, setLoading, setText } from "./utils.js";

const resultEl = document.getElementById("result");

const subEmailInput = document.getElementById("subEmail");
const subBtn = document.getElementById("subBtn");

const unsubEmailInput = document.getElementById("unsubEmail");
const unsubBtn = document.getElementById("unsubBtn");

function isValidEmail(email) {
  return (
    typeof email === "string" && email.includes("@") && email.includes(".")
  );
}

function showError(err) {
  setText(
    resultEl,
    `Error: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`,
  );
}

// -------- SUBSCRIBE --------
subBtn.addEventListener("click", async () => {
  const email = subEmailInput.value.trim();
  if (!isValidEmail(email)) {
    setText(resultEl, "Please enter a valid email address.");
    return;
  }

  try {
    setLoading(resultEl, "Sending subscribe request...");
    const data = await apiFetch("/notifications/subscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setJson(resultEl, {
      message: "Subscription request sent. Please confirm via email.",
      response: data,
    });
  } catch (err) {
    showError(err);
  }
});

// -------- UNSUBSCRIBE --------
unsubBtn.addEventListener("click", async () => {
  const email = unsubEmailInput.value.trim();
  if (!isValidEmail(email)) {
    setText(resultEl, "Please enter a valid email address.");
    return;
  }

  const confirmed = window.confirm(`Unsubscribe ${email}?`);
  if (!confirmed) return;

  try {
    setLoading(resultEl, "Unsubscribing...");
    const data = await apiFetch("/notifications/unsubscribe", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    setJson(resultEl, { message: "Unsubscribed successfully", response: data });
  } catch (err) {
    showError(err);
  }
});

setText(resultEl, "Ready. Subscribe or unsubscribe an email address.");
