// src/routes/auditLogRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { getAuditLogs } from "../controllers/auditLogController";

const router = Router();

router.get("/", authMiddleware, requireRole("ADMIN"), getAuditLogs);

export default router;
