// src/hooks/useRequestForm.ts
import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  createRequest,
  getDistanceByAddress,
  listRecentRequests,
  getRequestDetail,
  uploadRequestImages,
} from "../api/client";
import type {
  CreateRequestBody,
  DistanceResponse,
  AddressBookEntry,
  RequestSummary,
  RequestDetail,
} from "../api/types";

export type Method =
  | "MANUAL"
  | "FORKLIFT"
  | "SUDOU_SUHAEJUNG"
  | "HOIST"
  | "CRANE"
  | "CONVEYOR";
export type MethodValue = Method | "";

export type VehicleGroup =
  | "MOTORCYCLE"
  | "DAMAS"
  | "LABO"
  | "ONE_TON_PLUS"
  | "FIVE_TON"
  | "ELEVEN_TON";
export type VehicleGroupValue = VehicleGroup | "";

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
  replayRequestId?: number | null;
  onReplayRequestHandled?: () => void;
  onRequestCreated?: () => void;
};

export function useRequestForm({
  isAuthenticated = false,
  replayRequestId = null,
  onReplayRequestHandled,
  onRequestCreated,
}: UseRequestFormParams) {
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
  const [pickupMethod, setPickupMethod] = useState<MethodValue>("");
  const [pickupIsImmediate, setPickupIsImmediate] = useState(true);
  const [pickupDatetime, setPickupDatetime] = useState<string>("");

  // 도착지
  const [dropoffPlaceName, setDropoffPlaceName] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  const [dropoffAddressDetail, setDropoffAddressDetail] = useState("");
  const [dropoffContactName, setDropoffContactName] = useState("");
  const [dropoffContactPhone, setDropoffContactPhone] = useState("");
  const [dropoffMethod, setDropoffMethod] = useState<MethodValue>("");
  const [dropoffIsImmediate, setDropoffIsImmediate] = useState(true);
  const [dropoffDatetime, setDropoffDatetime] = useState<string>("");

  // 차량
  const [vehicleGroup, setVehicleGroup] = useState<VehicleGroupValue>("");
  const [vehicleTonnage, setVehicleTonnage] = useState<number | "">("");
  const [vehicleBodyType, setVehicleBodyType] = useState<string>("");

  // 화물 / 옵션
  const [cargoDescription, setCargoDescription] = useState("");
  const [requestType, setRequestType] = useState<RequestTypeValue>("");
  const [driverNote, setDriverNote] = useState("");

  // 결제 / 거리 / 요금
  const [paymentUi, setPaymentUi] = useState<PaymentUiValue>("");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [quotedPrice, setQuotedPrice] = useState<number | "">("");

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

  // ✅ 주소록 버튼 클릭 → 모달 열기
  const handleOpenAddressBook = (target: "pickup" | "dropoff") => {
    setAddressBookModalTarget(target);
  };

  const resetRequestForm = () => {
    setPickupPlaceName("");
    setPickupAddress("");
    setPickupAddressDetail("");
    setPickupContactName("");
    setPickupContactPhone("");
    setPickupMethod("");
    setPickupIsImmediate(true);
    setPickupDatetime("");

    setDropoffPlaceName("");
    setDropoffAddress("");
    setDropoffAddressDetail("");
    setDropoffContactName("");
    setDropoffContactPhone("");
    setDropoffMethod("");
    setDropoffIsImmediate(true);
    setDropoffDatetime("");

    setVehicleGroup("");
    setVehicleTonnage("");
    setVehicleBodyType("");

    setCargoDescription("");
    setRequestType("");
    setDriverNote("");

    setPaymentUi("");
    setDistanceKm(null);
    setQuotedPrice("");
    setCargoImages([]);
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

  const applyScheduledDatetime = () => {
    if (!scheduleModalTarget) return;
    const nextDatetime = buildScheduledDatetime(scheduleDraft);
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
        const fullAddress = data.roadAddress || data.address; // 도로명 우선

        if (target === "pickup") {
          setPickupAddress(fullAddress);
        } else {
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
      const data = await listRecentRequests(4); // 최근 4건
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

  // 🔹 거리/요금 계산 (표시용)
  const handleCalculateDistance = async () => {
    if (!pickupAddress || !dropoffAddress) {
      setError("출발지/도착지 주소를 먼저 입력해 주세요.");
      return;
    }

    setError(null);
    setMessage(null);
    setCalculating(true);

    try {
      const res: DistanceResponse = await getDistanceByAddress(
        pickupAddress,
        dropoffAddress
      );

      if (!res || res.distanceKm == null) {
        throw new Error("거리 계산 결과가 없습니다.");
      }

      setDistanceKm(res.distanceKm);

      // 임의 요금 로직: km * 3200, 1,000원 단위로 내림, 최소 30,000원
      const raw = res.distanceKm * 3200;
      const basePrice = Math.max(30000, Math.floor(raw / 1000) * 1000);
      setQuotedPrice(basePrice);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "거리/요금 계산 중 오류가 발생했습니다.");
    } finally {
      setCalculating(false);
    }
  };

  // 🔹 최근 배차내역 선택해서 폼에 적용
  const handleApplyFromRecent = async (id: number) => {
    try {
      setApplyingId(id);
      setError(null);

      const detail: RequestDetail = await getRequestDetail(id);

      // 출발지
      setPickupPlaceName(detail.pickupPlaceName);
      setPickupAddress(detail.pickupAddress);
      setPickupAddressDetail(detail.pickupAddressDetail ?? "");
      setPickupContactName(detail.pickupContactName ?? "");
      setPickupContactPhone(detail.pickupContactPhone ?? "");
      setPickupMethod(detail.pickupMethod as Method);
      setPickupIsImmediate(detail.pickupIsImmediate);
      setPickupDatetime(detail.pickupDatetime ?? "");

      // 도착지
      setDropoffPlaceName(detail.dropoffPlaceName);
      setDropoffAddress(detail.dropoffAddress);
      setDropoffAddressDetail(detail.dropoffAddressDetail ?? "");
      setDropoffContactName(detail.dropoffContactName ?? "");
      setDropoffContactPhone(detail.dropoffContactPhone ?? "");
      setDropoffMethod(detail.dropoffMethod as Method);
      setDropoffIsImmediate(detail.dropoffIsImmediate);
      setDropoffDatetime(detail.dropoffDatetime ?? "");

      // 차량
      if (detail.vehicleGroup) {
        setVehicleGroup(detail.vehicleGroup as VehicleGroup);
      } else {
        setVehicleGroup("");
      }
      setVehicleTonnage(
        detail.vehicleTonnage != null ? detail.vehicleTonnage : ""
      );
      setVehicleBodyType(detail.vehicleBodyType ?? "");

      // 화물 / 옵션
      setCargoDescription(detail.cargoDescription ?? "");
      setRequestType((detail.requestType as RequestType) ?? "");
      setDriverNote(detail.driverNote ?? "");

      // 결제 / 거리 / 요금
      if (detail.paymentMethod) {
        // 역매핑: 서버 paymentMethod → UI 버튼 옵션
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
      setDistanceKm(
        detail.distanceKm != null ? detail.distanceKm : null
      );
      setQuotedPrice(
        detail.quotedPrice != null ? detail.quotedPrice : ""
      );
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
    if (replayRequestId == null) return;
    let cancelled = false;

    handleApplyFromRecent(replayRequestId).finally(() => {
      if (!cancelled) {
        onReplayRequestHandled?.();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [replayRequestId, onReplayRequestHandled]);

  // 🔹 폼 제출(배차 요청 생성)
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

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
        bodyType: vehicleBodyType || null,
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
    };

    setSubmitting(true);
    try {
      const created = await createRequest(body);
      let finalMessage = `배차 요청이 생성되었습니다. (ID: ${created.id})`;

      if (cargoImages.length > 0) {
        try {
          await uploadRequestImages(created.id, cargoImages);
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
      resetRequestForm();
      setSubmitFlash(true);
      window.setTimeout(() => setSubmitFlash(false), 380);
      if (isAuthenticated) {
        void fetchRecentRequests();
      }
      onRequestCreated?.();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "배차 요청 생성 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectCargoImages = (files: FileList | null) => {
    if (!files) return;
    const next = [...cargoImages];
    for (const file of Array.from(files)) {
      if (next.length >= 5) break;
      next.push(file);
    }
    if (next.length === cargoImages.length) {
      alert("이미지는 최대 5장까지 선택할 수 있습니다.");
      return;
    }
    if (files.length + cargoImages.length > 5) {
      alert("이미지는 최대 5장까지 선택할 수 있습니다.");
    }
    setCargoImages(next);
  };

  const handleRemoveCargoImage = (index: number) => {
    setCargoImages((prev) => prev.filter((_, i) => i !== index));
  };

  const vehicleLabel = (g: VehicleGroup) => {
    switch (g) {
      case "MOTORCYCLE":
        return "오토바이";
      case "DAMAS":
        return "다마스";
      case "LABO":
        return "라보";
      case "ONE_TON_PLUS":
        return "1톤 이상";
      case "FIVE_TON":
        return "5톤";
      case "ELEVEN_TON":
        return "11톤";
      default:
        return g;
    }
  };

  const vehicleBodyTypeOptions = [
    "탑차",
    "카고",
    "윙바디",
    "냉동/냉장",
    "리프트",
  ];

  const handleSwap = () => {
    setPickupPlaceName(dropoffPlaceName);
    setPickupAddress(dropoffAddress);
    setPickupAddressDetail(dropoffAddressDetail);
    setPickupContactName(dropoffContactName);
    setPickupContactPhone(dropoffContactPhone);
    setPickupMethod(dropoffMethod);
    setPickupIsImmediate(dropoffIsImmediate);
    setPickupDatetime(dropoffDatetime);

    setDropoffPlaceName(pickupPlaceName);
    setDropoffAddress(pickupAddress);
    setDropoffAddressDetail(pickupAddressDetail);
    setDropoffContactName(pickupContactName);
    setDropoffContactPhone(pickupContactPhone);
    setDropoffMethod(pickupMethod);
    setDropoffIsImmediate(pickupIsImmediate);
    setDropoffDatetime(pickupDatetime);
  };

  const handleAddressBookSelect = (entry: AddressBookEntry) => {
    if (addressBookModalTarget === "pickup") {
      setPickupPlaceName(entry.placeName);
      setPickupAddress(entry.address);
      setPickupAddressDetail(entry.addressDetail ?? "");
      setPickupContactName(entry.contactName ?? "");
      setPickupContactPhone(entry.contactPhone ?? "");
    } else if (addressBookModalTarget === "dropoff") {
      setDropoffPlaceName(entry.placeName);
      setDropoffAddress(entry.address);
      setDropoffAddressDetail(entry.addressDetail ?? "");
      setDropoffContactName(entry.contactName ?? "");
      setDropoffContactPhone(entry.contactPhone ?? "");
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
    setPickupPlaceName,
    pickupAddress,
    pickupAddressDetail,
    setPickupAddressDetail,
    pickupContactName,
    setPickupContactName,
    pickupContactPhone,
    setPickupContactPhone,
    pickupMethod,
    setPickupMethod,
    pickupIsImmediate,
    pickupDatetime,
    // Dropoff
    dropoffPlaceName,
    setDropoffPlaceName,
    dropoffAddress,
    dropoffAddressDetail,
    setDropoffAddressDetail,
    dropoffContactName,
    setDropoffContactName,
    dropoffContactPhone,
    setDropoffContactPhone,
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
    vehicleBodyTypeOptions,
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
    // Pure functions
    formatScheduleLabel,
    vehicleLabel,
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
