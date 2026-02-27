// src/middleware/authMiddleware.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthUser {
  userId: number;
  role: "ADMIN" | "DISPATCHER" | "CLIENT";
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  // Authorization 헤더가 없거나 형식이 잘못된 경우
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "인증 토큰이 없습니다. (Authorization 헤더 없음)" });
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: number;
      role: string;
      iat: number;
      exp: number;
    };

    // 🔹 req.user에 현재 로그인 유저 저장
    req.user = {
      userId: decoded.userId,
      role: decoded.role as "ADMIN" | "DISPATCHER" | "CLIENT",
    };

    next();
  } catch (err) {
    console.error("[authMiddleware] JWT verify error:", err);
    return res
      .status(401)
      .json({ message: "유효하지 않은 토큰이거나 만료된 토큰입니다." });
  }
}
