import "dotenv/config";
import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import { connectDb } from "./db.js";
import { Form } from "./models/Form.js";
import { Device } from "./models/Device.js";

const app = express();
const port = Number(process.env.PORT || 8080);
const corsOrigin = process.env.CORS_ORIGIN || "*";

app.use(cors({ origin: corsOrigin === "*" ? true : corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, at: new Date().toISOString() });
});

app.get("/api/forms/:slug", async (req, res) => {
  const form = await Form.findOne({ slug: req.params.slug }).lean();
  if (!form) {
    return res.status(404).json({ error: "Form not found" });
  }
  return res.json(form);
});

app.put("/api/forms/:slug", async (req, res) => {
  const { title, description, components } = req.body ?? {};
  if (!title || !Array.isArray(components)) {
    return res.status(400).json({ error: "title and components are required" });
  }

  const form = await Form.findOneAndUpdate(
    { slug: req.params.slug },
    {
      slug: req.params.slug,
      title,
      description: description || "",
      components
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return res.json(form);
});

app.post("/api/devices/:deviceId/commands", async (req, res) => {
  const { controlId, payload } = req.body ?? {};
  if (!controlId) {
    return res.status(400).json({ error: "controlId is required" });
  }

  const command = {
    commandId: crypto.randomUUID(),
    controlId,
    payload: payload ?? {},
    status: "queued",
    createdAt: new Date()
  };

  const device = await Device.findOneAndUpdate(
    { deviceId: req.params.deviceId },
    {
      $setOnInsert: { deviceId: req.params.deviceId, state: {} },
      $push: { pendingCommands: command }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(201).json({
    command,
    queueLength: device.pendingCommands.filter((x) => x.status === "queued").length
  });
});

app.get("/api/devices/:deviceId/commands/next", async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId });
  if (!device) {
    return res.json({ command: null });
  }

  const next = device.pendingCommands.find((x) => x.status === "queued");
  if (!next) {
    device.lastSeenAt = new Date();
    await device.save();
    return res.json({ command: null });
  }

  next.status = "delivered";
  next.deliveredAt = new Date();
  device.lastSeenAt = new Date();
  await device.save();

  return res.json({ command: next });
});

app.post("/api/devices/:deviceId/commands/:commandId/ack", async (req, res) => {
  const { status, result, statePatch } = req.body ?? {};
  const ackStatus = status === "failed" ? "failed" : "acked";

  const device = await Device.findOne({ deviceId: req.params.deviceId });
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const cmd = device.pendingCommands.find((x) => x.commandId === req.params.commandId);
  if (!cmd) {
    return res.status(404).json({ error: "Command not found" });
  }

  cmd.status = ackStatus;
  cmd.ackedAt = new Date();
  cmd.result = result || "";
  device.lastSeenAt = new Date();

  if (statePatch && typeof statePatch === "object") {
    device.state = { ...(device.state || {}), ...statePatch };
  }

  await device.save();
  return res.json({ ok: true });
});

app.post("/api/devices/:deviceId/state", async (req, res) => {
  const { state, statePatch } = req.body ?? {};
  const patch = state && typeof state === "object" ? state : statePatch;
  if (!patch || typeof patch !== "object") {
    return res.status(400).json({ error: "state or statePatch object is required" });
  }

  const existing = await Device.findOne({ deviceId: req.params.deviceId });
  const mergedState = { ...(existing?.state || {}), ...patch };

  const device = await Device.findOneAndUpdate(
    { deviceId: req.params.deviceId },
    {
      $setOnInsert: { deviceId: req.params.deviceId },
      $set: { state: mergedState, lastSeenAt: new Date() }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ ok: true, state: device.state });
});

app.get("/api/devices/:deviceId/state", async (req, res) => {
  const device = await Device.findOne({ deviceId: req.params.deviceId }).lean();
  if (!device) {
    return res.status(404).json({ error: "Device not found" });
  }

  const recentCommands = [...(device.pendingCommands || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  return res.json({
    deviceId: device.deviceId,
    state: device.state || {},
    lastSeenAt: device.lastSeenAt,
    recentCommands
  });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

async function start() {
  await connectDb(process.env.MONGODB_URI);
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err.message);
  process.exit(1);
});
