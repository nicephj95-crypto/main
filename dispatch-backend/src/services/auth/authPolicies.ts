import type { SignupRequest, UserRole } from "@prisma/client";

export const INACTIVE_ACCOUNT_ERROR_CODE = "ACCOUNT_INACTIVE";

// 직원 권한 → 회사명/부서 자동 고정
export const STAFF_ROLE_MAP: Partial<Record<UserRole, { companyName: string; department: string }>> = {
  SALES:      { companyName: "우리회사", department: "영업" },
  DISPATCHER: { companyName: "우리회사", department: "배차" },
  ADMIN:      { companyName: "우리회사", department: "관리" },
};

export type SignupApprovalInput = {
  role?: UserRole;
  companyName?: string | null;
  department?: string | null;
};

type ApprovalValidationResult =
  | {
      ok: true;
      data: {
        role: UserRole;
        companyName: string | null;
        department: string | null;
      };
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

export function normalizeSignupApprovalData(
  approvalData?: SignupApprovalInput
): ApprovalValidationResult {
  const role = approvalData?.role;
  if (!role || !["ADMIN", "DISPATCHER", "SALES", "CLIENT"].includes(role)) {
    return {
      ok: false,
      status: 400,
      message: "승인 시 올바른 권한(role)이 필요합니다.",
    };
  }

  // 직원 권한: 프론트 값 무시하고 서버에서 강제
  const staffConfig = STAFF_ROLE_MAP[role as UserRole];
  if (staffConfig) {
    return {
      ok: true,
      data: {
        role,
        companyName: staffConfig.companyName,
        department: staffConfig.department,
      },
    };
  }

  // CLIENT
  const companyName =
    approvalData?.companyName && approvalData.companyName.trim() !== ""
      ? approvalData.companyName.trim()
      : null;
  const department =
    approvalData?.department && approvalData.department.trim() !== ""
      ? approvalData.department.trim()
      : null;

  if (!companyName) {
    return {
      ok: false,
      status: 400,
      message: "고객 승인 시 회사 정보가 필요합니다.",
    };
  }

  return {
    ok: true,
    data: {
      role,
      companyName,
      department,
    },
  };
}

export function buildApprovedUserCreateInput(
  signupRequest: Pick<SignupRequest, "name" | "email" | "passwordHash">,
  approvalData: {
    role: UserRole;
    companyName: string | null;
    department: string | null;
  }
) {
  return {
    name: signupRequest.name,
    email: signupRequest.email,
    passwordHash: signupRequest.passwordHash,
    role: approvalData.role,
    companyName: approvalData.companyName,
    department: approvalData.department,
  };
}

export function validateActiveAccount(isActive: boolean | null | undefined) {
  if (isActive !== false) {
    return { ok: true as const };
  }

  return {
    ok: false as const,
    status: 403,
    code: INACTIVE_ACCOUNT_ERROR_CODE,
    message: "비활성화된 계정입니다. 관리자에게 문의해주세요.",
  };
}
