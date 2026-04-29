// src/controllers/settingsController.ts
import type { Response } from "express";
import type { AuthRequest } from "../middleware/authMiddleware";
import { prisma } from "../prisma/client";

const ALLOWED_KEYS = ["showQuotedPrice"] as const;
type SettingKey = (typeof ALLOWED_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  showQuotedPrice: "true",
};

function isAllowedKey(key: string): key is SettingKey {
  return (ALLOWED_KEYS as readonly string[]).includes(key);
}

export async function getSettings(_req: AuthRequest, res: Response): Promise<void> {
  const rows = await prisma.siteSettings.findMany();
  const result: Record<string, string> = { ...DEFAULTS };
  for (const row of rows) {
    if (isAllowedKey(row.key)) result[row.key] = row.value;
  }
  res.json(result);
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const updates: Array<{ key: string; value: string }> = [];

  for (const key of ALLOWED_KEYS) {
    if (key in body) {
      const raw = body[key];
      const value = typeof raw === "boolean" ? String(raw) : typeof raw === "string" ? raw : null;
      if (value !== null) updates.push({ key, value });
    }
  }

  if (updates.length === 0) {
    res.status(400).json({ message: "변경할 설정이 없습니다." });
    return;
  }

  for (const { key, value } of updates) {
    await prisma.siteSettings.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  res.json({ ok: true, updated: updates.map((u) => u.key) });
}
