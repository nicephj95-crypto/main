// src/api/types.ts

// 백엔드 enum과 맞춘 타입들
export type LoadMethod =
  | "FORKLIFT"
  | "MANUAL"
  | "SUDOU_SUHAEJUNG"
  | "HOIST"
  | "CRANE"
  | "CONVEYOR";

export type VehicleGroup =
  | "MOTORCYCLE"
  | "DAMAS"
  | "ONE_TON"
  | "ONE_TON_PLUS"
  | "FIVE_TON"
  | "ELEVEN_TON";

export type RequestType = "NORMAL" | "URGENT" | "DIRECT" | "ROUND_TRIP";

export type PaymentMethod =
  | "CARD"
  | "CASH"
  | "BANK_TRANSFER";

// 섹션별 payload 구조 (백엔드에서 받는 형태와 1:1)
export type PickupPayload = {
  placeName: string;
  address: string;
  addressDetail?: string | null;   
  contactName?: string | null;    
  contactPhone?: string | null;    
  method: LoadMethod;
  isImmediate?: boolean;
  datetime?: string | null;        
};


export type DropoffPayload = PickupPayload;

export type VehiclePayload = {
  group?: VehicleGroup;
  tonnage?: number | null;         
  bodyType?: string | null;        
};

export type CargoPayload = {
  description?: string | null;     
};

export type OptionsPayload = {
  requestType?: RequestType;
  driverNote?: string | null;     
};

export type PaymentPayload = {
  method?: PaymentMethod;
  distanceKm?: number | null;      
  quotedPrice?: number | null;     
};

export type CreateRequestBody = {
  pickup: PickupPayload;
  dropoff: DropoffPayload;
  vehicle?: VehiclePayload;
  cargo?: CargoPayload;
  options?: OptionsPayload;
  payment?: PaymentPayload;
};

// ─────────────────────────────────────────────
// 배차내역 리스트용 타입
// ─────────────────────────────────────────────

export type RequestStatus =
  | "PENDING"
  | "DISPATCHING"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

export type RequestSummary = {
  id: number;
  pickupPlaceName: string;
  dropoffPlaceName: string;
  distanceKm: number | null;
  quotedPrice: number | null;
  status: RequestStatus;
  createdAt: string; // ISO 문자열 (예: "2025-12-02T05:57:21.123Z")
};

// 주소록 엔트리 타입
export type AddressBookEntry = {
  id: number;
  placeName: string;
  type: "PICKUP" | "DROPOFF" | "BOTH";
  address: string;
  addressDetail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
};

export type CreateAddressBookBody = {
  placeName: string;
  address: string;
  addressDetail?: string | null;   
  contactName?: string | null;    
  contactPhone?: string | null;    
  type?: "PICKUP" | "DROPOFF" | "BOTH";
};

export type RequestDetail = {
  id: number;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;

  pickupPlaceName: string;
  pickupAddress: string;
  pickupAddressDetail?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupMethod: LoadMethod;
  pickupIsImmediate: boolean;
  pickupDatetime?: string | null;

  dropoffPlaceName: string;
  dropoffAddress: string;
  dropoffAddressDetail?: string | null;
  dropoffContactName?: string | null;
  dropoffContactPhone?: string | null;
  dropoffMethod: LoadMethod;
  dropoffIsImmediate: boolean;
  dropoffDatetime?: string | null;

  vehicleGroup?: VehicleGroup | null;
  vehicleTonnage?: number | null;
  vehicleBodyType?: string | null;

  cargoDescription?: string | null;

  requestType: RequestType;
  driverNote?: string | null;

  paymentMethod?: PaymentMethod | null;
  distanceKm?: number | null;
  quotedPrice?: number | null;

  createdById?: number | null;
};

// 네이버 Directions 결과를 백엔드가 정리해서 돌려주는 타입
export type DistanceResponse = {
  provider: string;          // "naver-directions" 등
  distanceMeters: number;    // m
  distanceKm: number;        // km (소수 1자리 정도)
  durationSeconds?: number | null; // 주행 시간(초) - 선택
};


// ─────────────────────────────────────────────
// 유저 / 인증 관련 타입
// ─────────────────────────────────────────────

export type UserRole = "ADMIN" | "DISPATCHER";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  user: User;
};

export type SignupRequestBody = {
  name: string;
  email: string;
  password: string;
};