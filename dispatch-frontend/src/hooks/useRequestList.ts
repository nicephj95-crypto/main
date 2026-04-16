// src/hooks/useRequestList.ts
import { useEffect, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RequestSummary, RequestStatus, RequestDetail } from "../api/types";
import type { RequestImageAsset } from "../api/types";
import { useSearchParams } from "react-router-dom";
import { formatDate } from "../utils/date";
import { formatStatus } from "../utils/format";
import { getPaginationNumbers } from "../utils/pagination";
import {
  listRequests,
  getRequestDetail,
  exportRequestListExcel,
  updateRequestStatus,
  updateRequestOrderNumber,
  saveRequestAssignment,
  deleteRequestAssignment,
  listRequestImages,
  uploadRequestImages,
  deleteRequestImage,
} from "../api/client";
import {
  registerInsungOrder,
  registerCall24Order,
} from "../api/integrations";
import type { IntegrationRegisterResult } from "../api/integrations";
import type { AuthUser } from "../LoginPanel";

type ListResponse = Awaited<ReturnType<typeof listRequests>>;
type ListCacheEntry = {
  data: ListResponse;
  updatedAt: number;
};

export type AssignFormState = {
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleTonnage: string;
  vehicleType: string;
  actualFare: string;
  billingPrice: string;
  extraFare: string;
  extraFareReason: string;
  codRevenue: string;
  customerMemo: string;
  internalMemo: string;
};

export type AppSendResult = {
  target: "APP1" | "APP2";
  success: boolean;
  message: string;
  externalRequestId?: string;  // APP1=ordNo, APP2=serialNumber
  sentAt: string;
  payload?: Record<string, unknown>;
};

type RequestListStatusFilter = RequestStatus | "ALL";
type RequestListDateType = "RECEIVED_DATE" | "PICKUP_DATE";

function formatLocalYmd(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function buildDefaultDateRange() {
  const toDate = formatLocalYmd(new Date());
  const fromBase = new Date();
  fromBase.setDate(fromBase.getDate() - 7);
  const fromDate = formatLocalYmd(fromBase);
  return { fromDate, toDate };
}

function parseStatusFilter(value: string | null): RequestListStatusFilter {
  const allowed: RequestListStatusFilter[] = [
    "ALL",
    "PENDING",
    "DISPATCHING",
    "ASSIGNED",
    "IN_TRANSIT",
    "COMPLETED",
    "CANCELLED",
  ];
  return allowed.includes(value as RequestListStatusFilter)
    ? (value as RequestListStatusFilter)
    : "ALL";
}

function parseDateSearchType(value: string | null): RequestListDateType {
  return value === "PICKUP_DATE" ? "PICKUP_DATE" : "RECEIVED_DATE";
}

function parsePositiveInt(value: string | null, fallback: number, options?: { min?: number; max?: number }) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return fallback;
  if (options?.min != null && parsed < options.min) return fallback;
  if (options?.max != null && parsed > options.max) return fallback;
  return parsed;
}

function parseRequestListState(searchParams: URLSearchParams) {
  const defaults = buildDefaultDateRange();
  return {
    statusFilter: parseStatusFilter(searchParams.get("status")),
    dateSearchType: parseDateSearchType(searchParams.get("dateType")),
    fromDate: searchParams.get("from") || defaults.fromDate,
    toDate: searchParams.get("to") || defaults.toDate,
    pickupKeyword: searchParams.get("pickupKeyword") || "",
    dropoffKeyword: searchParams.get("dropoffKeyword") || "",
    page: parsePositiveInt(searchParams.get("page"), 1, { min: 1 }),
    pageSize: parsePositiveInt(searchParams.get("pageSize"), 10, { min: 1, max: 100 }),
  };
}

function buildRequestListSearchParams(state: {
  statusFilter: RequestListStatusFilter;
  dateSearchType: RequestListDateType;
  fromDate: string;
  toDate: string;
  pickupKeyword: string;
  dropoffKeyword: string;
  page: number;
  pageSize: number;
}) {
  const params = new URLSearchParams();
  params.set("status", state.statusFilter);
  params.set("dateType", state.dateSearchType);
  params.set("from", state.fromDate);
  params.set("to", state.toDate);
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  if (state.pickupKeyword.trim()) params.set("pickupKeyword", state.pickupKeyword.trim());
  if (state.dropoffKeyword.trim()) params.set("dropoffKeyword", state.dropoffKeyword.trim());
  return params;
}

function applyStateUpdate<T>(value: SetStateAction<T>, previous: T): T {
  return typeof value === "function" ? (value as (prev: T) => T)(previous) : value;
}

function buildListRequestKey(state: {
  statusFilter: RequestListStatusFilter;
  fromDate: string;
  toDate: string;
  page: number;
  pageSize: number;
  dateSearchType: RequestListDateType;
  pickupKeyword: string;
  dropoffKeyword: string;
}) {
  return JSON.stringify({
    statusArg: state.statusFilter === "ALL" ? "ALL" : state.statusFilter,
    fromDate: state.fromDate,
    toDate: state.toDate,
    page: state.page,
    pageSize: state.pageSize,
    dateSearchType: state.dateSearchType,
    pickupKeyword: state.pickupKeyword,
    dropoffKeyword: state.dropoffKeyword,
  });
}

function getCountsFromResponse(res: ListResponse) {
  const counts = res.statusCounts ?? {
    PENDING: 0,
    DISPATCHING: 0,
    ASSIGNED: 0,
    IN_TRANSIT: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  };

  return {
    counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
  };
}

const LIST_RESPONSE_FRESH_MS = 1500;
const listResponseCache = new Map<string, ListCacheEntry>();
const listInFlightCache = new Map<string, Promise<ListResponse>>();

export function useRequestList(
  currentUser?: AuthUser | null,
  onReplayToRequestForm?: (requestId: number) => void,
  externalReloadTrigger?: number
) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQueryState = parseRequestListState(searchParams);
  const initialListRequestKey = buildListRequestKey(initialQueryState);
  const initialCachedEntry = listResponseCache.get(initialListRequestKey);
  const initialCachedResponse = initialCachedEntry?.data;
  const initialCachedCounts = initialCachedResponse
    ? getCountsFromResponse(initialCachedResponse)
    : null;
  const USE_MOCK_APP_INTEGRATION = false;
  const role = currentUser?.role;
  const isStaff = role === "ADMIN" || role === "DISPATCHER" || role === "SALES";
  const isAdmin = role === "ADMIN";
  const isClient = role === "CLIENT";

  const [items, setItems] = useState<RequestSummary[]>(() => initialCachedResponse?.items ?? []);
  const [loading, setLoading] = useState(() => !initialCachedResponse);
  const [isFetching, setIsFetching] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(() => !!initialCachedResponse);
  const [error, setError] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<number, RequestDetail>>({});
  const [statusCounts, setStatusCounts] = useState<Record<RequestStatus, number>>({
    PENDING: initialCachedCounts?.counts.PENDING ?? 0,
    DISPATCHING: initialCachedCounts?.counts.DISPATCHING ?? 0,
    ASSIGNED: initialCachedCounts?.counts.ASSIGNED ?? 0,
    IN_TRANSIT: initialCachedCounts?.counts.IN_TRANSIT ?? 0,
    COMPLETED: initialCachedCounts?.counts.COMPLETED ?? 0,
    CANCELLED: initialCachedCounts?.counts.CANCELLED ?? 0,
  });
  const [statusTotal, setStatusTotal] = useState<number>(initialCachedCounts?.total ?? 0);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<number | null>(null);
  const [changingStatusKey, setChangingStatusKey] = useState<string | null>(null);
  const [savingOrderNumberId, setSavingOrderNumberId] = useState<number | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  const [statusFilterState, setStatusFilterState] = useState<RequestListStatusFilter>(
    initialQueryState.statusFilter
  );
  const [dateSearchTypeState, setDateSearchTypeState] = useState<RequestListDateType>(
    initialQueryState.dateSearchType
  );
  const [fromDateState, setFromDateState] = useState<string>(initialQueryState.fromDate);
  const [toDateState, setToDateState] = useState<string>(initialQueryState.toDate);
  const [pickupKeywordState, setPickupKeywordState] = useState<string>(initialQueryState.pickupKeyword);
  const [dropoffKeywordState, setDropoffKeywordState] = useState<string>(initialQueryState.dropoffKeyword);

  const [pageState, setPageState] = useState<number>(initialQueryState.page);
  const [pageSizeState, setPageSizeState] = useState<number>(initialQueryState.pageSize);
  const [total, setTotal] = useState<number>(initialCachedResponse?.total ?? 0);
  const [pageJumpInput, setPageJumpInput] = useState<string>(String(initialQueryState.page));

  const statusFilter = statusFilterState;
  const dateSearchType = dateSearchTypeState;
  const fromDate = fromDateState;
  const toDate = toDateState;
  const pickupKeyword = pickupKeywordState;
  const dropoffKeyword = dropoffKeywordState;
  const page = pageState;
  const pageSize = pageSizeState;

  const setStatusFilter: Dispatch<SetStateAction<RequestListStatusFilter>> = (value) => {
    setStatusFilterState((prev) => applyStateUpdate(value, prev));
  };
  const setDateSearchType: Dispatch<SetStateAction<RequestListDateType>> = (value) => {
    setDateSearchTypeState((prev) => applyStateUpdate(value, prev));
  };
  const setFromDate: Dispatch<SetStateAction<string>> = (value) => {
    setFromDateState((prev) => applyStateUpdate(value, prev));
  };
  const setToDate: Dispatch<SetStateAction<string>> = (value) => {
    setToDateState((prev) => applyStateUpdate(value, prev));
  };
  const setPickupKeyword: Dispatch<SetStateAction<string>> = (value) => {
    setPickupKeywordState((prev) => applyStateUpdate(value, prev));
  };
  const setDropoffKeyword: Dispatch<SetStateAction<string>> = (value) => {
    setDropoffKeywordState((prev) => applyStateUpdate(value, prev));
  };
  const setPage: Dispatch<SetStateAction<number>> = (value) => {
    setPageState((prev) => Math.max(1, applyStateUpdate(value, prev)));
  };
  const setPageSize: Dispatch<SetStateAction<number>> = (value) => {
    const next = Math.min(100, Math.max(1, applyStateUpdate(value, pageSizeState)));
    if (next === pageSizeState) return;
    setPageSizeState(next);
    setReloadSeq((prev) => prev + 1);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasSeenExternalReloadTriggerRef = useRef(false);

  useEffect(() => {
    const nextState = parseRequestListState(searchParams);
    setStatusFilterState((prev) => (prev === nextState.statusFilter ? prev : nextState.statusFilter));
    setDateSearchTypeState((prev) => (prev === nextState.dateSearchType ? prev : nextState.dateSearchType));
    setFromDateState((prev) => (prev === nextState.fromDate ? prev : nextState.fromDate));
    setToDateState((prev) => (prev === nextState.toDate ? prev : nextState.toDate));
    setPickupKeywordState((prev) => (prev === nextState.pickupKeyword ? prev : nextState.pickupKeyword));
    setDropoffKeywordState((prev) => (prev === nextState.dropoffKeyword ? prev : nextState.dropoffKeyword));
    setPageState((prev) => (prev === nextState.page ? prev : nextState.page));
    setPageSizeState((prev) => (prev === nextState.pageSize ? prev : nextState.pageSize));
  }, [searchParams]);

  useEffect(() => {
    const currentQuery = searchParams.toString();
    const nextQuery = buildRequestListSearchParams({
      statusFilter,
      dateSearchType,
      fromDate,
      toDate,
      pickupKeyword,
      dropoffKeyword,
      page,
      pageSize,
    }).toString();

    if (currentQuery === nextQuery) return;
    setSearchParams(nextQuery, { replace: true });
  }, [
    searchParams,
    setSearchParams,
    statusFilter,
    dateSearchType,
    fromDate,
    toDate,
    pickupKeyword,
    dropoffKeyword,
    page,
    pageSize,
  ]);

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  useEffect(() => {
    if (externalReloadTrigger == null) return;
    if (!hasSeenExternalReloadTriggerRef.current) {
      hasSeenExternalReloadTriggerRef.current = true;
      return;
    }
    setReloadSeq((v) => v + 1);
  }, [externalReloadTrigger]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<RequestDetail | null>(null);
  const [appSending, setAppSending] = useState<"APP1" | "APP2" | null>(null);
  const [appSendResult, setAppSendResult] = useState<AppSendResult | null>(null);

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignTargetId, setAssignTargetId] = useState<number | null>(null);
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignDeleting, setAssignDeleting] = useState(false);
  const [assignForm, setAssignForm] = useState<AssignFormState>({
    driverName: "",
    driverPhone: "",
    vehicleNumber: "",
    vehicleTonnage: "",
    vehicleType: "",
    actualFare: "",
    billingPrice: "",
    extraFare: "",
    extraFareReason: "",
    codRevenue: "",
    customerMemo: "",
    internalMemo: "",
  });

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerLoading, setImageViewerLoading] = useState(false);
  const [imageViewerError, setImageViewerError] = useState<string | null>(null);
  const [imageViewerTitle, setImageViewerTitle] = useState<string>("");
  const [imageViewerItems, setImageViewerItems] = useState<RequestImageAsset[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerRequestId, setImageViewerRequestId] = useState<number | null>(null);
  const [imageViewerKind, setImageViewerKind] = useState<"all" | "cargo" | "receipt">("all");
  const [uploadingReceiptId, setUploadingReceiptId] = useState<number | null>(null);
  const [uploadingCargoId, setUploadingCargoId] = useState<number | null>(null);
  const [pendingReceiptUploads, setPendingReceiptUploads] = useState<Record<number, File[]>>({});

  // 인수증 이미지 모달
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptModalRequestId, setReceiptModalRequestId] = useState<number | null>(null);
  const [receiptModalImages, setReceiptModalImages] = useState<RequestImageAsset[]>([]);
  const [receiptModalLoading, setReceiptModalLoading] = useState(false);
  const [receiptModalError, setReceiptModalError] = useState<string | null>(null);
  const [deletingReceiptImageId, setDeletingReceiptImageId] = useState<number | null>(null);
  const [receiptPreviewId, setReceiptPreviewId] = useState<number | null>(null);

  const cargoInputRef = useRef<HTMLInputElement | null>(null);
  const receiptViewerInputRef = useRef<HTMLInputElement | null>(null);

  const formatReservedDateTime = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  const applyListResponse = (res: ListResponse) => {
    setItems(res.items);
    setTotal(res.total);
    const { counts, total } = getCountsFromResponse(res);
    setStatusCounts(counts);
    setStatusTotal(total);
    setHasLoadedOnce(true);
  };

  const mergeSummaryWithDetail = (summary: RequestSummary, detail: RequestDetail): RequestSummary => {
    const activeDriver = detail.activeAssignment?.driver ?? null;
    const imageList = detail.images ?? [];
    return {
      ...summary,
      status: detail.status,
      orderNumber: detail.orderNumber ?? summary.orderNumber ?? null,
      ownerCompany: detail.ownerCompany ?? summary.ownerCompany ?? null,
      ownerCompanyName: detail.ownerCompany?.name ?? summary.ownerCompanyName ?? null,
      pickupPlaceName: detail.pickupPlaceName,
      pickupAddress: detail.pickupAddress,
      pickupAddressDetail: detail.pickupAddressDetail ?? null,
      pickupContactPhone: detail.pickupContactPhone ?? null,
      pickupAddressBookId: detail.pickupAddressBookId ?? null,
      pickupIsImmediate: detail.pickupIsImmediate,
      pickupDatetime: detail.pickupDatetime ?? null,
      pickupMemo: detail.pickupMemo ?? null,
      dropoffPlaceName: detail.dropoffPlaceName,
      dropoffAddress: detail.dropoffAddress,
      dropoffAddressDetail: detail.dropoffAddressDetail ?? null,
      dropoffContactPhone: detail.dropoffContactPhone ?? null,
      dropoffAddressBookId: detail.dropoffAddressBookId ?? null,
      dropoffIsImmediate: detail.dropoffIsImmediate,
      dropoffDatetime: detail.dropoffDatetime ?? null,
      dropoffMemo: detail.dropoffMemo ?? null,
      distanceKm: detail.distanceKm ?? null,
      quotedPrice: detail.quotedPrice ?? null,
      cargoDescription: detail.cargoDescription ?? null,
      driverNote: detail.driverNote ?? null,
      requestType: detail.requestType,
      paymentMethod: detail.paymentMethod ?? null,
      vehicleTonnage: detail.vehicleTonnage ?? null,
      vehicleBodyType: detail.vehicleBodyType ?? null,
      actualFare: detail.actualFare ?? detail.activeAssignment?.actualFare ?? null,
      billingPrice: detail.billingPrice ?? detail.activeAssignment?.billingPrice ?? null,
      targetCompanyName: detail.targetCompanyName ?? null,
      targetCompanyContactName: detail.targetCompanyContactName ?? null,
      targetCompanyContactPhone: detail.targetCompanyContactPhone ?? null,
      createdByName: detail.createdBy?.name ?? summary.createdByName ?? null,
      createdByCompany: detail.createdBy?.companyName ?? summary.createdByCompany ?? null,
      driverName: activeDriver?.name ?? null,
      driverPhone: activeDriver?.phone ?? null,
      driverVehicleNumber: activeDriver?.vehicleNumber ?? null,
      driverVehicleTonnage: activeDriver?.vehicleTonnage ?? null,
      driverVehicleBodyType: activeDriver?.vehicleBodyType ?? null,
      hasImages: imageList.length > 0,
      imageCount: imageList.length,
      hasReceiptImage: imageList.some((img) => img.kind === "receipt"),
    };
  };

  const syncDetailIntoViewState = (detail: RequestDetail) => {
    setDetailMap((prev) => ({ ...prev, [detail.id]: detail }));
    setDetailItem((prev) => (prev?.id === detail.id ? detail : prev));
    setItems((prev) =>
      prev.map((item) => (item.id === detail.id ? mergeSummaryWithDetail(item, detail) : item))
    );

    if (receiptModalRequestId === detail.id) {
      const receipts = (detail.images ?? []).filter((img) => img.kind === "receipt");
      setReceiptModalImages(receipts);
      setReceiptPreviewId((prev) => {
        if (receipts.length === 0) return null;
        return prev != null && receipts.some((img) => img.id === prev) ? prev : receipts[0].id;
      });
    }

    if (imageViewerRequestId === detail.id) {
      const allImages = detail.images ?? [];
      const nextViewerItems =
        imageViewerKind === "receipt"
          ? allImages.filter((img) => img.kind === "receipt")
          : imageViewerKind === "cargo"
          ? allImages.filter((img) => img.kind !== "receipt")
          : allImages;
      setImageViewerItems(nextViewerItems);
      setImageViewerIndex((prev) => {
        if (nextViewerItems.length === 0) return 0;
        return Math.min(prev, nextViewerItems.length - 1);
      });
      setImageViewerError(nextViewerItems.length === 0 ? "등록된 이미지가 없습니다." : null);
    }
  };

  const reloadCurrentList = async () => {
    const statusArg = statusFilter === "ALL" ? "ALL" : statusFilter;
    const requestKey = buildListRequestKey({
      statusFilter,
      fromDate,
      toDate,
      page,
      pageSize,
      dateSearchType,
      pickupKeyword,
      dropoffKeyword,
    });

    let requestPromise = listInFlightCache.get(requestKey);
    if (!requestPromise) {
      requestPromise = listRequests(
        statusArg,
        fromDate || undefined,
        toDate || undefined,
        page,
        pageSize,
        dateSearchType,
        pickupKeyword,
        dropoffKeyword
      ).finally(() => {
        listInFlightCache.delete(requestKey);
      });

      listInFlightCache.set(requestKey, requestPromise);
    }

    const res = await requestPromise;
    listResponseCache.set(requestKey, {
      data: res,
      updatedAt: Date.now(),
    });
    applyListResponse(res);
    return res;
  };

  const getFriendlyStatusChangeError = (message: string, nextStatus: RequestStatus) => {
    if (message.includes("활성 배차 정보가 있어야")) {
      if (nextStatus === "IN_TRANSIT") {
        return "기사 배정이 완료된 요청만 운행중으로 변경할 수 있습니다.";
      }
      if (nextStatus === "COMPLETED") {
        return "기사 배정이 완료된 요청만 완료 처리할 수 있습니다.";
      }
    }

    if (message.includes("허용되지 않는 상태 변경")) {
      return "현재 상태에서는 이 변경을 진행할 수 없습니다.";
    }

    return message;
  };

  const refreshRequestState = async (requestId: number, detailOverride?: RequestDetail | null) => {
    const detailPromise =
      detailOverride !== undefined
        ? Promise.resolve(detailOverride)
        : getRequestDetail(requestId).catch(() => null);

    const [detailResult, listResult] = await Promise.allSettled([detailPromise, reloadCurrentList()]);
    if (listResult.status === "rejected") {
      throw listResult.reason;
    }

    if (detailResult.status === "fulfilled" && detailResult.value) {
      const detail = detailResult.value;
      syncDetailIntoViewState(detail);
    }
  };

  // 🔹 목록 조회 (상태/기간/페이지 필터 적용)
  useEffect(() => {
    const fetchData = async () => {
      const currentRequestKey = buildListRequestKey({
        statusFilter,
        fromDate,
        toDate,
        page,
        pageSize,
        dateSearchType,
        pickupKeyword,
        dropoffKeyword,
      });
      const cachedEntry = listResponseCache.get(currentRequestKey);
      const hasCachedItems = !!cachedEntry;
      const isInitialLoad = !hasLoadedOnce && items.length === 0;
      const isFreshCachedResponse =
        !!cachedEntry && Date.now() - cachedEntry.updatedAt < LIST_RESPONSE_FRESH_MS;

      if (isFreshCachedResponse) {
        applyListResponse(cachedEntry.data);
        setLoading(false);
        setIsFetching(false);
        setError(null);
        return;
      }

      setIsFetching(true);
      setLoading(isInitialLoad && !hasCachedItems);
      setError(null);
      try {
        const res = await reloadCurrentList();
        if (page > 1 && res.total > 0 && page > Math.ceil(res.total / pageSize)) {
          setPage(Math.max(1, Math.ceil(res.total / pageSize)));
        }
      } catch (err: any) {
        console.error(err);
        setError(
          err.message ||
            "배차내역을 가져오는 중 오류가 발생했습니다."
        );
        if (!hasLoadedOnce && items.length === 0) {
          setItems([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
        setIsFetching(false);
      }
    };

    fetchData();
  }, [
    statusFilter,
    fromDate,
    toDate,
    dateSearchType,
    page,
    pageSize,
    pickupKeyword,
    dropoffKeyword,
    reloadSeq,
  ]);

  // 🔹 상태별 카운트는 "기간" 기준으로만 갱신
  useEffect(() => {
    const close = () => setOpenStatusMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // 백그라운드 상세 패칭 제거: 목록 API에 address/contact 필드 포함으로 불필요해짐
  // 상세 정보(detailMap)는 모달 열기 또는 배차정보 저장 시에만 갱신됨

  const getStatusActions = (status: RequestStatus) => {
    const actions: Array<{
      label: string;
      next: RequestStatus;
      tone?: "primary" | "danger";
    }> = [];

    if (isStaff) {
      if (status === "PENDING") actions.push({ label: "배차중", next: "DISPATCHING", tone: "primary" });
      if (status === "DISPATCHING") {
        actions.push({ label: "접수중", next: "PENDING" });
      }
      if (status === "ASSIGNED") {
        actions.push({ label: "배차중", next: "DISPATCHING" });
        actions.push({ label: "운행중", next: "IN_TRANSIT", tone: "primary" });
        actions.push({ label: "완료", next: "COMPLETED" });
      }
      if (status === "IN_TRANSIT") actions.push({ label: "완료", next: "COMPLETED", tone: "primary" });
      if (status === "CANCELLED") actions.push({ label: "배차중", next: "DISPATCHING", tone: "primary" });
      if (status !== "CANCELLED") actions.push({ label: "취소", next: "CANCELLED", tone: "danger" });
      return actions;
    }

    if (isClient && status === "PENDING") {
      actions.push({ label: "취소", next: "CANCELLED", tone: "danger" });
    }
    return actions;
  };

  const handleChangeStatus = async (requestId: number, nextStatus: RequestStatus) => {
    const key = `${requestId}:${nextStatus}`;
    try {
      setChangingStatusKey(key);
      await updateRequestStatus(requestId, nextStatus);

      if (nextStatus === "COMPLETED") {
        const pending = pendingReceiptUploads[requestId];
        if (pending && pending.length > 0) {
          setUploadingReceiptId(requestId);
          try {
            await uploadRequestImages(requestId, pending, "receipt");
            setPendingReceiptUploads((prev) => {
              const copy = { ...prev };
              delete copy[requestId];
              return copy;
            });
          } catch (err: any) {
            console.error(err);
            alert(err?.message || "인수증 업로드에 실패했습니다.");
          } finally {
            setUploadingReceiptId(null);
          }
        }
      }
      await refreshRequestState(requestId);
      setOpenStatusMenuId(null);
      return true;
    } catch (err: any) {
      console.error(err);
      alert(
        getFriendlyStatusChangeError(
          err?.message || "상태 변경 중 오류가 발생했습니다.",
          nextStatus
        )
      );
      return false;
    } finally {
      setChangingStatusKey(null);
    }
  };

  const handleUpdateOrderNumber = async (requestId: number, value: string) => {
    setSavingOrderNumberId(requestId);
    try {
      await updateRequestOrderNumber(requestId, value.trim() || null);
      await refreshRequestState(requestId);
      return true;
    } catch (err: any) {
      alert(err?.message || "오더번호 저장 중 오류가 발생했습니다.");
      return false;
    } finally {
      setSavingOrderNumberId((current) => (current === requestId ? null : current));
    }
  };

  const handleOpenDetail = async (id: number) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setDetailItem(null);
      setAppSendResult(null);
      setAppSending(null);

      const data = await getRequestDetail(id);
      setDetailItem(data);
      setDetailMap((prev) => ({ ...prev, [id]: data }));
    } catch (err: any) {
      console.error(err);
      setDetailError(
        err.message ||
          "상세 정보를 가져오는 중 오류가 발생했습니다."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
    setDetailError(null);
    setAppSendResult(null);
    setAppSending(null);
  };

  const buildExternalAppPayload = (
    target: "APP1" | "APP2",
    detail: RequestDetail
  ) => {
    const latestDriver = detail.assignments?.[0]?.driver;
    return {
      targetApp: target,
      sentAt: new Date().toISOString(),
      request: {
        id: detail.id,
        orderNumber: detail.orderNumber ?? null,
        status: detail.status,
        createdAt: detail.createdAt,
        requestType: detail.requestType,
        pickup: {
          placeName: detail.pickupPlaceName,
          address: detail.pickupAddress,
          addressDetail: detail.pickupAddressDetail ?? null,
          contactName: detail.pickupContactName ?? null,
          contactPhone: detail.pickupContactPhone ?? null,
          method: detail.pickupMethod,
          isImmediate: detail.pickupIsImmediate,
          datetime: detail.pickupDatetime ?? null,
        },
        dropoff: {
          placeName: detail.dropoffPlaceName,
          address: detail.dropoffAddress,
          addressDetail: detail.dropoffAddressDetail ?? null,
          contactName: detail.dropoffContactName ?? null,
          contactPhone: detail.dropoffContactPhone ?? null,
          method: detail.dropoffMethod,
          isImmediate: detail.dropoffIsImmediate,
          datetime: detail.dropoffDatetime ?? null,
        },
        vehicle: {
          group: detail.vehicleGroup ?? null,
          tonnage: detail.vehicleTonnage ?? null,
          bodyType: detail.vehicleBodyType ?? null,
        },
        cargo: {
          description: detail.cargoDescription ?? null,
          driverNote: detail.driverNote ?? null,
        },
        payment: {
          method: detail.paymentMethod ?? null,
          distanceKm: detail.distanceKm ?? null,
          quotedPrice: detail.quotedPrice ?? null,
        },
        assignment: latestDriver
          ? {
              driverName: latestDriver.name,
              driverPhone: latestDriver.phone,
              vehicleNumber: latestDriver.vehicleNumber ?? null,
              vehicleTonnage: latestDriver.vehicleTonnage ?? null,
              vehicleBodyType: latestDriver.vehicleBodyType ?? null,
            }
          : null,
      },
    };
  };

  const mockSendToExternalApp = async (
    target: "APP1" | "APP2",
    request: RequestDetail,
    payload: Record<string, unknown>
  ) => {
    await new Promise((resolve) => setTimeout(resolve, 900));
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate()
    ).padStart(2, "0")}`;
    return {
      target,
      success: true,
      message: `${target} 접수 전송 완료 (더미)`,
      externalRequestId: `${target}-${ymd}-${String(request.id).padStart(4, "0")}`,
      sentAt: now.toISOString(),
      payload,
    };
  };

  const handleSendToApp = async (target: "APP1" | "APP2") => {
    if (!detailItem || appSending) return;
    try {
      setAppSending(target);
      setAppSendResult(null);

      let result: AppSendResult;

      if (USE_MOCK_APP_INTEGRATION) {
        // 개발용 mock (USE_MOCK_APP_INTEGRATION = true 시 사용)
        const payload = buildExternalAppPayload(target, detailItem);
        result = await mockSendToExternalApp(target, detailItem, payload);
      } else {
        // 실제 연동
        const platformLabel = target === "APP1" ? "화물24" : "인성";
        let apiResult: IntegrationRegisterResult;

        if (target === "APP1") {
          apiResult = await registerCall24Order(detailItem.id);
        } else {
          apiResult = await registerInsungOrder(detailItem.id);
        }

        const externalId = apiResult.ordNo ?? apiResult.serialNumber;
        result = {
          target,
          success: apiResult.success,
          message: apiResult.message,
          externalRequestId: externalId,
          sentAt: new Date().toISOString(),
        };

        // 연동 성공 시 detail 새로고침 (status/외부번호 업데이트)
        if (apiResult.success) {
          void handleOpenDetail(detailItem.id);
        }
      }

      setAppSendResult(result);
    } catch (err: any) {
      console.error(err);
      const platformLabel = target === "APP1" ? "화물24" : "인성";
      setAppSendResult({
        target,
        success: false,
        message: err?.message || `${platformLabel} 전송 실패`,
        sentAt: new Date().toISOString(),
      });
    } finally {
      setAppSending(null);
    }
  };

  const handleOpenAssignModal = (requestId: number) => {
    if (!isStaff) {
      return;
    }
    const d = detailMap[requestId];
    const r = items.find((it) => it.id === requestId);
    const driver = d?.activeAssignment?.driver;
    const assignment = d?.activeAssignment;
    setAssignTargetId(requestId);
    setAssignForm({
      driverName: driver?.name ?? r?.driverName ?? "",
      driverPhone: driver?.phone ?? r?.driverPhone ?? "",
      vehicleNumber: driver?.vehicleNumber ?? r?.driverVehicleNumber ?? "",
      vehicleTonnage:
        driver?.vehicleTonnage != null ? String(driver.vehicleTonnage)
        : r?.driverVehicleTonnage != null ? String(r.driverVehicleTonnage)
        : "",
      vehicleType: driver?.vehicleBodyType ?? r?.driverVehicleBodyType ?? "",
      actualFare:
        assignment?.actualFare != null ? String(assignment.actualFare)
        : d?.actualFare != null ? String(d.actualFare)
        : r?.actualFare != null ? String(r.actualFare)
        : "",
      billingPrice:
        assignment?.billingPrice != null ? String(assignment.billingPrice)
        : d?.billingPrice != null ? String(d.billingPrice)
        : r?.billingPrice != null ? String(r.billingPrice)
        : "",
      extraFare: assignment?.extraFare != null ? String(assignment.extraFare) : "",
      extraFareReason: assignment?.extraFareReason ?? "",
      codRevenue: assignment?.codRevenue != null ? String(assignment.codRevenue) : "",
      customerMemo: assignment?.customerMemo ?? "",
      internalMemo: assignment?.internalMemo ?? "",
    });
    setAssignModalOpen(true);

    if (!d) {
      void getRequestDetail(requestId)
        .then((detail) => {
          setDetailMap((prev) => ({ ...prev, [requestId]: detail }));
          setDetailItem((prev) => (prev?.id === requestId ? detail : prev));
        })
        .catch(() => {
          // 모달은 요약 정보로 먼저 열고, 상세 동기화 실패는 무시한다.
        });
    }
  };

  const handleCloseAssignModal = () => {
    if (assignSaving || assignDeleting) return;
    setAssignModalOpen(false);
    setAssignTargetId(null);
  };

  const handleOpenImageViewer = async (
    requestId: number,
    options?: { kind?: "all" | "cargo" | "receipt"; title?: string }
  ) => {
    const kind = options?.kind ?? "all";
    try {
      setImageViewerOpen(true);
      setImageViewerLoading(true);
      setImageViewerError(null);
      setImageViewerItems([]);
      setImageViewerIndex(0);
      setImageViewerRequestId(requestId);
      setImageViewerKind(kind);
      setImageViewerTitle(options?.title ?? `요청 #${requestId} 이미지`);

      const list = await listRequestImages(requestId);
      const filtered =
        kind === "receipt"
          ? list.filter((img) => img.kind === "receipt")
          : kind === "cargo"
          ? list.filter((img) => img.kind !== "receipt")
          : list;
      setImageViewerItems(filtered);
      if (filtered.length === 0) {
        setImageViewerError("등록된 이미지가 없습니다.");
      }
    } catch (err: any) {
      console.error(err);
      setImageViewerError(err?.message || "이미지 조회 중 오류가 발생했습니다.");
    } finally {
      setImageViewerLoading(false);
    }
  };

  const handleUploadReceipt = async (requestId: number, files: File[] | FileList | null) => {
    if (!isStaff) {
      alert("직원 계정만 인수증 이미지를 업로드할 수 있습니다.");
      return;
    }
    const fileArr = files instanceof FileList ? Array.from(files) : files;
    if (!fileArr || fileArr.length === 0) return;
    setPendingReceiptUploads((prev) => {
      const current = prev[requestId] ?? [];
      const remain = Math.max(0, 5 - current.length);
      const next = [...current, ...fileArr.slice(0, remain)];
      return { ...prev, [requestId]: next };
    });
  };

  const handleRemovePendingReceipt = (requestId: number, index: number) => {
    setPendingReceiptUploads((prev) => {
      const current = prev[requestId] ?? [];
      if (index < 0 || index >= current.length) return prev;
      const next = current.filter((_, i) => i !== index);
      const copy = { ...prev };
      if (next.length === 0) {
        delete copy[requestId];
      } else {
        copy[requestId] = next;
      }
      return copy;
    });
  };

  const handleOpenReceiptModal = async (requestId: number) => {
    setReceiptModalOpen(true);
    setReceiptModalRequestId(requestId);
    setReceiptModalImages([]);
    setReceiptModalError(null);
    setReceiptPreviewId(null);
    setReceiptModalLoading(true);
    try {
      const list = await listRequestImages(requestId);
      const receipts = list.filter((img) => img.kind === "receipt");
      setReceiptModalImages(receipts);
      if (receipts.length > 0) setReceiptPreviewId(receipts[0].id);
    } catch (err: any) {
      setReceiptModalError(err?.message || "이미지 조회 중 오류가 발생했습니다.");
    } finally {
      setReceiptModalLoading(false);
    }
  };

  const handleCloseReceiptModal = () => {
    setReceiptModalOpen(false);
    setReceiptModalRequestId(null);
    setReceiptModalImages([]);
    setReceiptModalError(null);
    setReceiptPreviewId(null);
  };

  const handleDeleteReceiptImage = async (imageId: number) => {
    if (!isStaff) {
      alert("직원 계정만 인수증 이미지를 삭제할 수 있습니다.");
      return;
    }
    if (!receiptModalRequestId) return;
    try {
      setDeletingReceiptImageId(imageId);
      await deleteRequestImage(receiptModalRequestId, imageId);
      await refreshRequestState(receiptModalRequestId);
    } catch (err: any) {
      alert(err?.message || "이미지 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingReceiptImageId(null);
    }
  };

  const handleUploadCargo = async (requestId: number, files: FileList | null) => {
    if (!isStaff) {
      alert("직원 계정만 화물 이미지를 업로드할 수 있습니다.");
      return;
    }
    if (!files || files.length === 0) return;
    try {
      setUploadingCargoId(requestId);
      await uploadRequestImages(requestId, Array.from(files), "cargo");
      await refreshRequestState(requestId);
    } catch (err: any) {
      alert(err?.message || "화물 이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingCargoId(null);
      if (cargoInputRef.current) cargoInputRef.current.value = "";
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignTargetId) return;

    const toNumOrNull = (v: string) => {
      const s = v.trim();
      if (!s) return null;
      const n = Number(s);
      return Number.isNaN(n) ? null : n;
    };

    const payload = {
      driverName: assignForm.driverName.trim(),
      driverPhone: assignForm.driverPhone.trim(),
      vehicleNumber: assignForm.vehicleNumber.trim(),
      vehicleTonnage: toNumOrNull(assignForm.vehicleTonnage),
      vehicleType: assignForm.vehicleType.trim(),
      actualFare: toNumOrNull(assignForm.actualFare),
      billingPrice: toNumOrNull(assignForm.billingPrice),
      extraFare: toNumOrNull(assignForm.extraFare),
      extraFareReason: assignForm.extraFareReason.trim() || null,
      codRevenue: toNumOrNull(assignForm.codRevenue),
      customerMemo: assignForm.customerMemo.trim() || null,
      internalMemo: assignForm.internalMemo.trim() || null,
    };

    if (!payload.driverName || !payload.driverPhone || !payload.vehicleNumber || !payload.vehicleType) {
      alert("이름, 전화번호, 차량번호, 차량종류를 모두 입력해주세요.");
      return;
    }

    try {
      setAssignSaving(true);
      const updated = await saveRequestAssignment(assignTargetId, payload);
      await refreshRequestState(assignTargetId, updated);
      setAssignModalOpen(false);
      setAssignTargetId(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "배차정보 저장 중 오류가 발생했습니다.");
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignTargetId) return;
    if (!confirm("현재 활성 배차정보를 해제합니다. 요청은 배차중 상태로 전환되고, 기존 배차 이력은 보존됩니다. 계속할까요?")) return;

    try {
      setAssignDeleting(true);
      const updated = await deleteRequestAssignment(assignTargetId);
      await refreshRequestState(assignTargetId, updated);
      setAssignModalOpen(false);
      setAssignTargetId(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "배차정보 삭제 중 오류가 발생했습니다.");
    } finally {
      setAssignDeleting(false);
    }
  };

  const filteredItems = items;

  const statusCount = statusCounts;
  const assignTargetDetail = assignTargetId ? detailMap[assignTargetId] : null;
  const assignTargetSummary =
    assignTargetId != null ? items.find((item) => item.id === assignTargetId) ?? null : null;
  const hasCurrentAssignment =
    !!assignTargetDetail?.activeAssignment ||
    !!assignTargetSummary?.driverName ||
    !!assignTargetSummary?.driverPhone ||
    !!assignTargetSummary?.driverVehicleNumber;

  return {
    // Role
    isStaff,
    isAdmin,
    isClient,
    // List data
    loading,
    isFetching,
    error,
    detailMap,
    filteredItems,
    total,
    // Status
    statusCount,
    statusTotal,
    statusFilter,
    setStatusFilter,
    dateSearchType,
    setDateSearchType,
    // Excel
    exportingExcel,
    setExportingExcel,
    exportRequestListExcel,
    // Status menu
    openStatusMenuId,
    setOpenStatusMenuId,
    changingStatusKey,
    savingOrderNumberId,
    // Date filter
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    // Keyword filter
    pickupKeyword,
    setPickupKeyword,
    dropoffKeyword,
    setDropoffKeyword,
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    pageJumpInput,
    setPageJumpInput,
    totalPages,
    getPaginationNumbers: () => getPaginationNumbers(page, totalPages),
    // Detail modal
    detailOpen,
    detailLoading,
    detailError,
    detailItem,
    appSending,
    appSendResult,
    // Assign modal
    assignModalOpen,
    assignTargetId,
    assignSaving,
    assignDeleting,
    assignForm,
    setAssignForm,
    hasCurrentAssignment,
    // Image viewer
    imageViewerOpen,
    setImageViewerOpen,
    imageViewerLoading,
    imageViewerError,
    imageViewerTitle,
    imageViewerItems,
    imageViewerIndex,
    setImageViewerIndex,
    imageViewerRequestId,
    imageViewerKind,
    uploadingReceiptId,
    uploadingCargoId,
    // Receipt modal
    receiptModalOpen,
    receiptModalRequestId,
    receiptModalImages,
    receiptModalLoading,
    receiptModalError,
    deletingReceiptImageId,
    receiptPreviewId,
    pendingReceiptUploads,
    setReceiptPreviewId,
    // Refs
    cargoInputRef,
    receiptViewerInputRef,
    // Pure functions
    formatDate,
    formatStatus,
    formatReservedDateTime,
    getStatusActions,
    formatLocalYmd,
    // Handlers
    handleChangeStatus,
    handleUpdateOrderNumber,
    handleOpenDetail,
    handleCloseDetail,
    handleSendToApp,
    handleOpenAssignModal,
    handleCloseAssignModal,
    handleOpenImageViewer,
    handleUploadReceipt,
    handleRemovePendingReceipt,
    handleOpenReceiptModal,
    handleCloseReceiptModal,
    handleDeleteReceiptImage,
    handleUploadCargo,
    handleSaveAssignment,
    handleDeleteAssignment,
    // onReplayToRequestForm passthrough
    onReplayToRequestForm,
  };
}
