// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // .env 에 있는 DATABASE_URL 사용 (지금은 "file:./dev.db")
    url: env("DATABASE_URL"),
  },
});