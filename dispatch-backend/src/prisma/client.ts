// src/prisma/client.ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

// Prisma 7 + SQLite용 어댑터 설정
const adapter = new PrismaBetterSqlite3({
  // .env 에 있는 DATABASE_URL 사용, 없으면 기본값
  url: process.env.DATABASE_URL || "file:./dev.db",
});

// 어댑터를 사용하는 PrismaClient 생성
export const prisma = new PrismaClient({ adapter });