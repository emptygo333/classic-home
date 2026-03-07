import "dotenv/config";
import { connectDb } from "./db.js";
import { Form } from "./models/Form.js";

const slug = "smart-device-main";

const defaultForm = {
  slug,
  title: "Smart Device",
  description: "Runtime UI schema for ESP8266 controls",
  components: [
    {
      id: "title1",
      type: "label",
      text: "Light (เปิดไฟ)",
      style: { className: "row-title" }
    },
    {
      id: "light-on",
      type: "button",
      text: "On",
      action: { type: "command", payload: { relay: "light", state: "on" } }
    },
    {
      id: "light-off",
      type: "button",
      text: "Off",
      action: { type: "command", payload: { relay: "light", state: "off" } }
    },
    {
      id: "title2",
      type: "label",
      text: "Watering",
      style: { className: "row-title" }
    },
    {
      id: "water-seconds",
      type: "editText",
      text: "Duration (sec)",
      placeholder: "ex: 10",
      bindingKey: "wateringSeconds"
    },
    {
      id: "watering-start",
      type: "button",
      text: "Water",
      action: {
        type: "command",
        payload: { relay: "water", state: "start", useBinding: "wateringSeconds" }
      }
    }
  ]
};

async function seed() {
  await connectDb(process.env.MONGODB_URI);
  await Form.findOneAndUpdate({ slug }, defaultForm, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true
  });
  console.log(`Seeded form: ${slug}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
