// src/hooks/useRequestForm.ts
import { useState, useEffect, useRef } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  createRequest,
  getDistanceByAddress,
  listRecentRequests,
  getRequestDetail,
  updateRequest,
  uploadRequestImages,
  listAddressBook,
  createAddressBookEntry,
} from "../api/client";
import type {
  CreateRequestBody,
  DistanceResponse,
  AddressBookEntry,
  RequestSummary,
  RequestDetail,
} from "../api/types";
import { formatSelectedAddress } from "../utils/addressFormat";
import {
  getAllowedVehicleBodyTypes,
  getDefaultVehicleBodyType,
  isVehicleBodyTypeAllowed,
  normalizeVehicleBodyType,
  VEHICLE_INFO,
  VEHICLE_SPEC,
  type VehicleGroup,
  type VehicleGroupValue,
  vehicleKeyFromStored,
} from "../utils/vehicleCatalog";
import { lookupFreightFare } from "../utils/freightPricing";
import { formatPhoneNumber } from "../utils/phoneFormat";

export type { VehicleGroup, VehicleGroupValue, VehicleKey, VehicleSpec } from "../utils/vehicleCatalog";
export { VEHICLE_INFO, VEHICLE_SPEC, vehicleKeyFromStored } from "../utils/vehicleCatalog";

export type Method =
  | "MANUAL"
  | "FORKLIFT"
  | "SUDOU_SUHAEJUNG"
  | "HOIST"
  | "CRANE"
  | "CONVEYOR";
export type MethodValue = Method | "";

export type RequestType = "NORMAL" | "URGENT" | "DIRECT" | "ROUND_TRIP";
export type PaymentMethod = "CREDIT" | "CARD" | "CASH_PREPAID" | "CASH_COLLECT";
export type RequestTypeValue = RequestType | "";
export type PaymentUiValue = "CREDIT" | "CARD" | "PREPAID" | "COLLECT" | "";

export type ScheduleDraft = {
  month: string;
  day: string;
  hour: string;
  minute: string;
};

type UseRequestFormParams = {
  isAuthenticated?: boolean;
  userId?: number | null;
  userRole?: string | null;
  userCompanyName?: string | null;
  mode?: "create" | "edit" | "copy";
  editRequestId?: number | null;
  copyRequestId?: number | null;
  onRequestCreated?: () => void;
  onRequestUpdated?: () => void;
};

const CARGO_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function replaceImageExtension(name: string, ext: "png" | "jpg") {
  const base = name.replace(/\.[^.]+$/, "") || "cargo-image";
  return `${base}.${ext}`;
}

function blobFromCanvas(
  canvas: HTMLCanvasElement,
  type: "image/png" | "image/jpeg",
  quality?: number
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

async function normalizeCargoImageFile(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("이미지 파일을 읽을 수 없습니다."));
      img.src = url;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!canvas.width || !canvas.height || !context) {
      throw new Error("이미지 파일을 처리할 수 없습니다.");
    }

    context.drawImage(image, 0, 0);

    const pngBlob = await blobFromCanvas(canvas, "image/png");
    if (pngBlob && pngBlob.size <= CARGO_IMAGE_MAX_BYTES) {
      return new File([pngBlob], replaceImageExtension(file.name, "png"), {
        type: "image/png",
      });
    }

    const jpegBlob = await blobFromCanvas(canvas, "image/jpeg", 0.9);
    if (jpegBlob) {
      return new File([jpegBlob], replaceImageExtension(file.name, "jpg"), {
        type: "image/jpeg",
      });
    }

    throw new Error("이미지 파일을 변환할 수 없습니다.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

const DEFAULT_NOTIFY_ENABLED = true;
const DEFAULT_REQUEST_TYPE: RequestType = "NORMAL";
const DEFAULT_DRIVER_NOTE = "";
const DEFAULT_PAYMENT_UI: PaymentUiValue = "CREDIT";
function buildNotifyStorageKey(userId?: number | null) {
  return `request-alimtalk-notify:${userId ?? "guest"}`;
}

function readStoredNotifyPreference(userId?: number | null) {
  if (typeof window === "undefined") {
    return {
      defaultNotifyEnabled: DEFAULT_NOTIFY_ENABLED,
    };
  }

  try {
    const raw = window.localStorage.getItem(buildNotifyStorageKey(userId));
    if (!raw) {
      return {
        defaultNotifyEnabled: DEFAULT_NOTIFY_ENABLED,
      };
    }

    const parsed = JSON.parse(raw) as {
      defaultNotifyEnabled?: boolean;
      pickupNotify?: boolean;
      dropoffNotify?: boolean;
    };

    const legacyDefault =
      typeof parsed.pickupNotify === "boolean" && typeof parsed.dropoffNotify === "boolean"
        ? parsed.pickupNotify && parsed.dropoffNotify
        : DEFAULT_NOTIFY_ENABLED;

    return {
      defaultNotifyEnabled:
        typeof parsed.defaultNotifyEnabled === "boolean"
          ? parsed.defaultNotifyEnabled
          : legacyDefault,
    };
  } catch {
    return {
      defaultNotifyEnabled: DEFAULT_NOTIFY_ENABLED,
    };
  }
}

function buildDistanceAddressKey(pickupAddress: string, dropoffAddress: string) {
  const normalizedPickupAddress = pickupAddress.trim().replace(/\s+/g, " ");
  const normalizedDropoffAddress = dropoffAddress.trim().replace(/\s+/g, " ");
  if (!normalizedPickupAddress || !normalizedDropoffAddress) {
    return "";
  }
  return `${normalizedPickupAddress}::${normalizedDropoffAddress}`;
}

export function useRequestForm({
  isAuthenticated = false,
  userId = null,
  userRole = null,
  userCompanyName = null,
  mode = "create",
  editRequestId = null,
  copyRequestId = null,
  onRequestCreated,
  onRequestUpdated,
}: UseRequestFormParams) {
  const lastDistanceRequestKeyRef = useRef<string | null>(null);
  const lastDistanceResolvedKeyRef = useRef<string | null>(null);
  const distanceRequestSeqRef = useRef(0);
  const submitInProgressRef = useRef(false);
  const originalAddressDistanceKeyRef = useRef<string | null>(null);
  const originalDistanceKmRef = useRef<number | null>(null);
  const originalQuotedPriceRef = useRef<number | null>(null);
  const previousModeRef = useRef<"create" | "edit" | "copy">(mode);
  const skipVehicleResetRef = useRef(false);
  const isEditMode = mode === "edit" && editRequestId != null;
  const isCopyMode = mode === "copy" && copyRequestId != null;

  // 업체선택이 필요한 역할 (ADMIN, DISPATCHER, SALES)
  const needsCompanySelect = userRole === "ADMIN" || userRole === "DISPATCHER" || userRole === "SALES";
  const autoRegisterEnabled = (() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("addressAutoRegister");
    return saved !== null ? saved === "true" : true;
  })();

  // ✅ 어떤 필드에서 주소록을 여는지 기억 (null이면 모달 닫힘)
  const [addressBookModalTarget, setAddressBookModalTarget] =
    useState<"pickup" | "dropoff" | null>(null);

  // ✅ 최근 배차내역 관련 상태
  const [recentRequests, setRecentRequests] = useState<RequestSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  // 출발지
  const [pickupPlaceName, setPickupPlaceName] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupAddressDetail, setPickupAddressDetail] = useState("");
  const [pickupContactName, setPickupContactName] = useState("");
  const [pickupContactPhone, setPickupContactPhone] = useState("");
  const [pickupAddressBookId, setPickupAddressBookId] = useState<number | null>(null);
  const [pickupMethod, setPickupMethod] = useState<MethodValue>("");
  const [pickupIsImmediate, setPickupIsImmediate] = useState(true);
  const [pickupDatetime, setPickupDatetime] = useState<string>("");

  // 도착지
  const [dropoffPlaceName, setDropoffPlaceName] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffAddressDetail, setDropoffAddressDetail] = useState("");
  const [dropoffContactName, setDropoffContactName] = useState("");
  const [dropoffContactPhone, setDropoffContactPhone] = useState("");
  const [dropoffAddressBookId, setDropoffAddressBookId] = useState<number | null>(null);
  const [dropoffMethod, setDropoffMethod] = useState<MethodValue>("");
  const [dropoffIsImmediate, setDropoffIsImmediate] = useState(true);
  const [dropoffDatetime, setDropoffDatetime] = useState<string>("");
  const savedNonManualMethodsRef = useRef<{
    pickupMethod: MethodValue;
    dropoffMethod: MethodValue;
  } | null>(null);
  const previousVehicleGroupRef = useRef<VehicleGroupValue>("ONE_TON_PLUS");

  // 차량
  const [vehicleGroup, setVehicleGroup] = useState<VehicleGroupValue>("ONE_TON_PLUS");
  const [vehicleTonnage, setVehicleTonnage] = useState<number | "">(VEHICLE_INFO.ONE_TON_PLUS.defaultTon);
  const [vehicleBodyType, setVehicleBodyType] = useState<string>(VEHICLE_INFO.ONE_TON_PLUS.defaultType);

  // 화물 / 옵션
  const [cargoDescription, setCargoDescription] = useState("");
  const [requestType, setRequestType] = useState<RequestTypeValue>(DEFAULT_REQUEST_TYPE);
  const [driverNote, setDriverNote] = useState(DEFAULT_DRIVER_NOTE);

  // 결제 / 거리 / 요금
  const [paymentUi, setPaymentUi] = useState<PaymentUiValue>(DEFAULT_PAYMENT_UI);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [quotedPrice, setQuotedPrice] = useState<number | "">("");
  const [quotedPriceNote, setQuotedPriceNote] = useState("");

  // 상태
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargoImageModalOpen, setCargoImageModalOpen] = useState(false);
  const [cargoImages, setCargoImages] = useState<File[]>([]);
  const [submitFlash, setSubmitFlash] = useState(false);
  const [scheduleModalTarget, setScheduleModalTarget] =
    useState<"pickup" | "dropoff" | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>({
    month: "",
    day: "",
    hour: "",
    minute: "",
  });

  // 업체선택 (ADMIN/DISPATCHER/SALES용)
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>("");
  const [selectedCompanyContactName, setSelectedCompanyContactName] = useState<string>("");
  const [selectedCompanyContactPhone, setSelectedCompanyContactPhone] = useState<string>("");
  const addressBookBusinessName = (
    needsCompanySelect ? selectedCompanyName : userCompanyName
  )?.trim() || "";
  const notifyStorageKey = buildNotifyStorageKey(userId);
  const [notifyDefaultEnabled, setNotifyDefaultEnabled] = useState(DEFAULT_NOTIFY_ENABLED);
  const [pickupNotify, setPickupNotifyState] = useState(DEFAULT_NOTIFY_ENABLED);
  const [dropoffNotify, setDropoffNotifyState] = useState(DEFAULT_NOTIFY_ENABLED);

  const normalizedPickupAddress = pickupAddress.trim().replace(/\s+/g, " ");
  const normalizedDropoffAddress = dropoffAddress.trim().replace(/\s+/g, " ");
  const distanceRequestKey = buildDistanceAddressKey(pickupAddress, dropoffAddress);
  const canRequestDistance =
    isAuthenticated &&
    normalizedPickupAddress.length >= 5 &&
    normalizedDropoffAddress.length >= 5 &&
    normalizedPickupAddress !== normalizedDropoffAddress;
  const isOriginalAddressPair =
    isEditMode &&
    !!distanceRequestKey &&
    originalAddressDistanceKeyRef.current === distanceRequestKey;

  useEffect(() => {
    const stored = readStoredNotifyPreference(userId);
    setNotifyDefaultEnabled(stored.defaultNotifyEnabled);
    setPickupNotifyState(stored.defaultNotifyEnabled);
    setDropoffNotifyState(stored.defaultNotifyEnabled);
  }, [notifyStorageKey, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        notifyStorageKey,
        JSON.stringify({ defaultNotifyEnabled: notifyDefaultEnabled })
      );
    } catch {
      // ignore storage errors
    }
  }, [notifyStorageKey, notifyDefaultEnabled]);

  const setPickupNotify: Dispatch<SetStateAction<boolean>> = (value) => {
    setPickupNotifyState((prev) =>
      typeof value === "function" ? value(prev) : value
    );
  };

  const setDropoffNotify: Dispatch<SetStateAction<boolean>> = (value) => {
    setDropoffNotifyState((prev) =>
      typeof value === "function" ? value(prev) : value
    );
  };

  const applyFreightQuote = (km: number) => {
    const quote = lookupFreightFare({
      distanceKm: km,
      vehicleGroup,
      vehicleTonnage: vehicleTonnage === "" ? null : vehicleTonnage,
    });
    setQuotedPrice(quote.amount ?? "");
    setQuotedPriceNote(quote.amount == null ? quote.message ?? "수동 확인 필요" : "");
  };

  const applyDistanceResult = (km: number) => {
    setDistanceKm(km);
    applyFreightQuote(km);
  };

  useEffect(() => {
    if (distanceKm == null) return;
    if (isOriginalAddressPair) {
      setQuotedPrice(originalQuotedPriceRef.current ?? "");
      setQuotedPriceNote("");
      return;
    }
    applyFreightQuote(distanceKm);
  }, [distanceKm, vehicleGroup, vehicleTonnage, isOriginalAddressPair]);

  const requestDistance = async (options?: { silent?: boolean; force?: boolean }) => {
    const silent = options?.silent ?? false;
    const force = options?.force ?? false;

    if (!isAuthenticated) {
      if (!silent) {
        setError("거리 계산은 로그인 후 사용할 수 있습니다.");
      }
      return;
    }

    if (!canRequestDistance) {
      if (!silent) {
        setError("출발지/도착지 주소를 충분히 입력해 주세요.");
      }
      return;
    }

    if (!force && lastDistanceResolvedKeyRef.current === distanceRequestKey) {
      return;
    }

    if (lastDistanceRequestKeyRef.current === distanceRequestKey && calculating) {
      return;
    }

    const requestSeq = distanceRequestSeqRef.current + 1;
    distanceRequestSeqRef.current = requestSeq;
    lastDistanceRequestKeyRef.current = distanceRequestKey;
    setCalculating(true);

    try {
      const res: DistanceResponse = await getDistanceByAddress(
        normalizedPickupAddress,
        normalizedDropoffAddress
      );

      if (distanceRequestSeqRef.current !== requestSeq) {
        return;
      }

      if (!res || res.distanceKm == null) {
        throw new Error("거리 계산 결과가 없습니다.");
      }

      lastDistanceResolvedKeyRef.current = distanceRequestKey;
      if (!silent) {
        setError(null);
      }
      applyDistanceResult(res.distanceKm);
    } catch (err: any) {
      if (distanceRequestSeqRef.current !== requestSeq) {
        return;
      }

      if (!silent) {
        setError(err?.message || "거리/요금 계산 중 오류가 발생했습니다.");
      }
    } finally {
      if (distanceRequestSeqRef.current === requestSeq) {
        setCalculating(false);
      }
    }
  };

  // ✅ 주소록 버튼 클릭 → 모달 열기
  const handleOpenAddressBook = (target: "pickup" | "dropoff") => {
    setAddressBookModalTarget(target);
  };

  const clearPickupAddressBookReference = () => {
    setPickupAddressBookId(null);
  };

  const clearDropoffAddressBookReference = () => {
    setDropoffAddressBookId(null);
  };

  const handlePickupPlaceNameChange = (value: string) => {
    clearPickupAddressBookReference();
    setPickupPlaceName(value);
  };

  const handlePickupAddressDetailChange = (value: string) => {
    clearPickupAddressBookReference();
    setPickupAddressDetail(value);
  };

  const handlePickupContactNameChange = (value: string) => {
    clearPickupAddressBookReference();
    setPickupContactName(value);
  };

  const handlePickupContactPhoneChange = (value: string) => {
    clearPickupAddressBookReference();
    setPickupContactPhone(formatPhoneNumber(value));
  };

  const handleDropoffPlaceNameChange = (value: string) => {
    clearDropoffAddressBookReference();
    setDropoffPlaceName(value);
  };

  const handleDropoffAddressDetailChange = (value: string) => {
    clearDropoffAddressBookReference();
    setDropoffAddressDetail(value);
  };

  const handleDropoffContactNameChange = (value: string) => {
    clearDropoffAddressBookReference();
    setDropoffContactName(value);
  };

  const handleDropoffContactPhoneChange = (value: string) => {
    clearDropoffAddressBookReference();
    setDropoffContactPhone(formatPhoneNumber(value));
  };

  const resetRequestForm = () => {
    setPickupPlaceName("");
    setPickupAddress("");
    setPickupAddressDetail("");
    setPickupContactName("");
    setPickupContactPhone("");
    setPickupAddressBookId(null);
    setPickupMethod("");
    setPickupIsImmediate(true);
    setPickupDatetime("");

    setDropoffPlaceName("");
    setDropoffAddress("");
    setDropoffAddressDetail("");
    setDropoffContactName("");
    setDropoffContactPhone("");
    setDropoffAddressBookId(null);
    setDropoffMethod("");
    setDropoffIsImmediate(true);
    setDropoffDatetime("");

    setVehicleGroup("ONE_TON_PLUS");
    setVehicleTonnage(VEHICLE_INFO.ONE_TON_PLUS.defaultTon);
    setVehicleBodyType(VEHICLE_INFO.ONE_TON_PLUS.defaultType);

    setCargoDescription("");
    setRequestType(DEFAULT_REQUEST_TYPE);
    setDriverNote(DEFAULT_DRIVER_NOTE);

    setPaymentUi(DEFAULT_PAYMENT_UI);
    setDistanceKm(null);
    setQuotedPrice("");
    setQuotedPriceNote("");
    setCargoImages([]);
    setPickupNotifyState(notifyDefaultEnabled);
    setDropoffNotifyState(notifyDefaultEnabled);
    // selectedCompanyName은 submit 후에도 유지 (같은 업체로 연속 접수 편의성)
    setSelectedCompanyContactName("");
    setSelectedCompanyContactPhone("");
    originalAddressDistanceKeyRef.current = null;
    originalDistanceKmRef.current = null;
    originalQuotedPriceRef.current = null;
    lastDistanceRequestKeyRef.current = null;
    lastDistanceResolvedKeyRef.current = null;
  };

  useEffect(() => {
    if (previousModeRef.current === "edit" && !isEditMode) {
      resetRequestForm();
      setMessage(null);
      setError(null);
    }
    previousModeRef.current = mode;
  }, [isEditMode, mode]);

  const applyNotifyDefaultToCurrentRequest = (nextDefault: boolean) => {
    setNotifyDefaultEnabled(nextDefault);
    if (!nextDefault) {
      setPickupNotifyState(false);
      setDropoffNotifyState(false);
      return;
    }

    // 기본 발송을 다시 켜는 동작은 "이후 기본값"을 명시적으로 ON으로 바꾸는 행동이라
    // 현재 요청도 둘 다 ON으로 복원해 주는 쪽이 UX가 가장 예측 가능하다.
    setPickupNotifyState(true);
    setDropoffNotifyState(true);
  };

  const toScheduleDraft = (value?: string | null): ScheduleDraft => {
    if (!value) {
      return { month: "", day: "", hour: "", minute: "" };
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      return { month: "", day: "", hour: "", minute: "" };
    }
    return {
      month: String(d.getMonth() + 1).padStart(2, "0"),
      day: String(d.getDate()).padStart(2, "0"),
      hour: String(d.getHours()).padStart(2, "0"),
      minute: String(d.getMinutes()).padStart(2, "0"),
    };
  };

  const buildScheduledDatetime = (draft: ScheduleDraft) => {
    const month = Number(draft.month);
    const day = Number(draft.day);
    const hour = Number(draft.hour);
    const minute = Number(draft.minute);

    if (
      !Number.isInteger(month) ||
      !Number.isInteger(day) ||
      !Number.isInteger(hour) ||
      !Number.isInteger(minute)
    ) {
      return null;
    }
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;

    const now = new Date();
    const year = now.getFullYear();
    const makeCandidate = (candidateYear: number) =>
      new Date(candidateYear, month - 1, day, hour, minute, 0, 0);
    const isSameParts = (dt: Date, candidateYear: number) =>
      dt.getFullYear() === candidateYear &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day &&
      dt.getHours() === hour &&
      dt.getMinutes() === minute;

    let dt = makeCandidate(year);
    if (!isSameParts(dt, year)) {
      return null;
    }

    // 연말/연초 보정: 현재 시점보다 과거가 되면 다음 해 같은 월/일/시/분으로 보정
    if (dt.getTime() < now.getTime()) {
      const nextYear = year + 1;
      const nextDt = makeCandidate(nextYear);
      if (isSameParts(nextDt, nextYear)) {
        dt = nextDt;
      }
    }

    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    const hh = String(dt.getHours()).padStart(2, "0");
    const mi = String(dt.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
  };

  const formatScheduleLabel = (
    isImmediate: boolean,
    datetime: string,
    kind: "pickup" | "dropoff"
  ) => {
    if (isImmediate || !datetime) return kind === "pickup" ? "바로 상차" : "바로 하차";
    const d = new Date(datetime);
    if (Number.isNaN(d.getTime())) return datetime;
    return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(
      2,
      "0"
    )} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const openScheduleModal = (target: "pickup" | "dropoff") => {
    setScheduleModalTarget(target);
    const currentValue = target === "pickup" ? pickupDatetime : dropoffDatetime;
    setScheduleDraft(toScheduleDraft(currentValue));
  };

  const applyScheduledDatetime = (overrideDraft?: ScheduleDraft) => {
    if (!scheduleModalTarget) return;
    const draft = overrideDraft ?? scheduleDraft;
    const nextDatetime = buildScheduledDatetime(draft);
    if (!nextDatetime) {
      alert("월/일/시간을 올바르게 입력해주세요.");
      return;
    }
    if (scheduleModalTarget === "pickup") {
      setPickupIsImmediate(false);
      setPickupDatetime(nextDatetime);
    } else {
      setDropoffIsImmediate(false);
      setDropoffDatetime(nextDatetime);
    }
    setScheduleModalTarget(null);
  };

  const applyImmediateSchedule = () => {
    if (!scheduleModalTarget) return;
    if (scheduleModalTarget === "pickup") {
      setPickupIsImmediate(true);
      setPickupDatetime("");
    } else {
      setDropoffIsImmediate(true);
      setDropoffDatetime("");
    }
    setScheduleModalTarget(null);
  };

  // ✅ 카카오 주소 검색
  const handleSearchAddress = (target: "pickup" | "dropoff") => {
    if (!(window as any).daum || !(window as any).daum.Postcode) {
      alert("주소 검색 스크립트가 아직 로드되지 않았습니다.");
      return;
    }

    new (window as any).daum.Postcode({
      oncomplete: (data: any) => {
        const fullAddress = formatSelectedAddress(data);

        if (target === "pickup") {
          clearPickupAddressBookReference();
          setPickupAddress(fullAddress);
        } else {
          clearDropoffAddressBookReference();
          setDropoffAddress(fullAddress);
        }
      },
    }).open();
  };

  // 🔹 최근 배차내역 불러오기
  const fetchRecentRequests = async () => {
    try {
      setRecentLoading(true);
      setRecentError(null);
      const data = await listRecentRequests(5); // 최근 5건
      setRecentRequests(data);
    } catch (err: any) {
      console.error(err);
      setRecentError(
        err?.message ||
          "최근 배차 내역을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      setRecentRequests([]);
      setRecentError(null);
      setRecentLoading(false);
      return;
    }
    void fetchRecentRequests();
  }, [isAuthenticated]);

  // 🔹 출발지+도착지 주소 모두 입력되면 자동으로 거리계산 (debounce 600ms)
  useEffect(() => {
    if (!distanceRequestKey) {
      lastDistanceRequestKeyRef.current = null;
      lastDistanceResolvedKeyRef.current = null;
      setDistanceKm(null);
      setQuotedPrice("");
      setQuotedPriceNote("");
      setCalculating(false);
      return;
    }

    if (!canRequestDistance) {
      setDistanceKm(null);
      setQuotedPrice("");
      setQuotedPriceNote("");
      return;
    }

    // 수정 모드에서는 저장된 출도착지 주소쌍이 유지되는 동안 기존 거리/요금을 그대로 사용한다.
    // 상세주소 변경만으로는 카카오 거리 계산 기준이 바뀌지 않으므로 주소 필드 자체가 달라졌을 때만 재계산한다.
    if (isOriginalAddressPair) {
      lastDistanceRequestKeyRef.current = distanceRequestKey;
      lastDistanceResolvedKeyRef.current = distanceRequestKey;
      setCalculating(false);
      setDistanceKm(originalDistanceKmRef.current);
      setQuotedPrice(originalQuotedPriceRef.current ?? "");
      setQuotedPriceNote("");
      return;
    }

    if (lastDistanceResolvedKeyRef.current === distanceRequestKey) {
      return;
    }

    const timer = setTimeout(() => {
      void requestDistance({ silent: true });
    }, 700);

    return () => clearTimeout(timer);
  }, [distanceRequestKey, canRequestDistance, isAuthenticated, isOriginalAddressPair]);

  // 🔹 거리/요금 계산 (수동 트리거용 - 요금약관확인하기와 분리)
  const handleCalculateDistance = async () => {
    setError(null);
    setMessage(null);
    await requestDistance({ force: true });
  };

  const applyDetailToForm = (
    detail: RequestDetail,
    options?: {
      preserveOriginalSnapshot?: boolean;
    }
  ) => {
    const preserveOriginalSnapshot = options?.preserveOriginalSnapshot ?? false;

    // 출발지
    setPickupPlaceName(detail.pickupPlaceName);
    setPickupAddress(detail.pickupAddress);
    setPickupAddressDetail(detail.pickupAddressDetail ?? "");
    setPickupContactName(detail.pickupContactName ?? "");
    setPickupContactPhone(formatPhoneNumber(detail.pickupContactPhone ?? ""));
    setPickupAddressBookId(detail.pickupAddressBookId ?? null);
    setPickupMethod(detail.pickupMethod as Method);
    setPickupIsImmediate(detail.pickupIsImmediate);
    setPickupDatetime(detail.pickupDatetime ?? "");

    // 도착지
    setDropoffPlaceName(detail.dropoffPlaceName);
    setDropoffAddress(detail.dropoffAddress);
    setDropoffAddressDetail(detail.dropoffAddressDetail ?? "");
    setDropoffContactName(detail.dropoffContactName ?? "");
    setDropoffContactPhone(formatPhoneNumber(detail.dropoffContactPhone ?? ""));
    setDropoffAddressBookId(detail.dropoffAddressBookId ?? null);
    setDropoffMethod(detail.dropoffMethod as Method);
    setDropoffIsImmediate(detail.dropoffIsImmediate);
    setDropoffDatetime(detail.dropoffDatetime ?? "");

    // 차량
    skipVehicleResetRef.current = true;
    if (detail.vehicleGroup) {
      setVehicleGroup(detail.vehicleGroup as VehicleGroup);
    } else {
      setVehicleGroup("ONE_TON_PLUS");
    }
    setVehicleTonnage(
      detail.vehicleTonnage != null ? detail.vehicleTonnage : VEHICLE_INFO.ONE_TON_PLUS.defaultTon
    );
    setVehicleBodyType(
      normalizeVehicleBodyType(
        (detail.vehicleGroup as VehicleGroupValue) ?? "ONE_TON_PLUS",
        detail.vehicleTonnage ?? null,
        detail.vehicleBodyType ?? VEHICLE_INFO.ONE_TON_PLUS.defaultType
      )
    );

    // 화물 / 옵션
    setCargoDescription(detail.cargoDescription ?? "");
    setRequestType((detail.requestType as RequestType) ?? "");
    setDriverNote(detail.driverNote ?? "");
    setSelectedCompanyName(detail.ownerCompany?.name ?? detail.targetCompanyName ?? "");
    setSelectedCompanyContactName(detail.targetCompanyContactName ?? "");
    setSelectedCompanyContactPhone(formatPhoneNumber(detail.targetCompanyContactPhone ?? ""));

    // 결제 / 거리 / 요금
    if (detail.paymentMethod) {
      const reversePaymentMap: Record<string, "CREDIT" | "CARD" | "PREPAID" | "COLLECT"> = {
        CASH_PREPAID: "PREPAID",
        CASH_COLLECT: "COLLECT",
        CARD: "CARD",
        CREDIT: "CREDIT",
      };
      setPaymentUi(reversePaymentMap[detail.paymentMethod] ?? "");
    } else {
      setPaymentUi("");
    }
    setDistanceKm(detail.distanceKm != null ? detail.distanceKm : null);
    setQuotedPrice(detail.quotedPrice != null ? detail.quotedPrice : "");
    setQuotedPriceNote("");
    setPickupNotifyState(
      typeof detail.pickupNotify === "boolean" ? detail.pickupNotify : notifyDefaultEnabled
    );
    setDropoffNotifyState(
      typeof detail.dropoffNotify === "boolean" ? detail.dropoffNotify : notifyDefaultEnabled
    );

    if (preserveOriginalSnapshot) {
      const originalKey = buildDistanceAddressKey(detail.pickupAddress, detail.dropoffAddress);
      originalAddressDistanceKeyRef.current = originalKey || null;
      originalDistanceKmRef.current = detail.distanceKm != null ? detail.distanceKm : null;
      originalQuotedPriceRef.current = detail.quotedPrice != null ? detail.quotedPrice : null;
      lastDistanceRequestKeyRef.current = originalKey || null;
      lastDistanceResolvedKeyRef.current = originalKey || null;
    } else {
      originalAddressDistanceKeyRef.current = null;
      originalDistanceKmRef.current = null;
      originalQuotedPriceRef.current = null;
      lastDistanceRequestKeyRef.current = null;
      lastDistanceResolvedKeyRef.current = null;
    }
  };

  // 🔹 최근 배차내역 선택해서 폼에 적용 (신규 접수용 복사)
  const handleApplyFromRecent = async (id: number) => {
    try {
      setApplyingId(id);
      setError(null);

      const detail: RequestDetail = await getRequestDetail(id);
      applyDetailToForm(detail, { preserveOriginalSnapshot: false });
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "최근 배차 기록을 폼에 적용하는 중 오류가 발생했습니다."
      );
    } finally {
      setApplyingId(null);
    }
  };

  useEffect(() => {
    if (!isEditMode || editRequestId == null) return;
    let cancelled = false;

    const loadEditRequest = async () => {
      try {
        setApplyingId(editRequestId);
        setError(null);
        setMessage(null);
        const detail = await getRequestDetail(editRequestId);
        if (cancelled) return;
        applyDetailToForm(detail, { preserveOriginalSnapshot: true });
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        setError(err?.message || "수정할 배차 요청을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) {
          setApplyingId(null);
        }
      }
    };

    void loadEditRequest();

    return () => {
      cancelled = true;
    };
  }, [editRequestId, isEditMode]);

  useEffect(() => {
    if (!isCopyMode || copyRequestId == null) return;
    let cancelled = false;

    const loadCopyRequest = async () => {
      try {
        setApplyingId(copyRequestId);
        setError(null);
        setMessage(null);
        resetRequestForm();
        const detail = await getRequestDetail(copyRequestId);
        if (cancelled) return;

        // 복사는 원본 데이터를 폼 초기값으로만 사용한다.
        // 원본 request id/status/assignment/external order/image 같은 운영 상태는 폼 상태에 싣지 않고,
        // submit도 createRequest 경로만 타게 유지한다.
        applyDetailToForm(detail, { preserveOriginalSnapshot: false });
        setCargoImages([]);
      } catch (err: any) {
        if (cancelled) return;
        console.error(err);
        setError(err?.message || "복사할 배차 요청을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (!cancelled) {
          setApplyingId(null);
        }
      }
    };

    void loadCopyRequest();

    return () => {
      cancelled = true;
    };
  }, [copyRequestId, isCopyMode]);

  // 🔹 폼 제출(배차 요청 생성)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitInProgressRef.current) return;
    setError(null);
    setMessage(null);

    // ADMIN/DISPATCHER/SALES는 업체 선택 필수
    if (needsCompanySelect && !selectedCompanyName.trim()) {
      setError("업체를 선택해야 배차접수가 가능합니다.");
      return;
    }

    if (!pickupPlaceName || !pickupAddress) {
      setError("출발지 상호/주소는 필수입니다.");
      return;
    }
    if (!dropoffPlaceName || !dropoffAddress) {
      setError("도착지 상호/주소는 필수입니다.");
      return;
    }
    if (!pickupMethod) {
      setError("상차방법을 선택해주세요.");
      return;
    }
    if (!dropoffMethod) {
      setError("하차방법을 선택해주세요.");
      return;
    }
    if (vehicleGroup === "ONE_TON_PLUS" && vehicleTonnage === "") {
      setError("차량 톤수를 선택해주세요.");
      return;
    }
    if (!vehicleBodyType) {
      setError("차량종류를 선택해주세요.");
      return;
    }
    if (
      vehicleGroup === "ONE_TON_PLUS" &&
      !isVehicleBodyTypeAllowed(vehicleGroup, vehicleTonnage, vehicleBodyType)
    ) {
      setError("선택한 톤수에서 사용할 수 없는 차량종류입니다.");
      return;
    }

    // UI 결제 옵션은 백엔드 PaymentMethod로 매핑
    const mappedPayment: PaymentMethod | undefined =
      paymentUi === "PREPAID"
        ? "CASH_PREPAID"
        : paymentUi === "COLLECT"
        ? "CASH_COLLECT"
        : paymentUi === "CREDIT"
        ? "CREDIT"
        : paymentUi === "CARD"
        ? "CARD"
        : undefined;

    const body: CreateRequestBody = {
      pickup: {
        placeName: pickupPlaceName,
        address: pickupAddress,
        addressDetail: pickupAddressDetail || null,
        contactName: pickupContactName || null,
        contactPhone: pickupContactPhone || null,
        method: pickupMethod as Method,
        isImmediate: pickupIsImmediate,
        datetime: pickupDatetime || null,
      },
      dropoff: {
        placeName: dropoffPlaceName,
        address: dropoffAddress,
        addressDetail: dropoffAddressDetail || null,
        contactName: dropoffContactName || null,
        contactPhone: dropoffContactPhone || null,
        method: dropoffMethod as Method,
        isImmediate: dropoffIsImmediate,
        datetime: dropoffDatetime || null,
      },
      vehicle: {
        ...(vehicleGroup ? { group: vehicleGroup as VehicleGroup } : {}),
        tonnage:
          vehicleTonnage === "" ? null : Number(vehicleTonnage),
        bodyType: vehicleBodyType
          ? normalizeVehicleBodyType(
              vehicleGroup,
              vehicleTonnage === "" ? null : Number(vehicleTonnage),
              vehicleBodyType
            )
          : null,
      },
      cargo: {
        description: cargoDescription || null,
      },
      options: {
        ...(requestType ? { requestType: requestType as RequestType } : {}),
        driverNote: driverNote || null,
      },
      payment: {
        method: mappedPayment ?? undefined,
        distanceKm:
          distanceKm == null ? null : Number(distanceKm.toFixed(1)),
        quotedPrice:
          quotedPrice === "" ? null : Number(quotedPrice),
      },
      pickupAddressBookId,
      dropoffAddressBookId,
      targetCompanyName: needsCompanySelect ? (selectedCompanyName || null) : null,
      targetCompanyContactName:
        needsCompanySelect && selectedCompanyName.trim()
          ? (selectedCompanyContactName.trim() || null)
          : null,
      targetCompanyContactPhone:
        needsCompanySelect && selectedCompanyName.trim()
          ? (selectedCompanyContactPhone.trim() || null)
          : null,
      pickupNotify,
      dropoffNotify,
    };

    submitInProgressRef.current = true;
    setSubmitting(true);
    try {
      const saved = isEditMode && editRequestId != null
        ? await updateRequest(editRequestId, body)
        : await createRequest(body);
      const isClientUser = userRole === "CLIENT";
      let finalMessage = isEditMode
        ? isClientUser
          ? "배차 요청이 수정되었습니다."
          : `배차 요청이 수정되었습니다. (ID: ${saved.id})`
        : isClientUser
          ? "배차 요청이 생성되었습니다."
          : `배차 요청이 생성되었습니다. (ID: ${saved.id})`;

      if (autoRegisterEnabled && isAuthenticated) {
        try {
          const [pickupCandidates, dropoffCandidates] = await Promise.all([
            listAddressBook(
              pickupPlaceName,
              addressBookBusinessName || undefined,
              1,
              100
            ),
            listAddressBook(
              dropoffPlaceName,
              addressBookBusinessName || undefined,
              1,
              100
            ),
          ]);

          const normalizeDupKey = (value: string) =>
            value.trim().replace(/\s+/g, " ").toLowerCase();
          const buildDupKey = (
            businessName: string,
            placeName: string,
            address: string
          ) =>
            [
              normalizeDupKey(businessName),
              normalizeDupKey(placeName),
              normalizeDupKey(address),
            ].join("||");
          const entryBusinessName = (entry: AddressBookEntry) =>
            entry.businessName?.trim() || entry.companyName?.trim() || "";
          const pickupKey = buildDupKey(
            addressBookBusinessName,
            pickupPlaceName,
            pickupAddress
          );
          const dropoffKey = buildDupKey(
            addressBookBusinessName,
            dropoffPlaceName,
            dropoffAddress
          );
          const hasPickupEntry = pickupCandidates.items.some(
            (entry) =>
              buildDupKey(
                entryBusinessName(entry),
                entry.placeName,
                entry.address
              ) === pickupKey
          );
          const hasDropoffEntry = dropoffCandidates.items.some(
            (entry) =>
              buildDupKey(
                entryBusinessName(entry),
                entry.placeName,
                entry.address
              ) === dropoffKey
          );

          const autoRegisterTasks: Promise<unknown>[] = [];

          if (!hasPickupEntry) {
            autoRegisterTasks.push(
              createAddressBookEntry({
                businessName: addressBookBusinessName || undefined,
                placeName: pickupPlaceName,
                address: pickupAddress,
                addressDetail: pickupAddressDetail || undefined,
                contactName: pickupContactName || undefined,
                contactPhone: pickupContactPhone || undefined,
                type: "PICKUP",
              })
            );
          }

          if (!hasDropoffEntry) {
            autoRegisterTasks.push(
              createAddressBookEntry({
                businessName: addressBookBusinessName || undefined,
                placeName: dropoffPlaceName,
                address: dropoffAddress,
                addressDetail: dropoffAddressDetail || undefined,
                contactName: dropoffContactName || undefined,
                contactPhone: dropoffContactPhone || undefined,
                type: "DROPOFF",
              })
            );
          }

          if (autoRegisterTasks.length > 0) {
            await Promise.all(autoRegisterTasks);
            finalMessage += " / 주소록 자동등록 완료";
            window.dispatchEvent(new CustomEvent("addressbook:refresh"));
          }
        } catch (addressErr) {
          console.error(addressErr);
          finalMessage += " / 주소록 자동등록 실패";
        }
      }

      if (cargoImages.length > 0) {
        try {
          await uploadRequestImages(saved.id, cargoImages);
          finalMessage += ` / 이미지 ${cargoImages.length}장 업로드 완료`;
          setCargoImages([]);
        } catch (imgErr: any) {
          console.error(imgErr);
          finalMessage += ` / 이미지 업로드 실패`;
          setError(
            imgErr?.message ||
              "배차 요청은 생성되었지만 이미지 업로드 중 오류가 발생했습니다."
          );
        }
      }

      setMessage(finalMessage);
      if (isEditMode) {
        originalAddressDistanceKeyRef.current = buildDistanceAddressKey(
          pickupAddress,
          dropoffAddress
        ) || null;
        originalDistanceKmRef.current = distanceKm == null ? null : Number(distanceKm.toFixed(1));
        originalQuotedPriceRef.current =
          quotedPrice === "" ? null : Number(quotedPrice);
        lastDistanceRequestKeyRef.current = originalAddressDistanceKeyRef.current;
        lastDistanceResolvedKeyRef.current = originalAddressDistanceKeyRef.current;
        setSubmitFlash(true);
        window.setTimeout(() => setSubmitFlash(false), 380);
        onRequestUpdated?.();
      } else {
        resetRequestForm();
        setSubmitFlash(true);
        window.setTimeout(() => setSubmitFlash(false), 380);
        if (isAuthenticated) {
          void fetchRecentRequests();
        }
        onRequestCreated?.();
      }
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || (isEditMode ? "배차 요청 수정 중 오류가 발생했습니다." : "배차 요청 생성 중 오류가 발생했습니다.")
      );
    } finally {
      setSubmitting(false);
      submitInProgressRef.current = false;
    }
  };

  const handleSelectCargoImages = async (files: FileList | null) => {
    if (!files) return;
    const remainingSlots = 5 - cargoImages.length;
    if (remainingSlots <= 0) {
      alert("이미지는 최대 5장까지 선택할 수 있습니다.");
      return;
    }

    const next = [...cargoImages];
    const failedNames: string[] = [];
    for (const file of Array.from(files).slice(0, remainingSlots)) {
      try {
        const normalizedFile = await normalizeCargoImageFile(file);
        if (normalizedFile.size > CARGO_IMAGE_MAX_BYTES) {
          failedNames.push(file.name);
          continue;
        }
        next.push(normalizedFile);
      } catch {
        failedNames.push(file.name);
      }
    }

    if (next.length === cargoImages.length) {
      alert("이미지 파일을 읽을 수 없습니다. 파일을 다시 저장한 뒤 선택해 주세요.");
      return;
    }

    if (files.length + cargoImages.length > 5) {
      alert("이미지는 최대 5장까지 선택할 수 있습니다.");
    }

    if (failedNames.length > 0) {
      alert(
        `${failedNames.join(", ")} 파일은 이미지로 처리할 수 없거나 5MB를 초과했습니다.`
      );
    }

    setCargoImages(next);
  };

  const handleRemoveCargoImage = (index: number) => {
    setCargoImages((prev) => prev.filter((_, i) => i !== index));
  };

  // 현재 그룹의 차량 정보 (derived)
  const currentVehicleInfo = vehicleGroup ? (VEHICLE_INFO[vehicleGroup] ?? null) : null;
  const vehicleTonOptions = currentVehicleInfo?.tonOptions ?? [];
  const vehicleTypeOptions = getAllowedVehicleBodyTypes(
    vehicleGroup,
    vehicleTonnage === "" ? null : vehicleTonnage
  );

  // 차량 그룹 변경 시 톤수/차종 자동 리셋
  useEffect(() => {
    if (!vehicleGroup) return;
    if (skipVehicleResetRef.current) {
      skipVehicleResetRef.current = false;
      return;
    }
    const info = VEHICLE_INFO[vehicleGroup];
    if (!info) return;
    setVehicleTonnage(info.defaultTon);
    setVehicleBodyType(getDefaultVehicleBodyType(vehicleGroup, info.defaultTon));
  // vehicleGroup이 바뀔 때만 실행
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleGroup]);

  useEffect(() => {
    if (!vehicleGroup) return;
    const normalized = normalizeVehicleBodyType(
      vehicleGroup,
      vehicleTonnage === "" ? null : vehicleTonnage,
      vehicleBodyType
    );
    if (normalized !== vehicleBodyType) {
      setVehicleBodyType(normalized);
    }
  }, [vehicleBodyType, vehicleGroup, vehicleTonnage]);

  useEffect(() => {
    const shouldForceManual = vehicleGroup === "MOTORCYCLE" || vehicleGroup === "DAMAS";
    const wasForceManual =
      previousVehicleGroupRef.current === "MOTORCYCLE" || previousVehicleGroupRef.current === "DAMAS";

    if (shouldForceManual) {
      if (!wasForceManual && (pickupMethod !== "MANUAL" || dropoffMethod !== "MANUAL")) {
        savedNonManualMethodsRef.current = { pickupMethod, dropoffMethod };
      }
      setPickupMethod("MANUAL");
      setDropoffMethod("MANUAL");
      previousVehicleGroupRef.current = vehicleGroup;
      return;
    }

    if (wasForceManual) {
      const saved = savedNonManualMethodsRef.current;
      if (saved) {
        setPickupMethod(saved.pickupMethod);
        setDropoffMethod(saved.dropoffMethod);
        savedNonManualMethodsRef.current = null;
      }
    }
    previousVehicleGroupRef.current = vehicleGroup;
  }, [vehicleGroup]);

  // 차량재원 텍스트 — vehicleGroup + vehicleTonnage 기준으로 VEHICLE_SPEC에서 동적 조회
  const vehicleInfoText = VEHICLE_SPEC[vehicleKeyFromStored(vehicleGroup, vehicleTonnage === "" ? null : vehicleTonnage)].specText;

  const handleSwap = () => {
    setPickupPlaceName(dropoffPlaceName);
    setPickupAddress(dropoffAddress);
    setPickupAddressDetail(dropoffAddressDetail);
    setPickupContactName(dropoffContactName);
    setPickupContactPhone(formatPhoneNumber(dropoffContactPhone));
    setPickupAddressBookId(null);
    setPickupMethod(dropoffMethod);
    setPickupIsImmediate(dropoffIsImmediate);
    setPickupDatetime(dropoffDatetime);

    setDropoffPlaceName(pickupPlaceName);
    setDropoffAddress(pickupAddress);
    setDropoffAddressDetail(pickupAddressDetail);
    setDropoffContactName(pickupContactName);
    setDropoffContactPhone(formatPhoneNumber(pickupContactPhone));
    setDropoffAddressBookId(null);
    setDropoffMethod(pickupMethod);
    setDropoffIsImmediate(pickupIsImmediate);
    setDropoffDatetime(pickupDatetime);
  };

  const handleAddressBookSelect = (
    entry: AddressBookEntry,
    selectedTarget?: "pickup" | "dropoff"
  ) => {
    const target = selectedTarget ?? addressBookModalTarget;
    if (target === "pickup") {
      setPickupPlaceName(entry.placeName);
      setPickupAddress(entry.address);
      setPickupAddressDetail(entry.addressDetail ?? "");
      setPickupContactName(entry.contactName ?? "");
      setPickupContactPhone(formatPhoneNumber(entry.contactPhone ?? ""));
      setPickupAddressBookId(entry.id);
    } else if (target === "dropoff") {
      setDropoffPlaceName(entry.placeName);
      setDropoffAddress(entry.address);
      setDropoffAddressDetail(entry.addressDetail ?? "");
      setDropoffContactName(entry.contactName ?? "");
      setDropoffContactPhone(formatPhoneNumber(entry.contactPhone ?? ""));
      setDropoffAddressBookId(entry.id);
    }
    setAddressBookModalTarget(null);
  };

  return {
    // Address book modal
    addressBookModalTarget,
    setAddressBookModalTarget,
    // Recent requests
    recentRequests,
    recentLoading,
    recentError,
    applyingId,
    // Pickup
    pickupPlaceName,
    setPickupPlaceName: handlePickupPlaceNameChange,
    pickupAddress,
    pickupAddressDetail,
    setPickupAddressDetail: handlePickupAddressDetailChange,
    pickupContactName,
    setPickupContactName: handlePickupContactNameChange,
    pickupContactPhone,
    setPickupContactPhone: handlePickupContactPhoneChange,
    pickupAddressBookId,
    pickupMethod,
    setPickupMethod,
    pickupIsImmediate,
    pickupDatetime,
    // Dropoff
    dropoffPlaceName,
    setDropoffPlaceName: handleDropoffPlaceNameChange,
    dropoffAddress,
    dropoffAddressDetail,
    setDropoffAddressDetail: handleDropoffAddressDetailChange,
    dropoffContactName,
    setDropoffContactName: handleDropoffContactNameChange,
    dropoffContactPhone,
    setDropoffContactPhone: handleDropoffContactPhoneChange,
    dropoffAddressBookId,
    dropoffMethod,
    setDropoffMethod,
    dropoffIsImmediate,
    dropoffDatetime,
    // Vehicle
    vehicleGroup,
    setVehicleGroup,
    vehicleTonnage,
    setVehicleTonnage,
    vehicleBodyType,
    setVehicleBodyType,
    vehicleTonOptions,
    vehicleTypeOptions,
    vehicleInfoText,
    currentVehicleInfo,
    // Cargo / options
    cargoDescription,
    setCargoDescription,
    requestType,
    setRequestType,
    driverNote,
    setDriverNote,
    // Payment / distance
    paymentUi,
    setPaymentUi,
    distanceKm,
    quotedPrice,
    quotedPriceNote,
    // Status flags
    calculating,
    submitting,
    message,
    error,
    cargoImageModalOpen,
    setCargoImageModalOpen,
    cargoImages,
    submitFlash,
    // Schedule modal
    scheduleModalTarget,
    setScheduleModalTarget,
    scheduleDraft,
    setScheduleDraft,
    // Company selector + notify toggles
    needsCompanySelect,
    selectedCompanyName,
    setSelectedCompanyName,
    selectedCompanyContactName,
    setSelectedCompanyContactName,
    selectedCompanyContactPhone,
    setSelectedCompanyContactPhone,
    notifyDefaultEnabled,
    applyNotifyDefaultToCurrentRequest,
    pickupNotify,
    setPickupNotify,
    dropoffNotify,
    setDropoffNotify,
    // Pure functions
    formatScheduleLabel,

    // Handlers
    handleOpenAddressBook,
    handleSearchAddress,
    openScheduleModal,
    applyScheduledDatetime,
    applyImmediateSchedule,
    handleCalculateDistance,
    handleApplyFromRecent,
    handleSubmit,
    handleSelectCargoImages,
    handleRemoveCargoImage,
    handleSwap,
    handleAddressBookSelect,
  };
}
