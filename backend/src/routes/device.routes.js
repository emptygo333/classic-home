import { Router } from "express";
import {
  ackCommand,
  enqueueCommand,
  getDeviceState,
  getNextCommand,
  upsertDeviceState
} from "../controllers/device.controller.js";

const router = Router();

router.post("/:deviceId/commands", enqueueCommand);
router.get("/:deviceId/commands/next", getNextCommand);
router.post("/:deviceId/commands/:commandId/ack", ackCommand);
router.post("/:deviceId/state", upsertDeviceState);
router.get("/:deviceId/state", getDeviceState);

export default router;
