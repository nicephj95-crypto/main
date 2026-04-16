// src/controllers/auditLogController.ts
import { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { fetchAuditLogs } from "../services/auditLogService";
import { logError } from "../utils/logger";

// GET /audit-logs?resource=REQUEST&resourceId=123&limit=50&offset=0
export async function getAuditLogs(req: AuthRequest, res: Response) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      return res.status(403).json({ message: "변경이력 조회 권한이 없습니다." });
    }

    const resource = typeof req.query.resource === "string" ? req.query.resource : undefined;
    const target = typeof req.query.target === "string" ? req.query.target : undefined;
    const resourceIdRaw = typeof req.query.resourceId === "string" ? Number(req.query.resourceId) : undefined;
    const resourceId = resourceIdRaw != null && !Number.isNaN(resourceIdRaw) ? resourceIdRaw : undefined;
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const offset = Number(req.query.offset) || 0;

    const result = await fetchAuditLogs({ resource, resourceId, target, limit, offset });
    return res.json(result);
  } catch (err) {
    logError("getAuditLogs", err);
    return res.status(500).json({ message: "변경이력 조회 중 오류가 발생했습니다." });
  }
}
