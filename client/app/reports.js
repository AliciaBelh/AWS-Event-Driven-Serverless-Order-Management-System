import { apiFetch, copyText, setJson, setLoading, setText } from "./utils.js";

const resultEl = document.getElementById("result");
const genBtn = document.getElementById("genBtn");

const urlInput = document.getElementById("downloadUrl");
const copyBtn = document.getElementById("copyBtn");
const urlHint = document.getElementById("urlHint");

function showError(err) {
  setText(
    resultEl,
    `Error: ${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`,
  );
}

genBtn.addEventListener("click", async () => {
  try {
    setLoading(resultEl, "Generating PDF report...");
    urlHint.textContent = "";
    urlInput.value = "";

    const data = await apiFetch("/reports/deleted-orders", { method: "GET" });

    // Expect: { message, pdfKey, downloadUrl }
    urlInput.value = data.downloadUrl || "";
    urlHint.textContent = data.downloadUrl
      ? "Tip: Click the copy button, open a new tab, and paste the URL."
      : "No downloadUrl returned.";

    const { downloadUrl, ...safeData } = data;
    setJson(resultEl, safeData);
  } catch (err) {
    showError(err);
  }
});

copyBtn.addEventListener("click", async () => {
  const url = urlInput.value.trim();
  if (!url) {
    setText(resultEl, "No URL to copy yet. Click Generate Report first.");
    return;
  }

  try {
    await copyText(url);
    urlHint.textContent = "Copied! Now open a new tab and paste the URL.";
  } catch (err) {
    setText(resultEl, "Copy failed. Your browser may block clipboard access.");
  }
});

setText(
  resultEl,
  "Ready. Click Generate Report to create a PDF and receive a URL.",
);
