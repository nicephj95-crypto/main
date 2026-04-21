import { Response } from "express";
import type { AuthRequest } from "../../middleware/authMiddleware";
import { fetchDispatchTracking } from "../../services/tracking/trackingService";
import type { TrackingProviderName } from "../../services/tracking/trackingTypes";
import { logError } from "../../utils/logger";

function parseProvider(value: unknown): TrackingProviderName | null {
  if (value === "mock" || value === "hwamul24" || value === "insung") return value;
  return null;
}

export async function getRequestTracking(req: AuthRequest, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "유효하지 않은 요청 ID입니다." });
    }

    const provider = parseProvider(req.query.provider);
    const mockCase = typeof req.query.mockCase === "string" ? req.query.mockCase : null;
    const result = await fetchDispatchTracking(req, id, { provider, mockCase });
    if (!result.ok) {
      return res.status(result.status).json({ message: result.message });
    }

    return res.json(result.data);
  } catch (err) {
    logError("getRequestTracking", err);
    return res.status(500).json({ message: "배차 위치 정보를 조회하는 중 오류가 발생했습니다." });
  }
}
