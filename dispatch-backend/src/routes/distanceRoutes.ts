import express, { Response } from "express";
import axios from "axios";
import { authMiddleware, type AuthRequest } from "../middleware/authMiddleware";
import { createRateLimiter } from "../middleware/rateLimit";
import { env } from "../config/env";
import { logAudit, logError } from "../utils/logger";
import { getDrivingDistanceKmByAddress } from "../services/distance";

const router = express.Router();

const MAX_ADDRESS_LENGTH = 256;
const MIN_ADDRESS_LENGTH = 5;
const USE_NAVER = process.env.USE_NAVER_DISTANCE === "true";

const distanceRateLimiter = createRateLimiter({
  windowMs: env.DISTANCE_RATE_LIMIT_WINDOW_MS,
  max: env.DISTANCE_RATE_LIMIT_MAX,
  message: "거리 계산 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});

function normalizeAddress(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validateAddressInput(start: string, goal: string) {
  if (!start || !goal) {
    return "startAddress, goalAddress 둘 다 필요합니다.";
  }

  if (start.length > MAX_ADDRESS_LENGTH || goal.length > MAX_ADDRESS_LENGTH) {
    return `주소는 ${MAX_ADDRESS_LENGTH}자 이내여야 합니다.`;
  }

  if (start.length < MIN_ADDRESS_LENGTH || goal.length < MIN_ADDRESS_LENGTH) {
    return `주소는 ${MIN_ADDRESS_LENGTH}자 이상 입력해주세요.`;
  }

  if (start === goal) {
    return "출발지와 도착지는 서로 달라야 합니다.";
  }

  return null;
}

router.post(
  "/",
  authMiddleware,
  distanceRateLimiter,
  async (req: AuthRequest, res: Response) => {
    const start = normalizeAddress(req.body?.startAddress);
    const goal = normalizeAddress(req.body?.goalAddress);
    const validationError = validateAddressInput(start, goal);

    if (!req.user) {
      return res.status(401).json({ message: "인증 정보가 없습니다." });
    }

    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const requestId = (req as any).requestId ?? null;
    const logBase = {
      requestId,
      userId: req.user.userId,
      role: req.user.role,
      startLength: start.length,
      goalLength: goal.length,
    };

    try {
      if (!USE_NAVER) {
        logAudit("distance_calculation_dummy", logBase);
        return res.json({
          distanceKm: 10,
          durationMinutes: 20,
          mode: "dummy",
        });
      }

      const { distanceKm } = await getDrivingDistanceKmByAddress(start, goal);

      logAudit("distance_calculation_success", {
        ...logBase,
        mode: "naver",
        distanceKm,
      });

      return res.json({
        distanceKm,
        durationMinutes: null,
        mode: "naver",
      });
    } catch (err: unknown) {
      const isTimeout =
        axios.isAxiosError(err) &&
        (err.code === "ECONNABORTED" || err.message.toLowerCase().includes("timeout"));

      logError("distanceCalc", {
        ...logBase,
        error: err instanceof Error ? err.message : String(err),
      });

      if (isTimeout) {
        return res.status(504).json({
          message: "거리 계산 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.",
        });
      }

      const message =
        err instanceof Error &&
        (err.message.includes("주소") || err.message.includes("distance"))
          ? "거리 계산에 필요한 주소를 확인해주세요."
          : "거리 계산 중 오류가 발생했습니다.";

      return res.status(502).json({ message });
    }
  }
);

export default router;
