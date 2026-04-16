// src/utils/integrationPlatform.ts
// 차량 종류에 따른 외부 연동 플랫폼 결정 로직
//
// 정책:
//   vehicleGroup = MOTORCYCLE | DAMAS | LABO  →  INSUNG (인성)
//   그 외 (ONE_TON_PLUS 등) 또는 null/undefined  →  CALL24 (화물24)

import type { VehicleGroup } from "../api/types";

export type IntegrationPlatform = "INSUNG" | "CALL24";

const INSUNG_VEHICLE_GROUPS: VehicleGroup[] = ["MOTORCYCLE", "DAMAS", "LABO"];

export function getPlatformByVehicleGroup(
  vehicleGroup?: VehicleGroup | null
): IntegrationPlatform {
  if (vehicleGroup && INSUNG_VEHICLE_GROUPS.includes(vehicleGroup)) {
    return "INSUNG";
  }
  return "CALL24";
}

export function platformLabel(platform: IntegrationPlatform): string {
  return platform === "INSUNG" ? "인성" : "화물24";
}
