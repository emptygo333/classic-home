import "dotenv/config";
import { connectDb } from "./db.js";
import { Form } from "./models/form.model.js";

const slug = "smart-device-main";

const defaultForm = {
  slug,
  title: "Classic House Control Panel",
  description: "Runtime div-based UI",
  divs: [
    {
      divOrder: 10001,
      divId: "0001",
      text: "Kitchen Light",
      type: "toggle",
      pinNumber: 12,
      options: {
        buttons: [
          { id: "on", label: "On", payload: { state: "on" } },
          { id: "off", label: "Off", payload: { state: "off" } }
        ]
      }
    },
    {
      divOrder: 10002,
      divId: "0002",
      text: "Go to Camera",
      type: "link",
      options: {
        url: "https://example.com/camera",
        buttonLabel: "Open"
      }
    },
    {
      divOrder: 10003,
      divId: "0003",
      text: "Watering Time (sec)",
      type: "input",
      pinNumber: 5,
      options: {
        input: {
          name: "seconds",
          defaultValue: "60",
          placeholder: "Enter seconds"
        },
        submit: {
          label: "Submit",
          payloadTemplate: { action: "water" }
        }
      }
    }
  ]
};

async function seed() {
  await connectDb(process.env.MONGODB_URI);
  await Form.findOneAndUpdate({ slug }, defaultForm, {
    upsert: true,
    new: true,
    setDefaultsOnInsert: true,
    runValidators: true
  });
  console.log(`Seeded form: ${slug}`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
