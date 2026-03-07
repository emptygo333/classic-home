import mongoose from "mongoose";

const actionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["command", "none"], default: "none" },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const componentSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["label", "button", "editText"], required: true },
    text: { type: String, default: "" },
    placeholder: { type: String, default: "" },
    bindingKey: { type: String, default: "" },
    action: { type: actionSchema, default: () => ({ type: "none", payload: {} }) },
    style: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  { _id: false }
);

const formSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    components: { type: [componentSchema], default: [] }
  },
  { timestamps: true }
);

export const Form = mongoose.model("Form", formSchema);
