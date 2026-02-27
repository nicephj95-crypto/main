// src/hooks/useRequestList.ts
import { useEffect, useRef, useState } from "react";
import type { RequestSummary, RequestStatus, RequestDetail } from "../api/types";
import type { RequestImageAsset } from "../api/types";
import { formatDate } from "../utils/date";
import { formatStatus } from "../utils/format";
import { getPaginationNumbers } from "../utils/pagination";
import {
  listRequests,
  getRequestDetail,
  getRequestStatusCounts,
  exportRequestListExcel,
  updateRequestStatus,
  saveRequestAssignment,
  deleteRequestAssignment,
  listRequestImages,
  uploadRequestImages,
} from "../api/client";
import type { AuthUser } from "../LoginPanel";

export type AssignFormState = {
  driverName: string;
  driverPhone: string;
  vehicleNumber: string;
  vehicleTonnage: string;
  vehicleType: string;
  actualFare: string;
  billingPrice: string;
};

export type AppSendResult = {
  target: "APP1" | "APP2";
  success: boolean;
  message: string;
  externalRequestId?: string;
  sentAt: string;
  payload?: Record<string, unknown>;
};

export function useRequestList(
  currentUser?: AuthUser | null,
  onReplayToRequestForm?: (requestId: number) => void
) {
  const USE_MOCK_APP_INTEGRATION = true;
  const role = currentUser?.role;
  const isStaff = role === "ADMIN" || role === "DISPATCHER";
  const isClient = role === "CLIENT";

  const [items, setItems] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailMap, setDetailMap] = useState<Record<number, RequestDetail>>({});
  const [statusCounts, setStatusCounts] = useState<Record<RequestStatus, number>>({
    PENDING: 0,
    DISPATCHING: 0,
    ASSIGNED: 0,
    IN_TRANSIT: 0,
    COMPLETED: 0,
    CANCELLED: 0,
  });
  const [statusTotal, setStatusTotal] = useState<number>(0);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [openStatusMenuId, setOpenStatusMenuId] = useState<number | null>(null);
  const [changingStatusKey, setChangingStatusKey] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);

  const [statusFilter, setStatusFilter] = useState<RequestStatus | "ALL">("ALL");

  const formatLocalYmd = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return formatLocalYmd(d);
  });
  const [toDate, setToDate] = useState<string>(() => formatLocalYmd(new Date()));
  const [pickupKeyword, setPickupKeyword] = useState<string>("");
  const [dropoffKeyword, setDropoffKeyword] = useState<string>("");

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [pageJumpInput, setPageJumpInput] = useState<string>("1");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

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
  });

  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [imageViewerLoading, setImageViewerLoading] = useState(false);
  const [imageViewerError, setImageViewerError] = useState<string | null>(null);
  const [imageViewerTitle, setImageViewerTitle] = useState<string>("");
  const [imageViewerItems, setImageViewerItems] = useState<RequestImageAsset[]>([]);
  const [imageViewerIndex, setImageViewerIndex] = useState(0);
  const [imageViewerRequestId, setImageViewerRequestId] = useState<number | null>(null);
  const [imageViewerKind, setImageViewerKind] = useState<"all" | "receipt">("all");
  const [uploadingReceiptId, setUploadingReceiptId] = useState<number | null>(null);
  const [uploadingCargoId, setUploadingCargoId] = useState<number | null>(null);

  const receiptInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
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

  // 🔹 목록 조회 (상태/기간/페이지 필터 적용)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusArg =
          statusFilter === "ALL" ? "ALL" : statusFilter;
        const fromArg = fromDate || undefined;
        const toArg = toDate || undefined;

        const res = await listRequests(
          statusArg,
          fromArg,
          toArg,
          page,
          pageSize
        );

        setItems(res.items);
        setTotal(res.total);
      } catch (err: any) {
        console.error(err);
        setError(
          err.message ||
            "배차내역을 가져오는 중 오류가 발생했습니다."
        );
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statusFilter, fromDate, toDate, page, pageSize, reloadSeq]);

  // 🔹 상태별 카운트는 "기간" 기준으로만 갱신
  useEffect(() => {
    const run = async () => {
      try {
        const res = await getRequestStatusCounts(fromDate || undefined, toDate || undefined);
        setStatusTotal(res.total);
        setStatusCounts(res.counts);
      } catch {
        // ignore: keep previous counts
      }
    };
    run();
  }, [fromDate, toDate, reloadSeq]);

  useEffect(() => {
    const close = () => setOpenStatusMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  // 🔹 현재 페이지의 항목들에 대해 상세 데이터 로드 (UI용)
  useEffect(() => {
    const ids = items.map((x) => x.id).filter((id) => !detailMap[id]);
    if (ids.length === 0) return;

    let cancelled = false;
    const run = async () => {
      const results: Array<[number, RequestDetail]> = [];
      let idx = 0;
      const concurrency = Math.min(6, ids.length);

      const workers = Array.from({ length: concurrency }, async () => {
        while (idx < ids.length) {
          const id = ids[idx++];
          try {
            const d = await getRequestDetail(id);
            results.push([id, d]);
          } catch {
            // ignore per-item errors
          }
        }
      });

      await Promise.all(workers);
      if (cancelled || results.length === 0) return;
      setDetailMap((prev) => {
        const next = { ...prev };
        for (const [id, d] of results) next[id] = d;
        return next;
      });
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [items, detailMap]);


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
        actions.push({ label: "배차완료", next: "ASSIGNED", tone: "primary" });
      }
      if (status === "ASSIGNED") {
        actions.push({ label: "배차중", next: "DISPATCHING" });
        actions.push({ label: "완료", next: "COMPLETED", tone: "primary" });
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

      setItems((prev) =>
        prev.map((it) => (it.id === requestId ? { ...it, status: nextStatus } : it))
      );
      setDetailMap((prev) => {
        const target = prev[requestId];
        if (!target) return prev;
        return { ...prev, [requestId]: { ...target, status: nextStatus } };
      });
      setDetailItem((prev) =>
        prev?.id === requestId ? { ...prev, status: nextStatus } : prev
      );

      setOpenStatusMenuId(null);
      setReloadSeq((v) => v + 1);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "상태 변경 중 오류가 발생했습니다.");
    } finally {
      setChangingStatusKey(null);
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
      const payload = buildExternalAppPayload(target, detailItem);
      console.log(`[mock-${target}] outbound payload`, payload);

      const result = USE_MOCK_APP_INTEGRATION
        ? await mockSendToExternalApp(target, detailItem, payload)
        : await mockSendToExternalApp(target, detailItem, payload);
      setAppSendResult(result);
    } catch (err: any) {
      console.error(err);
      setAppSendResult({
        target,
        success: false,
        message: err?.message || `${target} 전송 실패`,
        sentAt: new Date().toISOString(),
      });
    } finally {
      setAppSending(null);
    }
  };

  const handleOpenAssignModal = (requestId: number) => {
    const d = detailMap[requestId];
    const driver = d?.assignments?.[0]?.driver;
    setAssignTargetId(requestId);
    setAssignForm({
      driverName: driver?.name ?? "",
      driverPhone: driver?.phone ?? "",
      vehicleNumber: driver?.vehicleNumber ?? "",
      vehicleTonnage:
        driver?.vehicleTonnage != null ? String(driver.vehicleTonnage) : "",
      vehicleType: driver?.vehicleBodyType ?? "",
      actualFare: d?.actualFare != null ? String(d.actualFare) : "",
      billingPrice: d?.billingPrice != null ? String(d.billingPrice) : "",
    });
    setAssignModalOpen(true);
  };

  const handleCloseAssignModal = () => {
    if (assignSaving || assignDeleting) return;
    setAssignModalOpen(false);
    setAssignTargetId(null);
  };

  const resolveImageUrl = (url: string) => {
    if (!url) return url;
    if (/^https?:\/\//i.test(url)) return url;
    const base = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
    return `${base}${url.startsWith("/") ? url : `/${url}`}`;
  };

  const handleOpenImageViewer = async (
    requestId: number,
    options?: { kind?: "all" | "receipt"; title?: string }
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
      const filtered = kind === "receipt" ? list.filter((img) => img.kind === "receipt") : list;
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

  const handleUploadReceipt = async (requestId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingReceiptId(requestId);
      await uploadRequestImages(requestId, Array.from(files), "receipt");
      if (imageViewerOpen && imageViewerRequestId === requestId && imageViewerKind === "receipt") {
        const list = await listRequestImages(requestId);
        const receipts = list.filter((img) => img.kind === "receipt");
        setImageViewerItems(receipts);
        setImageViewerIndex(0);
        setImageViewerError(receipts.length === 0 ? "등록된 이미지가 없습니다." : null);
      }
      setReloadSeq((v) => v + 1);
    } catch (err: any) {
      alert(err?.message || "인수증 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingReceiptId(null);
      // 같은 파일 재업로드 가능하게 input 초기화
      const input = receiptInputRefs.current[requestId];
      if (input) input.value = "";
    }
  };

  const handleUploadCargo = async (requestId: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingCargoId(requestId);
      await uploadRequestImages(requestId, Array.from(files), "cargo");
      // 상세 데이터 갱신
      const updated = await getRequestDetail(requestId);
      setDetailMap((prev) => ({ ...prev, [requestId]: updated }));
      setDetailItem((prev) => (prev?.id === requestId ? updated : prev));
    } catch (err: any) {
      alert(err?.message || "화물 이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setUploadingCargoId(null);
      if (cargoInputRef.current) cargoInputRef.current.value = "";
    }
  };

  const handleSaveAssignment = async () => {
    if (!assignTargetId) return;

    const payload = {
      driverName: assignForm.driverName.trim(),
      driverPhone: assignForm.driverPhone.trim(),
      vehicleNumber: assignForm.vehicleNumber.trim(),
      vehicleTonnage: assignForm.vehicleTonnage.trim()
        ? Number(assignForm.vehicleTonnage.trim())
        : null,
      vehicleType: assignForm.vehicleType.trim(),
      actualFare: assignForm.actualFare.trim() ? Number(assignForm.actualFare.trim()) : null,
      billingPrice: assignForm.billingPrice.trim() ? Number(assignForm.billingPrice.trim()) : null,
    };

    if (!payload.driverName || !payload.driverPhone || !payload.vehicleNumber || !payload.vehicleType) {
      alert("이름, 전화번호, 차량번호, 차량종류를 모두 입력해주세요.");
      return;
    }
    if (payload.vehicleTonnage != null && Number.isNaN(payload.vehicleTonnage)) {
      alert("톤수는 숫자로 입력해주세요.");
      return;
    }

    try {
      setAssignSaving(true);
      const updated = await saveRequestAssignment(assignTargetId, payload);

      setDetailMap((prev) => ({ ...prev, [assignTargetId]: { ...prev[assignTargetId], ...updated } }));
      setItems((prev) =>
        prev.map((it) =>
          it.id === assignTargetId ? { ...it, status: updated.status } : it
        )
      );
      setDetailItem((prev) =>
        prev?.id === assignTargetId ? { ...prev, ...updated } : prev
      );
      setAssignModalOpen(false);
      setAssignTargetId(null);
      setReloadSeq((v) => v + 1);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "배차정보 저장 중 오류가 발생했습니다.");
    } finally {
      setAssignSaving(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!assignTargetId) return;
    if (!confirm("현재 배차정보를 삭제하고 상태를 배차중으로 되돌릴까요?")) return;

    try {
      setAssignDeleting(true);
      const updated = await deleteRequestAssignment(assignTargetId);

      setDetailMap((prev) => ({ ...prev, [assignTargetId]: { ...prev[assignTargetId], ...updated } }));
      setItems((prev) =>
        prev.map((it) =>
          it.id === assignTargetId ? { ...it, status: updated.status } : it
        )
      );
      setDetailItem((prev) => (prev?.id === assignTargetId ? { ...prev, ...updated } : prev));
      setAssignModalOpen(false);
      setAssignTargetId(null);
      setReloadSeq((v) => v + 1);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "배차정보 삭제 중 오류가 발생했습니다.");
    } finally {
      setAssignDeleting(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const pickupOk = pickupKeyword.trim()
      ? item.pickupPlaceName
          .toLowerCase()
          .includes(pickupKeyword.trim().toLowerCase())
      : true;
    const dropoffOk = dropoffKeyword.trim()
      ? item.dropoffPlaceName
          .toLowerCase()
          .includes(dropoffKeyword.trim().toLowerCase())
      : true;
    return pickupOk && dropoffOk;
  });

  const statusCount = statusCounts;
  const assignTargetDetail = assignTargetId ? detailMap[assignTargetId] : null;
  const hasCurrentAssignment = !!assignTargetDetail?.assignments?.[0];

  return {
    // Role
    isStaff,
    isClient,
    // List data
    loading,
    error,
    detailMap,
    filteredItems,
    total,
    // Status
    statusCount,
    statusTotal,
    statusFilter,
    setStatusFilter,
    // Excel
    exportingExcel,
    setExportingExcel,
    exportRequestListExcel,
    // Status menu
    openStatusMenuId,
    setOpenStatusMenuId,
    changingStatusKey,
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
    // Refs
    receiptInputRefs,
    cargoInputRef,
    receiptViewerInputRef,
    // Pure functions
    formatDate,
    formatStatus,
    formatReservedDateTime,
    resolveImageUrl,
    getStatusActions,
    formatLocalYmd,
    // Handlers
    handleChangeStatus,
    handleOpenDetail,
    handleCloseDetail,
    handleSendToApp,
    handleOpenAssignModal,
    handleCloseAssignModal,
    handleOpenImageViewer,
    handleUploadReceipt,
    handleUploadCargo,
    handleSaveAssignment,
    handleDeleteAssignment,
    // onReplayToRequestForm passthrough
    onReplayToRequestForm,
  };
}
