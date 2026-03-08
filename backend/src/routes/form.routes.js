import { Router } from "express";
import { getFormBySlug, upsertFormBySlug } from "../controllers/form.controller.js";

const router = Router();

router.get("/:slug", getFormBySlug);
router.put("/:slug", upsertFormBySlug);

export default router;
