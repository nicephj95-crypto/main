import test from "node:test";
import assert from "node:assert/strict";
import {
  determineAssignmentSaveMode,
  getAssignmentDeleteNextStatus,
} from "../services/request/requestAssignmentPolicies";
import { decorateRequestDetailRecord } from "../services/request/requestVisibility";

test("assignment 저장 정책은 create/update/reassign를 안정적으로 구분한다", () => {
  assert.equal(
    determineAssignmentSaveMode(null, {
      driverName: "기사1",
      driverPhone: "010",
      vehicleNumber: "12가3456",
      vehicleType: "카고",
      vehicleTonnage: 1,
    }),
    "create"
  );

  assert.equal(
    determineAssignmentSaveMode(
      {
        id: 1,
        driver: {
          name: "기사1",
          phone: "010",
          vehicleNumber: "12가3456",
          vehicleBodyType: "카고",
          vehicleTonnage: 1,
        },
      },
      {
        driverName: "기사1",
        driverPhone: "010",
        vehicleNumber: "12가3456",
        vehicleType: "카고",
        vehicleTonnage: 1,
      }
    ),
    "update"
  );

  assert.equal(
    determineAssignmentSaveMode(
      {
        id: 1,
        driver: {
          name: "기사1",
          phone: "010",
          vehicleNumber: "12가3456",
          vehicleBodyType: "카고",
          vehicleTonnage: 1,
        },
      },
      {
        driverName: "기사2",
        driverPhone: "010",
        vehicleNumber: "12가3456",
        vehicleType: "카고",
        vehicleTonnage: 1,
      }
    ),
    "reassign"
  );
});

test("assignment 상세 구조는 active/history를 분리한다", () => {
  const decorated = decorateRequestDetailRecord({
    assignments: [
      { id: 10, isActive: false, actualFare: 50000, billingPrice: 70000 },
      { id: 11, isActive: true, actualFare: 60000, billingPrice: 90000 },
      { id: 12, isActive: false, actualFare: 55000, billingPrice: 80000 },
    ],
  }) as any;

  assert.equal(decorated.activeAssignment?.id, 11);
  assert.equal(decorated.activeAssignment?.actualFare, 60000);
  assert.deepEqual(
    decorated.assignmentHistory.map((assignment: { id: number }) => assignment.id),
    [10, 12]
  );
  assert.equal(decorated.assignmentHistory[0]?.billingPrice, 70000);
});

test("assignment 삭제 정책은 진행 전 상태에서만 DISPATCHING으로 복귀한다", () => {
  assert.equal(getAssignmentDeleteNextStatus("ASSIGNED"), "DISPATCHING");
  assert.equal(getAssignmentDeleteNextStatus("DISPATCHING"), "DISPATCHING");
  assert.equal(getAssignmentDeleteNextStatus("IN_TRANSIT"), "IN_TRANSIT");
});
