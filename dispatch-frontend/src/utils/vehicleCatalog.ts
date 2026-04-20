export type VehicleGroup =
  | "MOTORCYCLE"
  | "DAMAS"
  | "LABO"
  | "ONE_TON_PLUS";

export type VehicleGroupValue = VehicleGroup | "";

export type VehicleKey =
  | "MOTORCYCLE"
  | "DAMAS"
  | "LABO"
  | "1TON"
  | "1.4TON"
  | "2.5TON"
  | "3.5TON"
  | "5TON"
  | "11TON"
  | "18TON"
  | "25TON";

export type VehicleSpec = {
  label: string;
  vehicleGroup: VehicleGroup;
  vehicleTonnage: number | null;
  specText: string;
};

export type VehicleTypeRule = {
  key: string;
  label: string;
  storedValue: string;
  call24Label: string;
  allowedTonnages: number[];
};

export const ONE_TON_PLUS_TON_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "1톤", value: 1 },
  { label: "1.4톤", value: 1.4 },
  { label: "2.5톤", value: 2.5 },
  { label: "3.5톤", value: 3.5 },
  { label: "5톤", value: 5 },
  { label: "11톤", value: 11 },
  { label: "18톤", value: 18 },
  { label: "25톤", value: 25 },
];

const ALL_ONE_TON_PLUS_TONNAGES = ONE_TON_PLUS_TON_OPTIONS.map((option) => option.value);
const HEAVY_TONNAGES = [5, 11, 18, 25];
const NO_EXTRA_LONG_TONNAGES = [11, 18, 25];

export const ONE_TON_PLUS_VEHICLE_TYPES: VehicleTypeRule[] = [
  { key: "CARGO", label: "카고", storedValue: "카고", call24Label: "카고", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "WING_BODY", label: "윙바디", storedValue: "윙바디", call24Label: "윙바디", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "LIFT", label: "리프트", storedValue: "리프트", call24Label: "리프트", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "EXTRA_LONG", label: "초장축", storedValue: "초장축", call24Label: "초장축", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES.filter((tonnage) => !NO_EXTRA_LONG_TONNAGES.includes(tonnage)) },
  { key: "PLUS_AXLE_CARGO", label: "플축카고", storedValue: "플축카고", call24Label: "플축카고", allowedTonnages: HEAVY_TONNAGES },
  { key: "PLUS_AXLE_WING", label: "플축윙", storedValue: "플축윙", call24Label: "플축윙", allowedTonnages: HEAVY_TONNAGES },
  { key: "TOP", label: "탑", storedValue: "탑", call24Label: "탑", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "HORU", label: "호루", storedValue: "호루", call24Label: "호루", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "COLD_TOP", label: "냉장탑", storedValue: "냉장탑", call24Label: "냉장탑", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "FROZEN_TOP", label: "냉동탑", storedValue: "냉동탑", call24Label: "냉동탑", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "COLD_WING", label: "냉장윙", storedValue: "냉장윙", call24Label: "냉장윙", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
  { key: "FROZEN_WING", label: "냉동윙", storedValue: "냉동윙", call24Label: "냉동윙", allowedTonnages: ALL_ONE_TON_PLUS_TONNAGES },
];

export const VEHICLE_SPEC: Record<VehicleKey, VehicleSpec> = {
  MOTORCYCLE: {
    label: "오토바이",
    vehicleGroup: "MOTORCYCLE",
    vehicleTonnage: null,
    specText: "서류나 작은 물건 / 30kg",
  },
  DAMAS: {
    label: "다마스",
    vehicleGroup: "DAMAS",
    vehicleTonnage: 0.3,
    specText: "큰 박스, 물건 여러 개 / 300kg",
  },
  LABO: {
    label: "라보",
    vehicleGroup: "LABO",
    vehicleTonnage: 0.5,
    specText: "1100×1100 파렛트 1개 / 500kg",
  },
  "1TON": {
    label: "1톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 1,
    specText: "1100×1100 파렛트 2개 / 1.1톤",
  },
  "1.4TON": {
    label: "1.4톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 1.4,
    specText: "1100×1100 파렛트 3개 / 1.54톤",
  },
  "2.5TON": {
    label: "2.5톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 2.5,
    specText: "1100×1100 파렛트 4개 / 2.75톤",
  },
  "3.5TON": {
    label: "3.5톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 3.5,
    specText: "1100×1100 파렛트 8개 / 3.85톤",
  },
  "5TON": {
    label: "5톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 5,
    specText: "1100×1100 파렛트 16개 / 5.5톤",
  },
  "11TON": {
    label: "11톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 11,
    specText: "1100×1100 파렛트 18개 / 12.1톤",
  },
  "18TON": {
    label: "18톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 18,
    specText: "1100×1100 파렛트 18개 / 19.8톤",
  },
  "25TON": {
    label: "25톤",
    vehicleGroup: "ONE_TON_PLUS",
    vehicleTonnage: 25,
    specText: "1100×1100 파렛트 18개 / 27.5톤",
  },
};

export const VEHICLE_INFO: Record<VehicleGroup, {
  tonOptions: Array<{ label: string; value: number | "" }>;
  typeOptions: string[];
  tonFixed: boolean;
  typeFixed: boolean;
  infoText: string;
  defaultTon: number | "";
  defaultType: string;
}> = {
  MOTORCYCLE: {
    tonOptions: [],
    typeOptions: ["일반", "짐바리"],
    tonFixed: true,
    typeFixed: false,
    infoText: VEHICLE_SPEC.MOTORCYCLE.specText,
    defaultTon: "",
    defaultType: "일반",
  },
  DAMAS: {
    tonOptions: [],
    typeOptions: [],
    tonFixed: true,
    typeFixed: true,
    infoText: VEHICLE_SPEC.DAMAS.specText,
    defaultTon: 0.3,
    defaultType: "다마스",
  },
  LABO: {
    tonOptions: [],
    typeOptions: [],
    tonFixed: true,
    typeFixed: true,
    infoText: VEHICLE_SPEC.LABO.specText,
    defaultTon: 0.5,
    defaultType: "라보",
  },
  ONE_TON_PLUS: {
    tonOptions: ONE_TON_PLUS_TON_OPTIONS,
    typeOptions: ONE_TON_PLUS_VEHICLE_TYPES.map((type) => type.label),
    tonFixed: false,
    typeFixed: false,
    infoText: VEHICLE_SPEC["1TON"].specText,
    defaultTon: 1,
    defaultType: "카고",
  },
};

export function vehicleKeyFromStored(
  vehicleGroup: string | null | undefined,
  vehicleTonnage: number | null | undefined
): VehicleKey {
  if (vehicleGroup === "MOTORCYCLE") return "MOTORCYCLE";
  if (vehicleGroup === "DAMAS") return "DAMAS";
  if (vehicleGroup === "LABO") return "LABO";

  const tonMap: Record<number, VehicleKey> = {
    1: "1TON",
    1.4: "1.4TON",
    2.5: "2.5TON",
    3.5: "3.5TON",
    5: "5TON",
    11: "11TON",
    18: "18TON",
    25: "25TON",
  };

  return vehicleTonnage != null && tonMap[vehicleTonnage]
    ? tonMap[vehicleTonnage]
    : "MOTORCYCLE";
}

export function getAllowedVehicleBodyTypes(
  vehicleGroup: VehicleGroupValue,
  vehicleTonnage: number | "" | null | undefined
): string[] {
  if (vehicleGroup !== "ONE_TON_PLUS") {
    return VEHICLE_INFO[vehicleGroup || "MOTORCYCLE"]?.typeOptions ?? [];
  }

  if (vehicleTonnage == null || vehicleTonnage === "") {
    return ONE_TON_PLUS_VEHICLE_TYPES.map((type) => type.label);
  }

  return ONE_TON_PLUS_VEHICLE_TYPES
    .filter((type) => type.allowedTonnages.includes(Number(vehicleTonnage)))
    .map((type) => type.label);
}

export function isVehicleBodyTypeAllowed(
  vehicleGroup: VehicleGroupValue,
  vehicleTonnage: number | "" | null | undefined,
  vehicleBodyType: string | null | undefined
): boolean {
  if (!vehicleBodyType) return false;
  return getAllowedVehicleBodyTypes(vehicleGroup, vehicleTonnage).includes(vehicleBodyType);
}

export function getDefaultVehicleBodyType(
  vehicleGroup: VehicleGroupValue,
  vehicleTonnage: number | "" | null | undefined
): string {
  if (!vehicleGroup) return VEHICLE_INFO.MOTORCYCLE.defaultType;

  const options = getAllowedVehicleBodyTypes(vehicleGroup, vehicleTonnage);
  return options[0] ?? VEHICLE_INFO[vehicleGroup].defaultType;
}

export function normalizeVehicleBodyType(
  vehicleGroup: VehicleGroupValue,
  vehicleTonnage: number | "" | null | undefined,
  vehicleBodyType: string | null | undefined
): string {
  if (vehicleGroup === "MOTORCYCLE") {
    return vehicleBodyType === "짐바리" ? "짐바리" : "일반";
  }
  if (vehicleGroup === "DAMAS") return "다마스";
  if (vehicleGroup === "LABO") return "라보";
  if (vehicleGroup === "ONE_TON_PLUS") {
    return isVehicleBodyTypeAllowed(vehicleGroup, vehicleTonnage, vehicleBodyType)
      ? String(vehicleBodyType)
      : getDefaultVehicleBodyType(vehicleGroup, vehicleTonnage);
  }

  return VEHICLE_INFO.MOTORCYCLE.defaultType;
}

export function getCall24TruckTypeLabel(vehicleBodyType: string | null | undefined): string {
  const normalized = ONE_TON_PLUS_VEHICLE_TYPES.find((type) => type.storedValue === vehicleBodyType);
  if (normalized) return normalized.call24Label;

  if (vehicleBodyType === "다마스") return "다마스";
  if (vehicleBodyType === "라보") return "라보";
  if (vehicleBodyType === "오토바이" || vehicleBodyType === "짐바리" || vehicleBodyType === "일반") {
    return "오토바이";
  }

  return "카고";
}

export function getVehicleDisplayParts(
  vehicleGroup: string | null | undefined,
  vehicleTonnage: number | null | undefined,
  vehicleBodyType: string | null | undefined
) {
  const key = vehicleKeyFromStored(vehicleGroup, vehicleTonnage);
  const spec = VEHICLE_SPEC[key];
  const tonLabel =
    vehicleGroup === "ONE_TON_PLUS"
      ? spec.label
      : spec.vehicleTonnage != null
      ? `${spec.vehicleTonnage}톤`
      : spec.label;

  if (vehicleGroup === "ONE_TON_PLUS") {
    const bodyTypeLabel = normalizeVehicleBodyType("ONE_TON_PLUS", vehicleTonnage, vehicleBodyType);
    return {
      title: tonLabel,
      subtitle: bodyTypeLabel,
      summary: `${tonLabel} ${bodyTypeLabel}`,
      specText: spec.specText,
    };
  }

  if (vehicleGroup === "MOTORCYCLE") {
    const bodyTypeLabel = normalizeVehicleBodyType("MOTORCYCLE", null, vehicleBodyType);
    return {
      title: tonLabel,
      subtitle: bodyTypeLabel,
      summary: tonLabel === bodyTypeLabel ? tonLabel : `${tonLabel} ${bodyTypeLabel}`,
      specText: spec.specText,
    };
  }

  return {
    title: tonLabel,
    subtitle: spec.label,
    summary: tonLabel === spec.label ? tonLabel : `${tonLabel} ${spec.label}`,
    specText: spec.specText,
  };
}
