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
  | "LABO"
  | "ONE_TON_PLUS";

export type RequestType = "NORMAL" | "URGENT" | "DIRECT" | "ROUND_TRIP";

export type PaymentMethod =
  | "CREDIT"
  | "CARD"
  | "CASH_PREPAID"
  | "CASH_COLLECT";

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
  sourceRequestId?: number | null;
  orderNumber?: string | null;
  pickupAddressBookId?: number | null;
  dropoffAddressBookId?: number | null;
  targetCompanyName?: string | null;
  targetCompanyContactName?: string | null;
  targetCompanyContactPhone?: string | null;
  pickupNotify?: boolean;
  dropoffNotify?: boolean;
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
  orderNumber?: string | null;
  ownerCompany?: {
    id: number;
    name: string;
  } | null;
  ownerCompanyName?: string | null;
  pickupPlaceName: string;
  pickupAddress?: string;
  pickupAddressDetail?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupAddressBookId?: number | null;
  pickupIsImmediate?: boolean;
  pickupDatetime?: string | null;
  pickupMemo?: string | null;
  dropoffPlaceName: string;
  dropoffAddress?: string;
  dropoffAddressDetail?: string | null;
  dropoffContactName?: string | null;
  dropoffContactPhone?: string | null;
  dropoffAddressBookId?: number | null;
  dropoffIsImmediate?: boolean;
  dropoffDatetime?: string | null;
  dropoffMemo?: string | null;
  distanceKm: number | null;
  quotedPrice: number | null;
  status: RequestStatus;
  createdAt: string; // ISO 문자열 (예: "2025-12-02T05:57:21.123Z")
  requestType?: RequestType | null;
  paymentMethod?: PaymentMethod | null;
  cargoDescription?: string | null;
  driverNote?: string | null;
  specialMemo?: string | null;
  hasImages?: boolean;
  imageCount?: number;
  hasReceiptImage?: boolean;
  vehicleGroup?: VehicleGroup | null;
  vehicleTonnage?: number | null;
  vehicleBodyType?: string | null;
  actualFare?: number | null;
  billingPrice?: number | null;
  extraFare?: number | null;
  targetCompanyName?: string | null;
  targetCompanyContactName?: string | null;
  targetCompanyContactPhone?: string | null;
  createdByName?: string | null;
  createdByCompany?: string | null;
  assignedByName?: string | null;
  driverName?: string | null;
  driverPhone?: string | null;
  driverVehicleNumber?: string | null;
  driverVehicleTonnage?: number | null;
  driverVehicleBodyType?: string | null;
  externalEstimatedPrice?: number | null;
  externalSentPrice?: number | null;
  externalPlatform?: string | null;
};

export type RequestImageAsset = {
  id: number;
  requestId: number;
  storageProvider: string;
  storageKey: string;
  publicUrl?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  kind: string;
  sortOrder: number;
  createdAt: string;
  url: string;
};

// 배차내역 목록 + 페이지네이션 응답 타입
export type RequestListResponse = {
  items: RequestSummary[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts: Record<RequestStatus, number>;
};

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
  provider: "mock" | "hwamul24" | "insung" | null;
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

export type PaginatedRequestList = {
  items: RequestSummary[];
  total: number;
  page: number;
  pageSize: number;
};

// 주소록 엔트리 타입
export type AddressBookEntry = {
  id: number;
  userId?: number;
  companyName?: string | null;
  businessName?: string | null;
  placeName: string;
  type: "PICKUP" | "DROPOFF" | "BOTH";
  address: string;
  addressDetail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  lunchTime?: string | null;
  memo?: string | null;
  createdAt?: string;
  updatedAt?: string;
  hasImages?: boolean;
  imageCount?: number;
};

export type AddressBookImageAsset = {
  id: number;
  addressBookId: number;
  storageProvider: string;
  storageKey: string;
  publicUrl?: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
  kind: string;
  sortOrder: number;
  createdAt: string;
  url: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  size: number;
};

export type AddressBookListResponse = PaginatedResponse<AddressBookEntry>;
export type UsersListResponse = PaginatedResponse<User>;
export type GroupsListResponse = PaginatedResponse<GroupManagementGroup>;

export type CreateAddressBookBody = {
  businessName?: string | null;
  placeName: string;
  address: string;
  addressDetail?: string | null;   
  contactName?: string | null;    
  contactPhone?: string | null;    
  lunchTime?: string | null;
  memo?: string | null;
  type?: "PICKUP" | "DROPOFF" | "BOTH";
};

export type AddressBookImportIssue = {
  row: number;
  reason: string;
};

export type AddressBookImportResult = {
  message: string;
  totalRows: number;
  createdCount: number;
  skippedCount: number;
  failureCount: number;
  skipped: AddressBookImportIssue[];
  failures: AddressBookImportIssue[];
  appliedCompanyName?: string | null;
  companyNameOverridden?: number;
};

export type RequestDetail = {
  id: number;
  orderNumber?: string | null;
  createdAt: string;
  updatedAt: string;
  status: RequestStatus;
  ownerCompanyId?: number | null;
  ownerCompany?: {
    id: number;
    name: string;
  } | null;

  pickupPlaceName: string;
  pickupAddress: string;
  pickupAddressDetail?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  pickupAddressBookId?: number | null;
  pickupMethod: LoadMethod;
  pickupIsImmediate: boolean;
  pickupDatetime?: string | null;
  pickupMemo?: string | null;

  dropoffPlaceName: string;
  dropoffAddress: string;
  dropoffAddressDetail?: string | null;
  dropoffContactName?: string | null;
  dropoffContactPhone?: string | null;
  dropoffAddressBookId?: number | null;
  dropoffMethod: LoadMethod;
  dropoffIsImmediate: boolean;
  dropoffDatetime?: string | null;
  dropoffMemo?: string | null;

  vehicleGroup?: VehicleGroup | null;
  vehicleTonnage?: number | null;
  vehicleBodyType?: string | null;

  cargoDescription?: string | null;

  requestType: RequestType;
  driverNote?: string | null;

  paymentMethod?: PaymentMethod | null;
  distanceKm?: number | null;
  quotedPrice?: number | null;
  pickupNotify?: boolean;
  dropoffNotify?: boolean;
  actualFare?: number | null;
  billingPrice?: number | null;
  targetCompanyName?: string | null;
  targetCompanyContactName?: string | null;
  targetCompanyContactPhone?: string | null;

  createdById?: number | null;
  createdBy?: {
    id: number;
    name: string;
    companyName?: string | null;
  } | null;

  assignments?: Array<{
    id: number;
    requestId: number;
    driverId: number;
    assignedAt: string;
    updatedAt?: string;
    isActive?: boolean;
    endedAt?: string | null;
    endedReason?: string | null;
    memo?: string | null;
    actualFare?: number | null;
    billingPrice?: number | null;
    extraFare?: number | null;        // 대외비 (staff only)
    extraFareReason?: string | null;  // 대외비 (staff only)
    codRevenue?: number | null;       // 대외비 (staff only)
    customerMemo?: string | null;     // 공개
    internalMemo?: string | null;     // 대외비 (staff only)
    driver?: {
      id: number;
      name: string;
      phone: string;
      vehicleNumber?: string | null;
      vehicleGroup?: VehicleGroup | null;
      vehicleTonnage?: number | null;
      vehicleBodyType?: string | null;
      region?: string | null;
      memo?: string | null;
    } | null;
  }>;
  activeAssignment?: {
    id: number;
    requestId: number;
    driverId: number;
    assignedAt: string;
    updatedAt?: string;
    isActive?: boolean;
    endedAt?: string | null;
    endedReason?: string | null;
    memo?: string | null;
    actualFare?: number | null;
    billingPrice?: number | null;
    extraFare?: number | null;
    extraFareReason?: string | null;
    codRevenue?: number | null;
    customerMemo?: string | null;
    internalMemo?: string | null;
    driver?: {
      id: number;
      name: string;
      phone: string;
      vehicleNumber?: string | null;
      vehicleGroup?: VehicleGroup | null;
      vehicleTonnage?: number | null;
      vehicleBodyType?: string | null;
      region?: string | null;
      memo?: string | null;
    } | null;
  } | null;
  assignmentHistory?: Array<{
    id: number;
    requestId: number;
    driverId: number;
    assignedAt: string;
    updatedAt?: string;
    isActive?: boolean;
    endedAt?: string | null;
    endedReason?: string | null;
    memo?: string | null;
    actualFare?: number | null;
    billingPrice?: number | null;
    extraFare?: number | null;
    extraFareReason?: string | null;
    codRevenue?: number | null;
    customerMemo?: string | null;
    internalMemo?: string | null;
    driver?: {
      id: number;
      name: string;
      phone: string;
      vehicleNumber?: string | null;
      vehicleGroup?: VehicleGroup | null;
      vehicleTonnage?: number | null;
      vehicleBodyType?: string | null;
      region?: string | null;
      memo?: string | null;
    } | null;
  }>;
  images?: RequestImageAsset[];

  // 외부 연동 상태 (STAFF만 사용)
  insungSerialNumber?: string | null;
  insungSyncStatus?: string | null;   // "NONE" | "PENDING" | "SUCCESS" | "FAILED"
  insungSyncedAt?: string | null;
  insungLastError?: string | null;
  insungLastLocationLat?: number | null;
  insungLastLocationLon?: number | null;
  insungLastLocationAt?: string | null;

  call24OrdNo?: string | null;
  call24SyncStatus?: string | null;   // "NONE" | "PENDING" | "SUCCESS" | "FAILED"
  call24SyncedAt?: string | null;
  call24LastError?: string | null;
  call24LastLocationLat?: number | null;
  call24LastLocationLon?: number | null;
  call24LastLocationAt?: string | null;

  externalEstimatedPrice?: number | null;
  externalSentPrice?: number | null;
  externalPlatform?: string | null;
};

// 네이버 Directions 결과를 백엔드가 정리해서 돌려주는 타입
export type DistanceResponse = {
  distanceKm: number;
  durationMinutes?: number | null;
  mode?: string;
};


// ─────────────────────────────────────────────
// 유저 / 인증 관련 타입
// ─────────────────────────────────────────────

export type UserRole = "ADMIN" | "DISPATCHER" | "SALES" | "CLIENT";

export type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  companyName?: string | null;
  phone?: string | null;
  department?: string | null;
  isActive?: boolean;
  showQuotedPrice?: boolean;
  createdAt: string;
};

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  token: string;
  refreshToken?: string; // HttpOnly 쿠키로 전환 후 응답 본문에서 제거됨
  user: User;
};

export type SignupRequestBody = {
  name: string;
  email: string;
  password: string;
};

export type SignupResponse = {
  message: string;
};

export type SignupRequestStatus = "PENDING" | "APPROVED" | "REJECTED";

export type SignupRequest = {
  id: number;
  name: string;
  email: string;
  status: SignupRequestStatus;
  reviewedAt?: string | null;
  reviewedBy?: {
    id: number;
    name: string;
    email: string;
  } | null;
  createdAt: string;
};

export type ReviewSignupRequestBody = {
  action: "APPROVE" | "REJECT";
  role?: UserRole;
  companyName?: string | null;
  department?: string | null;
};

export type ReviewSignupRequestResponse = {
  message: string;
  request: SignupRequest;
  user?: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    companyName?: string | null;
    department?: string | null;
    createdAt: string;
  };
};

export type SignupRequestsListResponse = PaginatedResponse<SignupRequest>;

export type UpdateProfileBody = {
  name: string;
};

export type UpdateProfileResponse = {
  message: string;
  user: User;
};

// 회사명 관리
export type CompanyName = {
  id: number;
  name: string;
  createdAt: string;
};

export type GroupDepartment = {
  id: number;
  groupId: number;
  name: string;
  contactCount: number;
  createdAt: string;
  updatedAt: string;
};

export type GroupContact = {
  id: number;
  groupId: number;
  departmentId: number;
  departmentName: string;
  name: string;
  position?: string | null;
  phone?: string | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GroupManagementGroup = {
  id: number;
  name: string;
  createdAt: string;
  departments: GroupDepartment[];
  contacts: GroupContact[];
};

// 변경이력
export type AuditLogEntry = {
  id: number;
  userId: number | null;
  userName: string | null;
  userRole: string | null;
  action: string;
  resource: string;
  resourceId: number | null;
  target?: string | null;
  detail: string | null;
  createdAt: string;
};
