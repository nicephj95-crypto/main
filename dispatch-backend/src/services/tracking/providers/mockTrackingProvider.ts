import type { DispatchTrackingDto, TrackingProvider, TrackingQueryOptions, TrackingRequestContext } from "../trackingTypes";
import { baseTrackingDto, midpoint, mockGeocodeAddress } from "../trackingMappers";
import { normalizeInternalRequestStatus } from "../statusNormalizer";

function resolveMockCase(context: TrackingRequestContext, requested?: string | null) {
  if (requested && ["unassigned", "assigned_no_location", "in_transit", "completed"].includes(requested)) {
    return requested;
  }
  return "in_transit";
}

function mockDriver(context: TrackingRequestContext) {
  return context.driver ?? {
    name: "김모의",
    phone: "010-0000-1234",
    carNumber: "서울80바1234",
    carTon: "1톤",
    carType: "카고",
  };
}

export const mockTrackingProvider: TrackingProvider = {
  name: "mock",

  async getTracking(context: TrackingRequestContext, options?: TrackingQueryOptions): Promise<DispatchTrackingDto> {
    const mockCase = resolveMockCase(context, options?.mockCase);
    const pickup = mockGeocodeAddress(context.pickupAddress);
    const dropoff = mockGeocodeAddress(context.dropoffAddress);
    const driver = mockDriver(context);
    const base = baseTrackingDto({
      ...context,
      driver: mockCase === "unassigned" ? null : driver,
    });

    if (mockCase === "unassigned") {
      return {
        ...base,
        provider: "mock",
        dispatchStatus: "DISPATCHING",
        currentLat: null,
        currentLng: null,
        currentAddress: null,
        locationUpdatedAt: null,
        hasLocation: false,
        message: "아직 배차된 기사 정보가 없습니다.",
      };
    }

    if (mockCase === "assigned_no_location") {
      return {
        ...base,
        provider: "mock",
        dispatchStatus: "DISPATCHED",
        currentLat: null,
        currentLng: null,
        currentAddress: null,
        locationUpdatedAt: null,
        hasLocation: false,
        message: "기사정보는 있으나 현재 위치가 아직 수신되지 않았습니다.",
      };
    }

    if (mockCase === "completed") {
      return {
        ...base,
        provider: "mock",
        dispatchStatus: "COMPLETED",
        currentLat: dropoff?.lat ?? null,
        currentLng: dropoff?.lng ?? null,
        currentAddress: context.dropoffAddress,
        locationUpdatedAt: new Date(Date.now() - 12 * 60_000).toISOString(),
        hasLocation: Boolean(dropoff),
        message: "운행이 완료되었습니다.",
      };
    }

    const current = midpoint(pickup, dropoff);
    return {
      ...base,
      provider: "mock",
      dispatchStatus: normalizeInternalRequestStatus(context.status) === "COMPLETED"
        ? "COMPLETED"
        : "IN_TRANSIT",
      currentLat: current?.lat ?? null,
      currentLng: current?.lng ?? null,
      currentAddress: current ? "상차지와 하차지 사이 이동 중" : null,
      locationUpdatedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
      hasLocation: Boolean(current),
      message: current ? "기사 위치 mock 데이터입니다." : "표시할 좌표가 없습니다.",
    };
  },
};
