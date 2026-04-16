import test from "node:test";
import assert from "node:assert/strict";
import {
  buildApprovedUserCreateInput,
  INACTIVE_ACCOUNT_ERROR_CODE,
  normalizeSignupApprovalData,
  validateActiveAccount,
} from "../services/auth/authPolicies";

test("가입 승인 payload는 role/company/department를 한 번에 정규화한다", () => {
  const normalized = normalizeSignupApprovalData({
    role: "CLIENT",
    companyName: "  테스트상사 ",
    department: " 영업팀 ",
  });

  assert.equal(normalized.ok, true);
  if (!normalized.ok) return;

  const createInput = buildApprovedUserCreateInput(
    {
      name: "홍길동",
      email: "hong@example.com",
      passwordHash: "hashed",
    } as const,
    normalized.data
  );

  assert.deepEqual(createInput, {
    name: "홍길동",
    email: "hong@example.com",
    passwordHash: "hashed",
    role: "CLIENT",
    companyName: "테스트상사",
    department: "영업팀",
  });
});

test("고객 승인에는 회사 정보가 백엔드에서 필수 강제된다", () => {
  const normalized = normalizeSignupApprovalData({
    role: "CLIENT",
    companyName: "   ",
    department: "영업팀",
  });

  assert.equal(normalized.ok, false);
  if (normalized.ok) return;
  assert.equal(normalized.status, 400);
});

test("비활성 계정은 로그인/refresh 공통 정책에서 차단된다", () => {
  assert.deepEqual(validateActiveAccount(true), { ok: true });

  const blocked = validateActiveAccount(false);
  assert.equal(blocked.ok, false);
  if (blocked.ok) return;
  assert.equal(blocked.status, 403);
  assert.equal(blocked.code, INACTIVE_ACCOUNT_ERROR_CODE);
});
