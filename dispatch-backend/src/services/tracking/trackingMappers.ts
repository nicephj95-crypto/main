import type { DispatchTrackingDto, TrackingRequestContext } from "./trackingTypes";
import { normalizeHwamul24Status, normalizeInsungStatus } from "./statusNormalizer";

type Coord = { lat: number; lng: number };

const REGION_COORDS: Array<{ pattern: RegExp; coord: Coord }> = [
  { pattern: /서울|강남|마포|송파|종로/, coord: { lat: 37.5665, lng: 126.9780 } },
  { pattern: /인천|청라|미추홀|서구/, coord: { lat: 37.4563, lng: 126.7052 } },
  { pattern: /경기|성남|수원|용인|화성/, coord: { lat: 37.2636, lng: 127.0286 } },
  { pattern: /부산/, coord: { lat: 35.1796, lng: 129.0756 } },
  { pattern: /대구/, coord: { lat: 35.8714, lng: 128.6014 } },
  { pattern: /대전/, coord: { lat: 36.3504, lng: 127.3845 } },
  { pattern: /광주/, coord: { lat: 35.1595, lng: 126.8526 } },
];

export function mockGeocodeAddress(address: string | null | undefined): Coord | null {
  const raw = address?.trim();
  if (!raw) return null;
  const matched = REGION_COORDS.find((item) => item.pattern.test(raw));
  if (matched) return matched.coord;

  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return {
    lat: 36.1 + (hash % 2400) / 1000,
    lng: 126.2 + ((hash >> 8) % 2600) / 1000,
  };
}

export function midpoint(a: Coord | null, b: Coord | null): Coord | null {
  if (!a || !b) return a ?? b;
  return {
    lat: (a.lat * 0.58) + (b.lat * 0.42),
    lng: (a.lng * 0.58) + (b.lng * 0.42),
  };
}

export function baseTrackingDto(
  context: TrackingRequestContext
): Omit<
  DispatchTrackingDto,
  "provider" | "dispatchStatus" | "currentLat" | "currentLng" | "currentAddress" | "locationUpdatedAt" | "hasLocation" | "message"
> {
  const pickup = context.pickupCoord;
  const dropoff = context.dropoffCoord;
  const driver = context.driver;

  return {
    requestId: context.requestId,
    orderNo: context.call24OrdNo ?? context.insungSerialNumber ?? context.orderNumber,
    driverName: driver?.name ?? null,
    driverPhone: driver?.phone ?? null,
    carNumber: driver?.carNumber ?? null,
    carTon: driver?.carTon ?? null,
    carType: driver?.carType ?? null,
    pickupName: context.pickupName,
    pickupAddress: context.pickupAddress,
    pickupLat: pickup?.lat ?? null,
    pickupLng: pickup?.lng ?? null,
    dropoffName: context.dropoffName,
    dropoffAddress: context.dropoffAddress,
    dropoffLat: dropoff?.lat ?? null,
    dropoffLng: dropoff?.lng ?? null,
    hasDriverInfo: Boolean(driver?.name || driver?.phone || driver?.carNumber),
  };
}

export type Hwamul24TrackingRaw = {
  ordNo?: string | null;
  ordStatus?: unknown;
  cjName?: string | null;
  cjPhone?: string | null;
  cjCarNum?: string | null;
  cjCargoTon?: string | number | null;
  cjTruckType?: string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  addr?: string | null;
  updatedAt?: string | null;
};

export function mapHwamul24RawToTrackingDto(
  context: TrackingRequestContext,
  raw: Hwamul24TrackingRaw
): DispatchTrackingDto {
  const base = baseTrackingDto(context);
  const lat = raw.lat == null || raw.lat === "" ? null : Number(raw.lat);
  const lng = raw.lng == null || raw.lng === "" ? null : Number(raw.lng);

  return {
    ...base,
    orderNo: raw.ordNo ?? base.orderNo,
    provider: "hwamul24",
    dispatchStatus: normalizeHwamul24Status(raw.ordStatus),
    driverName: raw.cjName ?? base.driverName,
    driverPhone: raw.cjPhone ?? base.driverPhone,
    carNumber: raw.cjCarNum ?? base.carNumber,
    carTon: raw.cjCargoTon == null ? base.carTon : String(raw.cjCargoTon),
    carType: raw.cjTruckType ?? base.carType,
    currentLat: Number.isFinite(lat) ? lat : null,
    currentLng: Number.isFinite(lng) ? lng : null,
    currentAddress: raw.addr ?? null,
    locationUpdatedAt: raw.updatedAt ?? null,
    hasDriverInfo: Boolean(raw.cjName || raw.cjPhone || raw.cjCarNum || base.hasDriverInfo),
    hasLocation: Number.isFinite(lat) && Number.isFinite(lng),
    message: null,
  };
}

export function mapInsungRawToTrackingDto(
  context: TrackingRequestContext,
  raw: Record<string, unknown>
): DispatchTrackingDto {
  const base = baseTrackingDto(context);
  return {
    ...base,
    provider: "insung",
    dispatchStatus: normalizeInsungStatus(raw.status),
    currentLat: null,
    currentLng: null,
    currentAddress: null,
    locationUpdatedAt: null,
    hasLocation: false,
    message: "인성 tracking provider는 mapper 자리만 준비되어 있습니다.",
  };
}
