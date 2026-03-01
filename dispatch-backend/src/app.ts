// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";
import addressBookRoutes from "./routes/addressBookRoutes";
import requestRoutes from "./routes/requestRoutes";
import distanceRoutes from "./routes/distanceRoutes";
import authRoutes from "./routes/authRoutes";
import { env } from "./config/env";
import { logError } from "./utils/logger";

const app = express();
app.disable("x-powered-by");

// 보안 헤더 (helmet: HSTS, X-Frame-Options, X-Content-Type-Options 등)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // 이미지 직접 접근 허용
    contentSecurityPolicy: false, // API 서버: CSP는 프론트에서 관리
  })
);

// CORS — CORS_ORIGINS 미설정 시 요청 거부 (wildcard 폴백 제거)
if (env.CORS_ORIGINS.length === 0) {
  console.warn("[security] CORS_ORIGINS가 설정되지 않았습니다. 모든 CORS 요청이 거부됩니다.");
}
app.use(
  cors({
    origin(origin, callback) {
      if (env.CORS_ORIGINS.length === 0) {
        callback(null, false);
        return;
      }
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = origin.replace(/\/+$/, "");
      callback(null, env.CORS_ORIGINS.includes(normalizedOrigin));
    },
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// 쿠키 파서 (HttpOnly refresh token)
app.use(cookieParser());

// 요청 크기 제한 (DoS 방어)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

// 요청 추적용 request id
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = randomUUID();
  (req as any).requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  next();
});

app.use("/distance", distanceRoutes);

// 주소록 라우터
app.use("/address-book", addressBookRoutes);

// 배차 요청 라우터
app.use("/requests", requestRoutes);

// 헬스 체크
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

// 인증(회원가입/로그인 등) 라우터
app.use("/auth", authRoutes);

// 404 핸들러
app.use((req: Request, res: Response) => {
  const requestId = (req as any).requestId ?? null;
  res.status(404).json({
    error: {
      code: "NOT_FOUND",
      message: "요청한 리소스를 찾을 수 없습니다.",
      requestId,
    },
  });
});

// 전역 에러 핸들러
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  const requestId = (req as any).requestId ?? null;
  logError(`unhandled:${req.method} ${req.originalUrl}`, err);

  const statusCode =
    typeof err === "object" &&
    err !== null &&
    "statusCode" in err &&
    typeof (err as any).statusCode === "number"
      ? (err as any).statusCode
      : 500;

  const code =
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as any).code === "string"
      ? (err as any).code
      : statusCode >= 500
      ? "INTERNAL_SERVER_ERROR"
      : "REQUEST_ERROR";

  const message =
    statusCode >= 500
      ? "서버 내부 오류가 발생했습니다."
      : typeof err === "object" &&
        err !== null &&
        "message" in err &&
        typeof (err as any).message === "string"
      ? (err as any).message
      : "요청 처리 중 오류가 발생했습니다.";

  const payload: any = {
    error: {
      code,
      message,
      requestId,
    },
  };

  if (env.NODE_ENV !== "production" && err instanceof Error) {
    payload.error.stack = err.stack;
  }

  res.status(statusCode).json(payload);
});

export { app };
