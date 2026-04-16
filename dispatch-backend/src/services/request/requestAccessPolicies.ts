import type { UserRole } from "@prisma/client";

export function isStaffRole(role?: UserRole | null) {
  return role === "ADMIN" || role === "DISPATCHER" || role === "SALES";
}

export function canAccessOwnedRequest(
  role: UserRole | null | undefined,
  userCompanyId: number | null | undefined,
  requestOwnerCompanyId: number | null | undefined
) {
  if (isStaffRole(role)) {
    return true;
  }

  if (role !== "CLIENT") {
    return false;
  }

  return !!userCompanyId && userCompanyId === requestOwnerCompanyId;
}
