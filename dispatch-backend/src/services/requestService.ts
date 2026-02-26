// src/services/requestService.ts
import { prisma } from "../prisma/client";
import type { RequestStatus } from "@prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";

export async function buildListWhere(req: AuthRequest, query: {
  status?: string;
  from?: string;
  to?: string;
  pickupKeyword?: string;
  dropoffKeyword?: string;
}) {
  const { status, from, to, pickupKeyword, dropoffKeyword } = query;
  const where: any = {};

  if (!req.user) {
    return null;
  }

  if (req.user.role === "CLIENT") {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { companyName: true },
    });

    if (me?.companyName && me.companyName.trim() !== "") {
      where.createdBy = {
        companyName: me.companyName,
      };
    } else {
      // 회사명이 없으면 기존처럼 본인 요청만 조회
      where.createdById = req.user.userId;
    }
  }

  if (status && status !== "ALL") {
    where.status = status as RequestStatus;
  }

  if (from || to) {
    where.createdAt = {};
    if (from) {
      (where.createdAt as any).gte = new Date(`${from}T00:00:00.000Z`);
    }
    if (to) {
      (where.createdAt as any).lte = new Date(`${to}T23:59:59.999Z`);
    }
  }

  const andFilters: any[] = [];
  if (pickupKeyword?.trim()) {
    andFilters.push({
      pickupPlaceName: { contains: pickupKeyword.trim() },
    });
  }
  if (dropoffKeyword?.trim()) {
    andFilters.push({
      dropoffPlaceName: { contains: dropoffKeyword.trim() },
    });
  }
  if (andFilters.length > 0) {
    where.AND = andFilters;
  }

  return where;
}

export async function canAccessRequestByRole(
  req: AuthRequest,
  request: {
    createdById: number | null;
    createdBy?: { companyName: string | null } | null;
  }
) {
  if (!req.user) return false;
  if (req.user.role === "ADMIN" || req.user.role === "DISPATCHER") return true;
  if (req.user.role !== "CLIENT") return false;

  const me = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { companyName: true },
  });

  const myCompany = me?.companyName?.trim();
  const requestCompany = request.createdBy?.companyName?.trim();
  const sameCompany =
    !!myCompany && !!requestCompany && myCompany === requestCompany;

  return sameCompany || request.createdById === req.user.userId;
}
