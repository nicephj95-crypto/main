export type AssignmentDriverSnapshot = {
  name: string;
  phone: string;
  vehicleNumber: string | null;
  vehicleBodyType: string | null;
  vehicleTonnage: number | null;
};

export type ActiveAssignmentSnapshot = {
  id: number;
  driver: AssignmentDriverSnapshot;
};

export type AssignmentInputSnapshot = {
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleTonnage: number | null;
};

export function determineAssignmentSaveMode(
  activeAssignment: ActiveAssignmentSnapshot | null,
  nextInput: AssignmentInputSnapshot
) {
  if (!activeAssignment) {
    return "create" as const;
  }

  const driverChanged =
    activeAssignment.driver.name !== nextInput.driverName ||
    activeAssignment.driver.phone !== nextInput.driverPhone ||
    (activeAssignment.driver.vehicleNumber ?? "") !== nextInput.vehicleNumber ||
    (activeAssignment.driver.vehicleBodyType ?? "") !== nextInput.vehicleType ||
    (activeAssignment.driver.vehicleTonnage ?? null) !== nextInput.vehicleTonnage;

  return driverChanged ? ("reassign" as const) : ("update" as const);
}

export function getAssignmentDeleteNextStatus(currentStatus: string) {
  if (currentStatus === "DISPATCHING" || currentStatus === "ASSIGNED") {
    return "DISPATCHING";
  }

  return currentStatus;
}
