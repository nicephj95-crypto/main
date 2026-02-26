// src/services/authService.ts
import { randomBytes } from "crypto";
import { prisma } from "../prisma/client";
import { env } from "../config/env";
import { hashRefreshToken } from "../utils/authUtils";

export async function createRefreshToken(userId: number): Promise<string> {
  const rawToken = randomBytes(48).toString("hex");
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date(
    Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return rawToken;
}
