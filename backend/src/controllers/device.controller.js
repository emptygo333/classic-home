import crypto from "node:crypto";
import { Device } from "../models/device.model.js";

export async function enqueueCommand(req, res, next) {
  try {
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
  } catch (err) {
    return next(err);
  }
}

export async function getNextCommand(req, res, next) {
  try {
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    if (!device) {
      return res.json({ command: null });
    }

    const nextCommand = device.pendingCommands.find((x) => x.status === "queued");
    if (!nextCommand) {
      device.lastSeenAt = new Date();
      await device.save();
      return res.json({ command: null });
    }

    nextCommand.status = "delivered";
    nextCommand.deliveredAt = new Date();
    device.lastSeenAt = new Date();
    await device.save();

    return res.json({ command: nextCommand });
  } catch (err) {
    return next(err);
  }
}

export async function ackCommand(req, res, next) {
  try {
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
  } catch (err) {
    return next(err);
  }
}

export async function upsertDeviceState(req, res, next) {
  try {
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
  } catch (err) {
    return next(err);
  }
}

export async function getDeviceState(req, res, next) {
  try {
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
  } catch (err) {
    return next(err);
  }
}
