export type TrackingProviderName = "mock" | "hwamul24" | "insung";

export type DispatchTrackingStatus =
  | "RECEIVED"
  | "DISPATCHING"
  | "DISPATCHED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "COMPLETED"
  | "CANCELLED"
  | "UNKNOWN";

export type DispatchTrackingDto = {
  requestId: number;
  orderNo: string | null;
  provider: TrackingProviderName | null;
  dispatchStatus: DispatchTrackingStatus;
  driverName: string | null;
  driverPhone: string | null;
  carNumber: string | null;
  carTon: string | null;
  carType: string | null;
  currentLat: number | null;
  currentLng: number | null;
  currentAddress: string | null;
  locationUpdatedAt: string | null;
  pickupName: string | null;
  pickupAddress: string | null;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffName: string | null;
  dropoffAddress: string | null;
  dropoffLat: number | null;
  dropoffLng: number | null;
  hasDriverInfo: boolean;
  hasLocation: boolean;
  message: string | null;
};

export type TrackingDriverSnapshot = {
  name: string | null;
  phone: string | null;
  carNumber: string | null;
  carTon: string | null;
  carType: string | null;
};

export type TrackingRequestContext = {
  requestId: number;
  orderNumber: string | null;
  call24OrdNo: string | null;
  insungSerialNumber: string | null;
  vehicleGroup: string | null;
  status: string;
  pickupName: string | null;
  pickupAddress: string | null;
  pickupAddressDetail: string | null;
  pickupCoord: { lat: number; lng: number } | null;
  dropoffName: string | null;
  dropoffAddress: string | null;
  dropoffAddressDetail: string | null;
  dropoffCoord: { lat: number; lng: number } | null;
  driver: TrackingDriverSnapshot | null;
};

export type TrackingQueryOptions = {
  mockCase?: string | null;
  provider?: TrackingProviderName | null;
};

export interface TrackingProvider {
  readonly name: TrackingProviderName;
  getTracking(context: TrackingRequestContext, options?: TrackingQueryOptions): Promise<DispatchTrackingDto>;
}
