import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireAdmin } from "../middleware/roleMiddleware";
import { getSettings, updateSettings } from "../controllers/settingsController";

const router = Router();

router.get("/", authMiddleware, getSettings);
router.patch("/", authMiddleware, requireAdmin, updateSettings);

export default router;
