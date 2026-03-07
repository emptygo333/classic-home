const API_BASE_URL = "http://localhost:8080";
const FORM_SLUG = "smart-device-main";
const DEVICE_ID = "esp8266-lab-01";
const POLL_INTERVAL_MS = 5000;

const formTitleEl = document.getElementById("formTitle");
const formDescriptionEl = document.getElementById("formDescription");
const formRootEl = document.getElementById("formRoot");
const toastEl = document.getElementById("toast");
const deviceIdTextEl = document.getElementById("deviceIdText");
const lastSeenTextEl = document.getElementById("lastSeenText");
const stateTextEl = document.getElementById("stateText");

const bindings = {};

async function fetchJson(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch (_e) {
      // ignore parse error
    }
    throw new Error(msg);
  }
  return res.json();
}

function showToast(text, isError = false) {
  toastEl.textContent = text;
  toastEl.classList.remove("hidden");
  toastEl.classList.toggle("error", isError);
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toastEl.classList.add("hidden");
  }, 2200);
}

function makeGroup(title) {
  const card = document.createElement("article");
  card.className = "group-card";

  if (title) {
    const h3 = document.createElement("h3");
    h3.className = "group-title";
    h3.textContent = title;
    card.appendChild(h3);
  }

  return card;
}

function makeInputControl(component) {
  const bindingKey = component.bindingKey || component.id;

  const wrap = document.createElement("div");
  wrap.className = "input-wrap";

  const label = document.createElement("label");
  label.textContent = component.text || component.id;
  wrap.appendChild(label);

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = component.placeholder || "";
  input.value = bindings[bindingKey] || "";
  input.addEventListener("input", () => {
    bindings[bindingKey] = input.value;
  });
  wrap.appendChild(input);

  return wrap;
}

async function postCommand(component, buttonEl) {
  const actionPayload = { ...(component.action?.payload || {}) };

  if (typeof actionPayload.useBinding === "string") {
    const key = actionPayload.useBinding;
    actionPayload[key] = bindings[key] || "";
    delete actionPayload.useBinding;
  }

  buttonEl.disabled = true;
  try {
    await fetchJson(`/api/devices/${DEVICE_ID}/commands`, {
      method: "POST",
      body: JSON.stringify({
        controlId: component.id,
        payload: actionPayload
      })
    });
    showToast(`Queued: ${component.text}`);
  } catch (err) {
    showToast(`Command error: ${err.message}`, true);
  } finally {
    buttonEl.disabled = false;
  }
}

function makeButtonControl(component) {
  const button = document.createElement("button");
  button.className = "btn";
  button.textContent = component.text || "Action";
  button.addEventListener("click", () => postCommand(component, button));
  return button;
}

function createControl(component) {
  if (component.type === "editText") {
    return makeInputControl(component);
  }
  if (component.type === "button") {
    return makeButtonControl(component);
  }
  return null;
}

function renderForm(form) {
  formTitleEl.textContent = form.title || "Smart Device";
  formDescriptionEl.textContent = form.description || "";
  formRootEl.innerHTML = "";

  let currentGroup = null;
  let currentRow = null;

  function startGroup(title = "Controls") {
    currentGroup = makeGroup(title);
    currentRow = document.createElement("div");
    currentRow.className = "control-row";
    currentGroup.appendChild(currentRow);
  }

  function flushGroup() {
    if (currentGroup && currentRow && currentRow.childElementCount > 0) {
      formRootEl.appendChild(currentGroup);
    }
  }

  for (const component of form.components || []) {
    if (component.type === "label") {
      flushGroup();
      startGroup(component.text);
      continue;
    }

    if (!currentGroup) {
      startGroup();
    }

    const node = createControl(component);
    if (node) {
      currentRow.appendChild(node);
    }
  }

  flushGroup();
}

async function refreshDeviceState() {
  try {
    const data = await fetchJson(`/api/devices/${DEVICE_ID}/state`);
    deviceIdTextEl.textContent = data.deviceId || DEVICE_ID;
    lastSeenTextEl.textContent = data.lastSeenAt
      ? new Date(data.lastSeenAt).toLocaleString()
      : "-";
    stateTextEl.textContent = JSON.stringify(data.state || {});
  } catch (_e) {
    deviceIdTextEl.textContent = DEVICE_ID;
    lastSeenTextEl.textContent = "-";
    stateTextEl.textContent = "No state yet";
  }
}

async function boot() {
  deviceIdTextEl.textContent = DEVICE_ID;

  try {
    const form = await fetchJson(`/api/forms/${FORM_SLUG}`);
    renderForm(form);
  } catch (err) {
    formRootEl.innerHTML = `<article class="group-card">Load form failed: ${err.message}</article>`;
    return;
  }

  await refreshDeviceState();
  window.setInterval(refreshDeviceState, POLL_INTERVAL_MS);
}

boot();
