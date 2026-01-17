// src/middleware/roleMiddleware.ts
import { Request, Response, NextFunction } from "express";

export function requireRole(...allowedRoles: ("ADMIN" | "DISPATCHER" | "CLIENT")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as { userId: number; role: string } | undefined;

    if (!user || !allowedRoles.includes(user.role as any)) {
      return res
        .status(403)
        .json({ message: "이 작업을 수행할 권한이 없습니다." });
    }

    next();
  };
}