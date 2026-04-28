type VehicleGroup = "MOTORCYCLE" | "DAMAS" | "LABO" | "ONE_TON_PLUS" | string | null | undefined;

type FareProvider = "INSUNG" | "CALL24";
type FareLookupStatus =
  | "OK"
  | "NO_DISTANCE"
  | "NO_RANGE"
  | "NO_VEHICLE_RATE_TABLE"
  | "NO_RATE";

type FareRange<T extends string> = {
  distanceLabel: string;
  minKmExclusive: number;
  maxKmInclusive: number | null;
  rates: Record<T, number | null>;
};

type FareLookupResult = {
  amount: number | null;
  provider: FareProvider | null;
  rangeLabel: string | null;
  vehicleKey: string | null;
  status: FareLookupStatus;
  message: string | null;
};

type InsungVehicleKey = "motorcycle" | "damas" | "labo";
type Call24VehicleKey = "1t" | "1_4t" | "2_5t" | "3_5t" | "5t" | "11t" | "25t";

const INSUNG_VEHICLE_MAPPING = {
  MOTORCYCLE: "motorcycle",
  DAMAS: "damas",
  LABO: "labo",
} as const;

const CALL24_VEHICLE_MAPPING = {
  ONE_TON: "1t",
  ONE_POINT_FOUR_TON: "1_4t",
  TWO_POINT_FIVE_TON: "2_5t",
  THREE_POINT_FIVE_TON: "3_5t",
  FIVE_TON: "5t",
  ELEVEN_TON: "11t",
  TWENTY_FIVE_TON: "25t",
} as const;

const INSUNG_FARE_RANGES: Array<FareRange<InsungVehicleKey>> = [
  { distanceLabel: "~5km", minKmExclusive: 0, maxKmInclusive: 5, rates: { motorcycle: 15000, damas: 22000, labo: 27000 } },
  { distanceLabel: "6~10km", minKmExclusive: 5, maxKmInclusive: 10, rates: { motorcycle: 18000, damas: 25000, labo: 31000 } },
  { distanceLabel: "11~15km", minKmExclusive: 10, maxKmInclusive: 15, rates: { motorcycle: 20000, damas: 30000, labo: 35000 } },
  { distanceLabel: "16~20km", minKmExclusive: 15, maxKmInclusive: 20, rates: { motorcycle: 22000, damas: 34000, labo: 40000 } },
  { distanceLabel: "21~25km", minKmExclusive: 20, maxKmInclusive: 25, rates: { motorcycle: 25000, damas: 36000, labo: 45000 } },
  { distanceLabel: "26~30km", minKmExclusive: 25, maxKmInclusive: 30, rates: { motorcycle: 28000, damas: 40000, labo: 49000 } },
  { distanceLabel: "31~40km", minKmExclusive: 30, maxKmInclusive: 40, rates: { motorcycle: 30000, damas: 45000, labo: 53000 } },
  { distanceLabel: "41~50km", minKmExclusive: 40, maxKmInclusive: 50, rates: { motorcycle: 40000, damas: 50000, labo: 59000 } },
  { distanceLabel: "51~60km", minKmExclusive: 50, maxKmInclusive: 60, rates: { motorcycle: 44000, damas: 54000, labo: 64000 } },
  { distanceLabel: "61~70km", minKmExclusive: 60, maxKmInclusive: 70, rates: { motorcycle: 55000, damas: 66000, labo: 70000 } },
  { distanceLabel: "71~80km", minKmExclusive: 70, maxKmInclusive: 80, rates: { motorcycle: 59000, damas: 70000, labo: 81000 } },
  { distanceLabel: "81~100km", minKmExclusive: 80, maxKmInclusive: 100, rates: { motorcycle: 67000, damas: 74000, labo: 95000 } },
  { distanceLabel: "101~150km", minKmExclusive: 100, maxKmInclusive: 150, rates: { motorcycle: 78000, damas: 105000, labo: 125000 } },
  { distanceLabel: "151~200km", minKmExclusive: 150, maxKmInclusive: 200, rates: { motorcycle: null, damas: 107000, labo: 148000 } },
  { distanceLabel: "200km~", minKmExclusive: 200, maxKmInclusive: null, rates: { motorcycle: null, damas: 123000, labo: 153000 } },
];

const CALL24_FARE_RANGES: Array<FareRange<Call24VehicleKey>> = [
  { distanceLabel: "~5km", minKmExclusive: 0, maxKmInclusive: 5, rates: { "1t": 30000, "1_4t": 40000, "2_5t": 45000, "3_5t": 60000, "5t": 75000, "11t": 145000, "25t": 180000 } },
  { distanceLabel: "6~10km", minKmExclusive: 5, maxKmInclusive: 10, rates: { "1t": 35000, "1_4t": 40000, "2_5t": 50000, "3_5t": 70000, "5t": 80000, "11t": 145000, "25t": 180000 } },
  { distanceLabel: "11~15km", minKmExclusive: 10, maxKmInclusive: 15, rates: { "1t": 38000, "1_4t": 42000, "2_5t": 65000, "3_5t": 72000, "5t": 87000, "11t": 150000, "25t": 185000 } },
  { distanceLabel: "16~20km", minKmExclusive: 15, maxKmInclusive: 20, rates: { "1t": 40000, "1_4t": 46000, "2_5t": 83000, "3_5t": 73000, "5t": 102000, "11t": 155000, "25t": 190000 } },
  { distanceLabel: "21~25km", minKmExclusive: 20, maxKmInclusive: 25, rates: { "1t": 43000, "1_4t": 55000, "2_5t": 100000, "3_5t": 80000, "5t": 110000, "11t": 160000, "25t": 200000 } },
  { distanceLabel: "26~30km", minKmExclusive: 25, maxKmInclusive: 30, rates: { "1t": 46000, "1_4t": 64000, "2_5t": 105000, "3_5t": 90000, "5t": 118000, "11t": 165000, "25t": 210000 } },
  { distanceLabel: "31~40km", minKmExclusive: 30, maxKmInclusive: 40, rates: { "1t": 56000, "1_4t": 69000, "2_5t": 111000, "3_5t": 100000, "5t": 126000, "11t": 170000, "25t": 215000 } },
  { distanceLabel: "41~50km", minKmExclusive: 40, maxKmInclusive: 50, rates: { "1t": 65000, "1_4t": 73000, "2_5t": 116000, "3_5t": 105000, "5t": 139000, "11t": 180000, "25t": 230000 } },
  { distanceLabel: "51~60km", minKmExclusive: 50, maxKmInclusive: 60, rates: { "1t": 73000, "1_4t": 81000, "2_5t": 118000, "3_5t": 124000, "5t": 151000, "11t": 210000, "25t": 250000 } },
  { distanceLabel: "61~70km", minKmExclusive: 60, maxKmInclusive: 70, rates: { "1t": 74000, "1_4t": 83000, "2_5t": null, "3_5t": 127000, "5t": 206000, "11t": 220000, "25t": 255000 } },
  { distanceLabel: "71~80km", minKmExclusive: 70, maxKmInclusive: 80, rates: { "1t": 75000, "1_4t": 113000, "2_5t": 120000, "3_5t": 130000, "5t": 260000, "11t": 230000, "25t": 265000 } },
  { distanceLabel: "81~100km", minKmExclusive: 80, maxKmInclusive: 100, rates: { "1t": 83000, "1_4t": 114000, "2_5t": 130000, "3_5t": 151000, "5t": 265000, "11t": 240000, "25t": 290000 } },
  { distanceLabel: "101~150km", minKmExclusive: 100, maxKmInclusive: 150, rates: { "1t": 110000, "1_4t": 115000, "2_5t": 140000, "3_5t": 172000, "5t": 274000, "11t": 275000, "25t": 340000 } },
  { distanceLabel: "151~200km", minKmExclusive: 150, maxKmInclusive: 200, rates: { "1t": 130000, "1_4t": 155000, "2_5t": 220000, "3_5t": 217000, "5t": 283000, "11t": 300000, "25t": 420000 } },
  { distanceLabel: "201~250km", minKmExclusive: 200, maxKmInclusive: 250, rates: { "1t": 156000, "1_4t": 185000, "2_5t": 240000, "3_5t": 249000, "5t": 367000, "11t": 350000, "25t": 505000 } },
  { distanceLabel: "251~300km", minKmExclusive: 250, maxKmInclusive: 300, rates: { "1t": null, "1_4t": null, "2_5t": null, "3_5t": null, "5t": null, "11t": 400000, "25t": 590000 } },
  { distanceLabel: "301~350km", minKmExclusive: 300, maxKmInclusive: 350, rates: { "1t": 172000, "1_4t": 215000, "2_5t": 260000, "3_5t": 280000, "5t": 450000, "11t": 455000, "25t": 630000 } },
  { distanceLabel: "351~400km", minKmExclusive: 350, maxKmInclusive: 400, rates: { "1t": 180000, "1_4t": null, "2_5t": 285000, "3_5t": 325000, "5t": 455000, "11t": 515000, "25t": 680000 } },
  { distanceLabel: "401~450km", minKmExclusive: 400, maxKmInclusive: 450, rates: { "1t": 231000, "1_4t": null, "2_5t": null, "3_5t": null, "5t": null, "11t": 580000, "25t": 810000 } },
  { distanceLabel: "451~500km", minKmExclusive: 450, maxKmInclusive: 500, rates: { "1t": 245000, "1_4t": null, "2_5t": 310000, "3_5t": 370000, "5t": null, "11t": 620000, "25t": 900000 } },
];

export const FREIGHT_RATE_TABLE = {
  insungRates: INSUNG_FARE_RANGES,
  call24Rates: CALL24_FARE_RANGES,
  vehicleMapping: {
    insung: INSUNG_VEHICLE_MAPPING,
    call24: CALL24_VEHICLE_MAPPING,
  },
};

function findRange<T extends string>(ranges: Array<FareRange<T>>, km: number) {
  return ranges.find((range) => km > range.minKmExclusive && (range.maxKmInclusive == null || km <= range.maxKmInclusive)) ?? null;
}

function mapCall24VehicleKey(tonnage: unknown): Call24VehicleKey | null {
  const ton = Number(tonnage);
  if (!Number.isFinite(ton)) return null;
  const rounded = Math.round(ton * 10) / 10;
  const map = new Map<number, Call24VehicleKey>([
    [1, "1t"],
    [1.4, "1_4t"],
    [2.5, "2_5t"],
    [3.5, "3_5t"],
    [5, "5t"],
    [11, "11t"],
    [25, "25t"],
  ]);
  return map.get(rounded) ?? null;
}

export function lookupFreightFare(input: {
  distanceKm: unknown;
  vehicleGroup: VehicleGroup;
  vehicleTonnage?: unknown;
}): FareLookupResult {
  const km = Number(input.distanceKm);
  if (!Number.isFinite(km) || km <= 0) {
    return {
      amount: null,
      provider: null,
      rangeLabel: null,
      vehicleKey: null,
      status: "NO_DISTANCE",
      message: "거리 정보가 없어 운송료를 계산할 수 없습니다.",
    };
  }

  const group = input.vehicleGroup ? String(input.vehicleGroup).toUpperCase() : "";
  if (group === "MOTORCYCLE" || group === "DAMAS" || group === "LABO") {
    const vehicleKey = INSUNG_VEHICLE_MAPPING[group as keyof typeof INSUNG_VEHICLE_MAPPING];
    const range = findRange(INSUNG_FARE_RANGES, km);
    if (!range) {
      return {
        amount: null,
        provider: "INSUNG",
        rangeLabel: null,
        vehicleKey,
        status: "NO_RANGE",
        message: "해당 거리 구간의 운송료표가 없습니다.",
      };
    }
    const amount = range.rates[vehicleKey];
    return {
      amount,
      provider: "INSUNG",
      rangeLabel: range.distanceLabel,
      vehicleKey,
      status: amount == null ? "NO_RATE" : "OK",
      message: amount == null ? "운송료 데이터 없음: 수동 확인 필요" : null,
    };
  }

  if (group === "ONE_TON_PLUS") {
    const vehicleKey = mapCall24VehicleKey(input.vehicleTonnage);
    if (!vehicleKey) {
      return {
        amount: null,
        provider: "CALL24",
        rangeLabel: null,
        vehicleKey: null,
        status: "NO_VEHICLE_RATE_TABLE",
        message: "해당 차량 운송료표 없음: 수동 확인 필요",
      };
    }
    const range = findRange(CALL24_FARE_RANGES, km);
    if (!range) {
      return {
        amount: null,
        provider: "CALL24",
        rangeLabel: null,
        vehicleKey,
        status: "NO_RANGE",
        message: "해당 거리 구간의 운송료표가 없습니다.",
      };
    }
    const amount = range.rates[vehicleKey];
    return {
      amount,
      provider: "CALL24",
      rangeLabel: range.distanceLabel,
      vehicleKey,
      status: amount == null ? "NO_RATE" : "OK",
      message: amount == null ? "운송료 데이터 없음: 수동 확인 필요" : null,
    };
  }

  return {
    amount: null,
    provider: null,
    rangeLabel: null,
    vehicleKey: null,
    status: "NO_VEHICLE_RATE_TABLE",
    message: "해당 차량 운송료표 없음: 수동 확인 필요",
  };
}

export function calculateQuotedPriceByFreightTable(input: {
  distanceKm: unknown;
  vehicleGroup: VehicleGroup;
  vehicleTonnage?: unknown;
}): number | null {
  return lookupFreightFare(input).amount;
}
