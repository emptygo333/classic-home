import mongoose from "mongoose";

const commandSchema = new mongoose.Schema(
  {
    commandId: { type: String, required: true },
    controlId: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
      type: String,
      enum: ["queued", "delivered", "acked", "failed"],
      default: "queued"
    },
    createdAt: { type: Date, default: Date.now },
    deliveredAt: { type: Date, default: null },
    ackedAt: { type: Date, default: null },
    result: { type: String, default: "" }
  },
  { _id: false }
);

const deviceSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, unique: true, index: true },
    state: { type: mongoose.Schema.Types.Mixed, default: {} },
    pendingCommands: { type: [commandSchema], default: [] },
    lastSeenAt: { type: Date, default: null }
  },
  { timestamps: true }
);

export const Device = mongoose.model("Device", deviceSchema);
