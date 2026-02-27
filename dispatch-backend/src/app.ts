// src/app.ts
import express from "express";
import cors from "cors";
import path from "path";
import { prisma } from "./prisma/client";
import addressBookRoutes from "./routes/addressBookRoutes";
import requestRoutes from "./routes/requestRoutes";
import distanceRoutes from "./routes/distanceRoutes";
import authRoutes from "./routes/authRoutes";
import { env } from "./config/env";

const app = express();
app.disable("x-powered-by");

// 공통 미들웨어
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});
app.use(
  cors({
    origin: env.CORS_ORIGINS.length > 0 ? env.CORS_ORIGINS : true,
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/distance", distanceRoutes);

// 주소록 라우터
app.use("/address-book", addressBookRoutes);

// 배차 요청 라우터
app.use("/requests", requestRoutes);

// 헬스 체크
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// 인증(회원가입/로그인 등) 라우터
app.use("/auth", authRoutes);

if (env.NODE_ENV !== "production") {
  // 개발 환경에서만 진단용 라우트 허용
  app.get("/test-db", async (req, res) => {
    const requests = await prisma.request.findMany();
    res.json({ count: requests.length });
  });
}

export { app };
