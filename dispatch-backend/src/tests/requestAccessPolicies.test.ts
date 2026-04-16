import test from "node:test";
import assert from "node:assert/strict";
import { canAccessOwnedRequest } from "../services/request/requestAccessPolicies";

test("고객은 자기 업체 소유 request만 조회 가능하다", () => {
  assert.equal(canAccessOwnedRequest("CLIENT", 10, 10), true);
  assert.equal(canAccessOwnedRequest("CLIENT", 10, 11), false);
  assert.equal(canAccessOwnedRequest("CLIENT", null, 11), false);
});

test("직원은 owner company와 무관하게 request에 접근할 수 있다", () => {
  assert.equal(canAccessOwnedRequest("ADMIN", null, 11), true);
  assert.equal(canAccessOwnedRequest("DISPATCHER", 1, 11), true);
  assert.equal(canAccessOwnedRequest("SALES", 1, 11), true);
});
