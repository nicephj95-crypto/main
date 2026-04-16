// src/prisma/client.ts
import "../config/loadEnv";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
