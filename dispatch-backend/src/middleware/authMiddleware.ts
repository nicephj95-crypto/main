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

  const ALLOWED_ROLES = ["ADMIN", "DISPATCHER", "CLIENT"] as const;

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ["HS256"] }) as {
      userId: number;
      role: string;
      iat: number;
      exp: number;
    };

    if (!ALLOWED_ROLES.includes(decoded.role as any)) {
      return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role as "ADMIN" | "DISPATCHER" | "CLIENT",
    };

    next();
  } catch {
    return res
      .status(401)
      .json({ message: "유효하지 않은 토큰이거나 만료된 토큰입니다." });
  }
}
