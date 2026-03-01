// src/app.ts
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import path from "path";
import addressBookRoutes from "./routes/addressBookRoutes";
import requestRoutes from "./routes/requestRoutes";
import distanceRoutes from "./routes/distanceRoutes";
import authRoutes from "./routes/authRoutes";
import { env } from "./config/env";

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
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : false,
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);

// 쿠키 파서 (HttpOnly refresh token)
app.use(cookieParser());

// 요청 크기 제한 (DoS 방어)
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
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

export { app };
