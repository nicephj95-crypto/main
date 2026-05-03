import { isStaffRole } from "./requestAccessPolicies";

export function decorateRequestDetailRecord<
  TAssignment extends { isActive: boolean },
  TRequest extends {
    assignments: TAssignment[];
  }
>(request: TRequest) {
  const activeAssignment =
    request.assignments.find((assignment) => assignment.isActive) ?? null;
  const assignmentHistory = request.assignments.filter(
    (assignment) => !assignment.isActive
  );

  return {
    ...request,
    activeAssignment,
    assignmentHistory,
  };
}

export function stripConfidentialAssignmentFields<
  T extends {
    actualFare?: number | null;
    extraFare?: number | null;
    extraFareReason?: string | null;
    codRevenue?: number | null;
    internalMemo?: string | null;
  }
>(assignment: T) {
  const {
    actualFare: _actualFare,
    extraFare: _extraFare,
    extraFareReason: _extraFareReason,
    codRevenue: _codRevenue,
    internalMemo: _internalMemo,
    ...publicAssignment
  } = assignment;

  return publicAssignment;
}

export function stripConfidentialRequestFields<
  TAssignment extends {
    actualFare?: number | null;
    extraFare?: number | null;
    extraFareReason?: string | null;
    codRevenue?: number | null;
    internalMemo?: string | null;
    isActive: boolean;
  },
  T extends {
    actualFare?: number | null;
    orderNumber?: string | null;
    insungSerialNumber?: string | null;
    insungSyncStatus?: string | null;
    insungLastError?: string | null;
    call24OrdNo?: string | null;
    call24SyncStatus?: string | null;
    call24LastError?: string | null;
    externalSentPrice?: number | null;
    externalPlatform?: string | null;
    assignments: TAssignment[];
  }
>(request: T) {
  const {
    actualFare: _actualFare,
    orderNumber: _orderNumber,
    insungSerialNumber: _insungSerialNumber,
    insungSyncStatus: _insungSyncStatus,
    insungLastError: _insungLastError,
    call24OrdNo: _call24OrdNo,
    call24SyncStatus: _call24SyncStatus,
    call24LastError: _call24LastError,
    externalSentPrice: _externalSentPrice,
    externalPlatform: _externalPlatform,
    ...rest
  } = request;
  const sanitizedAssignments = request.assignments.map((assignment) =>
    stripConfidentialAssignmentFields(assignment)
  );

  return decorateRequestDetailRecord({
    ...rest,
    assignments: sanitizedAssignments,
  });
}

export function sanitizeRequestDetailForRole<
  TAssignment extends {
    actualFare?: number | null;
    extraFare?: number | null;
    extraFareReason?: string | null;
    codRevenue?: number | null;
    internalMemo?: string | null;
    isActive: boolean;
  },
  T extends {
    assignments: TAssignment[];
    actualFare?: number | null;
  }
>(role: "ADMIN" | "DISPATCHER" | "SALES" | "CLIENT" | null | undefined, request: T) {
  if (isStaffRole(role)) {
    return decorateRequestDetailRecord(request);
  }

  return stripConfidentialRequestFields(request);
}
