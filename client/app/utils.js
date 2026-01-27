function getApiBaseUrl() {
  const base = window.API_BASE_URL;
  if (!base) throw new Error("API_BASE_URL is not set (window.API_BASE_URL).");
  return base.replace(/\/$/, "");
}

export async function apiFetch(path, options = {}) {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const headers = {
    ...(options.headers || {}),
  };

  // If sending JSON body, ensure Content-Type
  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  // Try to parse JSON, but handle non-JSON too
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && data.message) ||
      (data && data.body && (() => { try { return JSON.parse(data.body).message; } catch { return null; } })()) ||
      `Request failed with status ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  // Your Lambdas often return { statusCode, headers, body } shape.
  // If so, unwrap the body automatically when it looks like that.
  if (data && typeof data === "object" && "statusCode" in data && "body" in data) {
    try {
      return JSON.parse(data.body);
    } catch {
      return data.body;
    }
  }

  return data;
}

export function setJson(preEl, obj) {
  preEl.textContent = JSON.stringify(obj, null, 2);
}

export function setText(preEl, text) {
  preEl.textContent = String(text);
}

export function setLoading(preEl, label = "Loading...") {
  preEl.textContent = label;
}

export async function copyText(text) {
  await navigator.clipboard.writeText(text);
}
