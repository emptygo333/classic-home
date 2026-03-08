import { Form } from "../models/form.model.js";

export async function getFormBySlug(req, res, next) {
  try {
    const form = await Form.findOne({ slug: req.params.slug }).lean();
    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }
    form.divs = [...(form.divs || [])].sort((a, b) => (a.divOrder || 0) - (b.divOrder || 0));
    return res.json(form);
  } catch (err) {
    return next(err);
  }
}

export async function upsertFormBySlug(req, res, next) {
  try {
    const { title, description, divs } = req.body ?? {};
    if (!title || !Array.isArray(divs)) {
      return res.status(400).json({ error: "title and divs are required" });
    }

    const form = await Form.findOneAndUpdate(
      { slug: req.params.slug },
      {
        slug: req.params.slug,
        title,
        description: description || "",
        divs
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return res.json(form);
  } catch (err) {
    return next(err);
  }
}
