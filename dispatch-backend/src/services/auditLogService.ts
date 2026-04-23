// src/services/auditLogService.ts
import { prisma } from "../prisma/client";
import type { AuthRequest } from "../middleware/authMiddleware";
import { logError } from "../utils/logger";

function getClientIp(req?: AuthRequest) {
  if (!req) return null;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0]?.trim() || null;
  }
  return req.ip || null;
}

function normalizeAuditDetail(params: {
  detail?: Record<string, unknown> | null;
  target?: string | null;
  req?: AuthRequest;
}) {
  const meta = {
    requestId: ((params.req as any)?.requestId as string | undefined) ?? null,
    ipAddress: getClientIp(params.req),
    userAgent: params.req?.get("user-agent") ?? null,
  };

  return {
    ...(params.target ? { target: params.target } : {}),
    ...(params.detail ?? {}),
    _meta: meta,
  };
}

function normalizeComparableValue(value: unknown) {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function hasMeaningfulAuditChanges(detail: Record<string, unknown> | null | undefined) {
  if (!detail || typeof detail !== "object") return false;
  const changes = (detail as { changes?: unknown }).changes;
  return Array.isArray(changes) && changes.length > 0;
}

export function buildAuditChanges(
  fields: Array<{
    field: string;
    label: string;
    before: unknown;
    after: unknown;
  }>
) {
  const before: Record<string, unknown> = {};
  const after: Record<string, unknown> = {};
  const changes = fields
    .map((field) => {
      const normalizedBefore = normalizeComparableValue(field.before);
      const normalizedAfter = normalizeComparableValue(field.after);
      if (normalizedBefore === normalizedAfter) {
        return null;
      }
      before[field.field] = normalizedBefore;
      after[field.field] = normalizedAfter;
      return {
        field: field.field,
        label: field.label,
        before: normalizedBefore,
        after: normalizedAfter,
      } as {
        field: string;
        label: string;
        before: unknown;
        after: unknown;
      };
    })
    .filter(
      (
        item: { field: string; label: string; before: unknown; after: unknown } | null
      ): item is { field: string; label: string; before: unknown; after: unknown } => item !== null
    );

  return { before, after, changes };
}

export function buildUpdateAuditDetail(params: {
  entity: string;
  summary?: string;
  context?: Record<string, unknown> | null;
  fields: Array<{
    field: string;
    label: string;
    before: unknown;
    after: unknown;
  }>;
}) {
  const diff = buildAuditChanges(params.fields);
  return {
    entity: params.entity,
    summary:
      params.summary ??
      `${params.entity} 수정 (${diff.changes.length}건 변경)`,
    ...(params.context ?? {}),
    before: diff.before,
    after: diff.after,
    changes: diff.changes,
  };
}

export async function writeAuditLog(params: {
  req?: AuthRequest;
  userId?: number | null;
  userName?: string | null;
  userRole?: string | null;
  action: string;
  resource: string;
  resourceId?: number | null;
  target?: string | null;
  detail?: Record<string, unknown> | null;
}) {
  try {
    if (
      (params.action === "UPDATE" || params.action === "STATUS_CHANGE") &&
      !hasMeaningfulAuditChanges(params.detail ?? null)
    ) {
      return { ok: true as const, skipped: true as const };
    }

    const userId = params.userId ?? params.req?.user?.userId ?? null;
    let userName = params.userName ?? null;
    const userRole = params.userRole ?? params.req?.user?.role ?? null;

    if (!userName && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      userName = user?.name ?? null;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        userName,
        userRole,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId ?? null,
        target: params.target ?? null,
        detail: JSON.stringify(
          normalizeAuditDetail({
            detail: params.detail ?? null,
            target: params.target ?? null,
            req: params.req,
          })
        ),
      },
    });
    return { ok: true as const };
  } catch (err) {
    logError("writeAuditLog", {
      error: err instanceof Error ? err.message : String(err),
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId ?? null,
      target: params.target ?? null,
      userId: params.userId ?? params.req?.user?.userId ?? null,
    });
    return { ok: false as const, error: err };
  }
}

export async function fetchAuditLogs(params: {
  resource?: string;
  resourceId?: number;
  target?: string;
  limit?: number;
  offset?: number;
}) {
  const { resource, resourceId, target, limit = 50, offset = 0 } = params;
  const where: any = {};
  if (resource) where.resource = resource;
  if (resourceId != null) where.resourceId = resourceId;
  if (target) where.target = target;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Math.min(limit, 200),
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}
