import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeRequestDetailForRole } from "../services/request/requestVisibility";

test("고객 상세 응답에서는 대외비 필드가 제거된다", () => {
  const sanitized = sanitizeRequestDetailForRole("CLIENT", {
    id: 1,
    actualFare: 50000,
    assignments: [
      {
        id: 10,
        isActive: true,
        actualFare: 50000,
        billingPrice: 70000,
        extraFare: 1000,
        extraFareReason: "야간",
        codRevenue: 3000,
        internalMemo: "내부용",
        customerMemo: "고객공개",
      },
    ],
  });

  const result = sanitized as any;
  assert.equal("actualFare" in result, false);
  assert.equal("actualFare" in result.assignments[0], false);
  assert.equal("extraFare" in result.assignments[0], false);
  assert.equal("extraFareReason" in result.assignments[0], false);
  assert.equal("codRevenue" in result.assignments[0], false);
  assert.equal("internalMemo" in result.assignments[0], false);
  assert.equal(result.activeAssignment?.customerMemo, "고객공개");
  assert.equal(result.activeAssignment?.billingPrice, 70000);
});

test("직원 상세 응답에서는 대외비 필드가 유지된다", () => {
  const sanitized = sanitizeRequestDetailForRole("ADMIN", {
    id: 1,
    actualFare: 50000,
    assignments: [
      {
        id: 10,
        isActive: true,
        actualFare: 50000,
        billingPrice: 70000,
        extraFare: 1000,
        extraFareReason: "야간",
        codRevenue: 3000,
        internalMemo: "내부용",
      },
    ],
  });

  const result = sanitized as any;
  assert.equal(result.actualFare, 50000);
  assert.equal(result.activeAssignment?.actualFare, 50000);
  assert.equal(result.activeAssignment?.billingPrice, 70000);
  assert.equal(result.activeAssignment?.extraFare, 1000);
});
