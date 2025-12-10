// src/app.ts
import express from "express";
import cors from "cors";
import { prisma } from "./prisma/client";
import addressBookRoutes from "./routes/addressBookRoutes";
import requestRoutes from "./routes/requestRoutes";

const app = express();

// 공통 미들웨어
app.use(cors());
app.use(express.json());

// 주소록 라우터
app.use("/address-book", addressBookRoutes);

// 배차 요청 라우터
app.use("/requests", requestRoutes);

// 헬스 체크
app.get("/health", (req, res) => {
  res.json({ ok: true });
});

// DB 테스트
app.get("/test-db", async (req, res) => {
  const requests = await prisma.request.findMany();
  res.json({ count: requests.length });
});

// 🔹 테스트용 유저 생성 라우트
app.get("/test-create-user", async (req, res) => {
  try {
    const user = await prisma.user.create({
      data: {
        name: "테스트 유저",
        email: "test@example.com",
        passwordHash: "test-password-hash",
      },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res
      .status(500)
      .json({ message: "테스트 유저 생성 중 오류가 발생했습니다." });
  }
});

export { app };