type VehicleGroup = "MOTORCYCLE" | "DAMAS" | "LABO" | "ONE_TON_PLUS" | null | undefined;

const ONE_TON_PLUS_BODY_TYPE_RULES: Array<{
  storedValue: string;
  call24Label: string;
  allowedTonnages: number[];
}> = [
  { storedValue: "카고", call24Label: "카고", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "윙바디", call24Label: "윙바디", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "리프트", call24Label: "리프트", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "초장축", call24Label: "초장축", allowedTonnages: [1, 1.4, 2.5, 3.5, 5] },
  { storedValue: "플축카고", call24Label: "플축카고", allowedTonnages: [5, 11, 18, 25] },
  { storedValue: "플축윙", call24Label: "플축윙", allowedTonnages: [5, 11, 18, 25] },
  { storedValue: "탑", call24Label: "탑", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "호루", call24Label: "호루", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "냉장탑", call24Label: "냉장탑", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "냉동탑", call24Label: "냉동탑", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "냉장윙", call24Label: "냉장윙", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
  { storedValue: "냉동윙", call24Label: "냉동윙", allowedTonnages: [1, 1.4, 2.5, 3.5, 5, 11, 18, 25] },
];

export function getAllowedOneTonPlusBodyTypes(tonnage: number | null | undefined): string[] {
  if (tonnage == null) {
    return ONE_TON_PLUS_BODY_TYPE_RULES.map((rule) => rule.storedValue);
  }

  return ONE_TON_PLUS_BODY_TYPE_RULES
    .filter((rule) => rule.allowedTonnages.includes(tonnage))
    .map((rule) => rule.storedValue);
}

export function normalizeVehicleBodyTypeForStorage(input: {
  vehicleGroup: VehicleGroup;
  vehicleTonnage: number | null | undefined;
  vehicleBodyType: string | null | undefined;
}): string | null {
  const { vehicleGroup, vehicleTonnage, vehicleBodyType } = input;

  if (vehicleGroup === "MOTORCYCLE") {
    return vehicleBodyType === "짐바리" ? "짐바리" : "일반";
  }
  if (vehicleGroup === "DAMAS") return "다마스";
  if (vehicleGroup === "LABO") return "라보";
  if (vehicleGroup !== "ONE_TON_PLUS") {
    return vehicleBodyType?.trim() || null;
  }

  if (vehicleTonnage == null) {
    throw Object.assign(new Error("1톤 이상 차량은 톤수를 선택해야 합니다."), { statusCode: 400 });
  }

  const allowed = getAllowedOneTonPlusBodyTypes(vehicleTonnage);
  const normalized = vehicleBodyType?.trim() === "차종무관"
    ? "카고"
    : vehicleBodyType?.trim() || "카고";
  if (!allowed.includes(normalized)) {
    throw Object.assign(new Error("선택한 톤수에서 사용할 수 없는 차량종류입니다."), { statusCode: 400 });
  }
  return normalized;
}

export function mapVehicleBodyTypeToCall24(vehicleBodyType: string | null | undefined): string {
  const matched = ONE_TON_PLUS_BODY_TYPE_RULES.find((rule) => rule.storedValue === vehicleBodyType);
  if (matched) return matched.call24Label;
  if (vehicleBodyType === "차종무관") return "카고";
  if (vehicleBodyType === "다마스") return "다마스";
  if (vehicleBodyType === "라보") return "라보";
  if (vehicleBodyType === "일반" || vehicleBodyType === "짐바리" || vehicleBodyType === "오토바이") {
    return "오토바이";
  }
  return "카고";
}

export function mapVehicleBodyTypeToInsungCarKind(vehicleBodyType: string | null | undefined): string {
  if (vehicleBodyType === "일반" || vehicleBodyType === "짐바리" || vehicleBodyType === "오토바이") return "01";
  if (vehicleBodyType === "다마스") return "02";
  if (vehicleBodyType === "라보") return "03";
  return "04";
}
