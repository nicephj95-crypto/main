// src/components/RequestDetailModal.tsx
import { useEffect, useRef, useState, type RefObject } from "react";
import type { RequestDetail, RequestStatus } from "../api/types";
import type { AppSendResult } from "../hooks/useRequestList";
import { HistoryModal } from "./HistoryModal";
import { getPlatformByVehicleGroup, platformLabel } from "../utils/integrationPlatform";
import { getVehicleDisplayParts } from "../utils/vehicleCatalog";
import { DispatchTrackingModal } from "./DispatchTrackingModal";


function formatRequestTypeLabel(type?: string | null): string {
  switch (type) {
    case "URGENT": return "긴급";
    case "DIRECT": return "혼적";
    case "ROUND_TRIP": return "왕복";
    case "NORMAL": return "기본";
    default: return type ?? "-";
  }
}

function formatPaymentMethodLabel(type?: string | null): string {
  switch (type) {
    case "CREDIT": return "신용";
    case "CARD": return "카드";
    case "CASH_PREPAID": return "선불";
    case "CASH_COLLECT": return "착불";
    default: return type ?? "-";
  }
}

function formatAssignmentEndedReason(reason?: string | null): string {
  switch (reason) {
    case "REASSIGNED":
      return "재배차 종료";
    case "REMOVED":
      return "배차 삭제";
    case "MIGRATION_DEDUPED":
      return "마이그레이션 정리";
    default:
      return reason ?? "종료";
  }
}

function formatWon(value?: number | null): string {
  return value != null ? `₩${value.toLocaleString()}` : "-";
}

function copyValue(value?: string | number | null): string {
  if (value == null) return "-";
  const text = String(value).trim();
  return text || "-";
}

function copyMoney(value?: number | null): string {
  return value != null ? `${value.toLocaleString()}원` : "-";
}

type AssignmentDriver = NonNullable<NonNullable<RequestDetail["activeAssignment"]>["driver"]>;

async function copyPlainText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildCustomerMessage(
  detail: RequestDetail,
  billingPrice?: number | null,
  assignmentOverride?: AssignmentDriver | null
): string {
  const assignment = assignmentOverride ?? detail.activeAssignment?.driver ?? null;
  const vehicleLine = `${copyValue(assignment?.vehicleTonnage != null ? `${assignment.vehicleTonnage}톤` : null)}/${copyValue(assignment?.vehicleBodyType)}`;

  return [
    "배차정보 전달 드립니다. ",
    "",
    `${copyValue(detail.pickupPlaceName)} > ${copyValue(detail.dropoffPlaceName)} `,
    "",
    copyValue(assignment?.name),
    copyValue(assignment?.phone),
    copyValue(assignment?.vehicleNumber),
    vehicleLine,
    copyMoney(billingPrice),
    "",
    "감사합니다.",
  ].join("\n");
}


type StatusAction = {
  label: string;
  next: RequestStatus;
  tone?: "primary" | "danger";
};

type Props = {
  detailOpen: boolean;
  detailItem: RequestDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  appSending: "APP1" | "APP2" | null;
  appSendResult: AppSendResult | null;
  cargoInputRef: RefObject<HTMLInputElement | null>;
  isStaff: boolean;
  changingStatusKey: string | null;
  handleCloseDetail: () => void;
  handleSendToApp: (target: "APP1" | "APP2") => void;
  handleUploadCargo: (requestId: number, files: FileList | null) => Promise<void>;
  handleOpenImageViewer: (
    requestId: number,
    options?: { kind?: "all" | "cargo" | "receipt"; title?: string }
  ) => Promise<void>;
  handleOpenAssignModal: (requestId: number) => void;
  handleChangeStatus: (requestId: number, nextStatus: RequestStatus) => Promise<boolean>;
  getStatusActions: (status: RequestStatus) => StatusAction[];
  onReplayToRequestForm?: (requestId: number) => void;
  onEditRequest?: (requestId: number) => void;
  isAdmin?: boolean;
  formatDate: (iso: string) => string;
  formatStatus: (status: string) => string;
  formatReservedDateTime: (value?: string | null) => string;
};

export function RequestDetailModal({
  detailOpen,
  detailItem,
  detailLoading,
  detailError,
  appSending,
  appSendResult,
  cargoInputRef,
  isStaff,
  changingStatusKey,
  handleCloseDetail,
  handleSendToApp,
  handleUploadCargo,
  handleOpenImageViewer,
  handleOpenAssignModal,
  handleChangeStatus,
  getStatusActions,
  onReplayToRequestForm,
  onEditRequest,
  isAdmin = false,
  formatDate,
  formatStatus,
  formatReservedDateTime,
}: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(false);

  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [assignCopyFeedback, setAssignCopyFeedback] = useState<string | null>(null);
  const [isAssignInfoHovered, setIsAssignInfoHovered] = useState(false);

  const handleCancelClick = () => setCancelConfirmOpen(true);

  useEffect(() => {
    if (!detailOpen) return;
    scrollRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [detailOpen, detailItem?.id]);

  useEffect(() => {
    setAssignCopyFeedback(null);
    setIsAssignInfoHovered(false);
  }, [detailItem?.id]);

  useEffect(() => {
    if (!detailOpen) return;
    setStatusActionError(null);
    setHistoryExpanded(false);
  }, [detailOpen, detailItem?.id]);

  if (!detailOpen) {
    return null;
  }

  const latestAssignment =
    detailItem?.activeAssignment ??
    detailItem?.assignments?.find((item) => item.isActive !== false) ??
    detailItem?.assignments?.[0] ??
    null;
  const assignment = latestAssignment?.driver ?? null;
  const pickupTimeLabel = detailItem
    ? detailItem.pickupIsImmediate
      ? "바로상차"
      : detailItem.pickupDatetime
      ? formatReservedDateTime(detailItem.pickupDatetime)
      : null
    : null;
  const dropoffTimeLabel = detailItem
    ? detailItem.dropoffIsImmediate
      ? "바로하차"
      : detailItem.dropoffDatetime
      ? formatReservedDateTime(detailItem.dropoffDatetime)
      : null
    : null;
  const requestMeta = detailItem
    ? [
        detailItem.requestType ? formatRequestTypeLabel(detailItem.requestType) : null,
        detailItem.paymentMethod ? formatPaymentMethodLabel(detailItem.paymentMethod) : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const statusActions = detailItem ? getStatusActions(detailItem.status) : [];
  const primaryStatusAction =
    statusActions.find((action) => action.tone === "primary") ?? null;
  const dangerStatusAction =
    statusActions.find((action) => action.tone === "danger") ?? null;
  const detailActionKey =
    detailItem && primaryStatusAction
      ? `${detailItem.id}:${primaryStatusAction.next}`
      : null;
  const detailDangerKey =
    detailItem && dangerStatusAction
      ? `${detailItem.id}:${dangerStatusAction.next}`
      : null;
  const isDetailStatusChanging =
    detailItem != null
      ? changingStatusKey?.startsWith(`${detailItem.id}:`) === true
      : false;

  // PENDING = 접수중: pre-dispatch UI. All other states = post-dispatch.
  const isPreDispatchState = detailItem ? detailItem.status === "PENDING" : false;
  const canReplayRequest = true;
  const showExternalAppButtons = detailItem ? detailItem.status !== "PENDING" : false;

  // 차량 조건에 따른 연동 플랫폼 자동 분기
  const integrationPlatform = getPlatformByVehicleGroup(detailItem?.vehicleGroup);
  const integrationPlatformLabel = platformLabel(integrationPlatform);
  const isCall24 = integrationPlatform === "CALL24";
  const syncStatus = isCall24 ? detailItem?.call24SyncStatus : detailItem?.insungSyncStatus;
  const orderId = isCall24 ? detailItem?.call24OrdNo : detailItem?.insungSerialNumber;
  const lastError = isCall24 ? detailItem?.call24LastError : detailItem?.insungLastError;
  const appTarget = isCall24 ? "APP1" : "APP2";

  const ownerLabel = detailItem
    ? (detailItem.ownerCompany?.name || detailItem.targetCompanyName || detailItem.createdBy?.companyName || "-") +
      ((detailItem.targetCompanyContactName || detailItem.createdBy?.name)
        ? ` · ${detailItem.targetCompanyContactName || detailItem.createdBy?.name}`
        : "")
    : "-";
  const cargoImageCount = detailItem?.images?.filter((img) => img.kind !== "receipt").length ?? 0;
  const hasCargoImages = cargoImageCount > 0;

  const primaryFooterLabel =
    isPreDispatchState && primaryStatusAction?.next === "DISPATCHING"
      ? "배차진행"
      : primaryStatusAction?.label ?? "배차정보 입력";

  const assignmentHistory = detailItem?.assignmentHistory ?? [];
  const latestBillingPrice = latestAssignment?.billingPrice ?? detailItem?.billingPrice ?? null;
  const latestActualFare = latestAssignment?.actualFare ?? detailItem?.actualFare ?? null;
  const expectedFare = detailItem?.externalEstimatedPrice ?? detailItem?.quotedPrice ?? null;
  const dispatchFare = latestActualFare ?? detailItem?.externalSentPrice ?? null;
  const hasDispatchInfo = Boolean(
    latestAssignment ||
      assignment ||
      detailItem?.orderNumber?.trim() ||
      latestBillingPrice != null ||
      latestActualFare != null ||
      detailItem?.externalSentPrice != null
  );

  const assignmentVehicleLabel = assignment
    ? `${assignment.vehicleTonnage != null ? `${assignment.vehicleTonnage}톤` : "-"} / ${assignment.vehicleBodyType || "-"}`
    : null;
  const assignmentSummary = assignment
    ? `${assignment.name} · ${assignment.phone} · ${assignment.vehicleNumber || "-"} · ${assignmentVehicleLabel}`
    : hasDispatchInfo
    ? "배차정보 저장됨"
    : "클릭하여 입력";
  const canEditDetail = detailItem ? isStaff || detailItem.status === "PENDING" : false;

  const handleCopyCustomerMessage = async () => {
    if (!detailItem) return;
    try {
      const message = buildCustomerMessage(detailItem, latestBillingPrice, assignment);
      console.log("[copy] customer message exact", message);
      await copyPlainText(message);
      setAssignCopyFeedback("복사 완료");
      window.setTimeout(() => setAssignCopyFeedback(null), 1600);
    } catch {
      setAssignCopyFeedback("복사 실패");
      window.setTimeout(() => setAssignCopyFeedback(null), 1600);
    }
  };

  const postDispatchFooterButtons = [
    primaryStatusAction
      ? {
          key: "primary",
          label: primaryStatusAction.label,
          tone: "default" as const,
          disabled: changingStatusKey === detailActionKey,
          onClick: () =>
            detailItem &&
            void handleChangeStatus(detailItem.id, primaryStatusAction.next),
        }
      : null,
    dangerStatusAction
      ? {
          key: "danger",
          label:
            changingStatusKey === detailDangerKey
              ? "처리 중..."
              : dangerStatusAction.label,
          tone: "danger" as const,
          disabled: changingStatusKey === detailDangerKey,
          onClick: () => handleCancelClick(),
        }
      : null,
  ].filter(Boolean) as Array<{
    key: string;
    label: string;
    tone: "default" | "danger";
    disabled: boolean;
    onClick: () => void;
  }>;

  return (
    <>
    <div className="dispatch-image-modal-backdrop rdm-backdrop" onClick={handleCloseDetail}>

      <div
        className="rdm-panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="배차 상세"
      >
        <div className="rdm-body" ref={scrollRef}>

          {/* ── 헤더 ── */}
          <div className="rdm-header">
            <div className="rdm-title-group">
              <h3 className="rdm-title">배차 상세</h3>
              {detailItem && (
                <span className="rdm-title-date">{formatDate(detailItem.createdAt).replace("\n", " ")}</span>
              )}
            </div>
            <div className="rdm-header-actions">
              {isAdmin && detailItem && (
                <button
                  type="button"
                  className="um-history-btn"
                  title="변경이력"
                  onClick={() => setHistoryOpen(true)}
                >
                  H
                </button>
              )}
              <button
                type="button"
                className="rdm-close-btn"
                onClick={handleCloseDetail}
                aria-label="닫기"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path
                    d="M15 5L5 15M5 5l10 10"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* ── 앱 전송 결과 메시지 ── */}
          {appSendResult && (
            <div
              className={`rdm-result ${appSendResult.success ? "success" : "error"}`}
            >
              <div>{appSendResult.message}</div>
              {appSendResult.externalRequestId && (
                <div className="rdm-result-sub">
                  외부 접수번호: {appSendResult.externalRequestId}
                </div>
              )}
              {appSendResult.payload && (
                <pre className="rdm-result-payload">
                  {JSON.stringify(appSendResult.payload, null, 2)}
                </pre>
              )}
            </div>
          )}

          {detailLoading && (
            <p className="rdm-state">상세 정보를 불러오는 중...</p>
          )}
          {detailError && (
            <p className="rdm-state rdm-state-error">{detailError}</p>
          )}

          {detailItem && !detailLoading && !detailError && (
            <>
              {/* ── Section 1: 상태 + 액션 버튼 + 날짜/접수자 ── */}
              <div className="rdm-section rdm-toolbar-section">
                <div className="rdm-toolbar-left">
                  {/* 상태 배지 */}
                  <span className={`list-status-chip rdm-status-chip ${detailItem.status}`}>
                    {formatStatus(detailItem.status)}
                  </span>

                  <div className="rdm-btn-group">
                    {/* 화물 이미지 버튼 — 항상 표시 */}
                    <button
                      type="button"
                      className={`rdm-icon-btn${hasCargoImages ? " has-images" : ""}`}
                      title={hasCargoImages ? `화물 이미지 보기 (${cargoImageCount}장)` : "화물 이미지 보기"}
                      onClick={() =>
                        void handleOpenImageViewer(detailItem.id, {
                          kind: "cargo",
                          title: `요청 #${detailItem.id} 화물 이미지`,
                        })
                      }
                    >
                      <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                        <rect x="3.25" y="4" width="15.5" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                        <circle cx="8.1" cy="9" r="1.5" fill="currentColor" />
                        <path d="m5.5 16 4.1-4 2.6 2.6 3.1-3.1L18 14.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {/* 복사 버튼 — 원본 정보를 폼에 채우되 신규 접수로 생성 */}
                    {onReplayToRequestForm && canReplayRequest && (
                      <button
                        type="button"
                        className="rdm-icon-btn"
                        title="배차복사"
                        onClick={() => {
                          onReplayToRequestForm(detailItem.id);
                          handleCloseDetail();
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                          <rect x="5" y="5" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
                          <path d="M8.5 2.8H4.8c-1.1 0-2 .9-2 2v9.7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}

                    {/* 수정 버튼 — 기존 배차 수정 모드로 진입 */}
                    {onEditRequest && canEditDetail && (
                      <button
                        type="button"
                        className="rdm-icon-btn"
                        title="배차수정"
                        onClick={() => {
                          onEditRequest(detailItem.id);
                          handleCloseDetail();
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                          <path d="M15.5 3.5a2.121 2.121 0 0 1 3 3L7 18l-4 1 1-4 11.5-11.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}

                    {/* 접수중(PENDING) 전용: 취소(휴지통) */}
                    {isPreDispatchState && dangerStatusAction && (
                      <button
                        type="button"
                        className="rdm-icon-btn rdm-icon-btn-danger"
                        title={dangerStatusAction.label}
                        onClick={() =>
                          void handleChangeStatus(
                            detailItem.id,
                            dangerStatusAction.next
                          )
                        }
                        disabled={changingStatusKey === detailDangerKey}
                      >
                        <svg width="18" height="18" viewBox="0 0 22 22" fill="none">
                          <path d="M5 6.5h12M8.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7m1.2 0v10c0 .9-.7 1.5-1.5 1.5H8.3c-.9 0-1.5-.7-1.5-1.5v-10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    )}

                    {/* 배차 후 상태(비PENDING): 외부 연동 버튼 (차량 조건에 따라 단일 플랫폼) */}
                    {showExternalAppButtons && isStaff && (
                      <button
                        type="button"
                        className={`rdm-app-btn${syncStatus === "SUCCESS" ? " rdm-app-btn-done" : syncStatus === "FAILED" ? " rdm-app-btn-fail" : ""}`}
                        onClick={() => void handleSendToApp(appTarget)}
                        disabled={!!appSending}
                        title={
                          syncStatus === "SUCCESS"
                            ? `${integrationPlatformLabel} 등록완료 · ${orderId ?? ""}`
                            : syncStatus === "FAILED"
                            ? `${integrationPlatformLabel} 실패: ${lastError ?? ""}`
                            : `${integrationPlatformLabel} 등록`
                        }
                      >
                        {appSending === appTarget ? "등록중" : syncStatus === "SUCCESS" ? `${integrationPlatformLabel}✓` : integrationPlatformLabel}
                      </button>
                    )}
                  </div>
                </div>

                {/* 접수자 — 우측 */}
                {isStaff && (
                  <div className="rdm-toolbar-right rdm-toolbar-right-staff">
                    <span className="rdm-toolbar-ref">
                      #{detailItem.id}
                      {detailItem.orderNumber?.trim() ? ` · ${detailItem.orderNumber.trim()}` : ""}
                    </span>
                    <span className="rdm-toolbar-owner">{ownerLabel}</span>
                  </div>
                )}
              </div>

              {/* ── Section 2: 출발지 / 도착지 ── */}
              <div className="rdm-section rdm-location-section">
                {/* 출발지 */}
                <div className="rdm-location-col">
                  {pickupTimeLabel && (
                    <div className="rdm-time-badge rdm-time-badge-pickup">
                      {pickupTimeLabel}
                    </div>
                  )}
                  <div className="rdm-place-name-row">
                    <span className="rdm-dot rdm-dot-pickup" />
                    <strong className="rdm-place-name">
                      {detailItem.pickupPlaceName}
                    </strong>
                  </div>
                  <div className="rdm-place-sub">
                    {[detailItem.pickupContactName, detailItem.pickupContactPhone]
                      .filter(s => s != null && s !== "")
                      .join(" · ") || "-"}
                  </div>
                  <div className="rdm-place-sub">
                    {[
                      detailItem.pickupAddress,
                      detailItem.pickupAddressDetail,
                    ]
                      .filter(s => s != null && s !== "")
                      .join(" ") || "-"}
                  </div>
                </div>

                {/* 도착지 */}
                <div className="rdm-location-col">
                  {dropoffTimeLabel && (
                    <div className="rdm-time-badge rdm-time-badge-dropoff">
                      {dropoffTimeLabel}
                    </div>
                  )}
                  <div className="rdm-place-name-row">
                    <span className="rdm-dot rdm-dot-dropoff" />
                    <strong className="rdm-place-name">
                      {detailItem.dropoffPlaceName}
                    </strong>
                  </div>
                  <div className="rdm-place-sub">
                    {[detailItem.dropoffContactName, detailItem.dropoffContactPhone]
                      .filter(s => s != null && s !== "")
                      .join(" · ") || "-"}
                  </div>
                  <div className="rdm-place-sub">
                    {[
                      detailItem.dropoffAddress,
                      detailItem.dropoffAddressDetail,
                    ]
                      .filter(s => s != null && s !== "")
                      .join(" ") || "-"}
                  </div>
                </div>
              </div>

              {/* ── Section 3: 차량 정보 ── */}
              <div className="rdm-section">
                <div className="rdm-flat-row">
                  <span className="rdm-flat-label">차량 정보</span>
                  <span className="rdm-flat-value">
                    {getVehicleDisplayParts(
                      detailItem.vehicleGroup,
                      detailItem.vehicleTonnage,
                      detailItem.vehicleBodyType
                    ).summary}
                  </span>
                </div>
              </div>

              {/* ── Section 4: 특이사항 / 기사요청사항 ── */}
              <div className="rdm-section">
                <div className="rdm-flat-row">
                  <span className="rdm-flat-label">특이사항</span>
                  <span className="rdm-flat-value">
                    {(requestMeta || detailItem.cargoDescription) ? (
                      <>
                        {requestMeta && (
                          <span className="rdm-accent">{requestMeta}</span>
                        )}
                        {requestMeta && detailItem.cargoDescription && " "}
                        {detailItem.cargoDescription}
                      </>
                    ) : "-"}
                  </span>
                </div>
                <div className="rdm-flat-row rdm-flat-row-mt">
                  <span className="rdm-flat-label">기사요청사항</span>
                  <span className="rdm-flat-value">
                    {detailItem.driverNote || "-"}
                  </span>
                </div>
              </div>

              {/* ── Section 5: 배차정보 (클릭 → 배차정보 입력 모달) ── */}
              <div
                className={`rdm-section rdm-assign-section${isStaff ? "" : " rdm-assign-section-readonly"}${hasDispatchInfo ? " has-assignment" : ""}${isStaff && hasDispatchInfo ? " has-staff-actions" : ""}`}
                onClick={
                  isStaff
                    ? hasDispatchInfo
                      ? undefined
                      : () => handleOpenAssignModal(detailItem.id)
                    : () => setTrackingModalOpen(true)
                }
                role={isStaff && !hasDispatchInfo ? "button" : !isStaff ? "button" : undefined}
                tabIndex={isStaff && !hasDispatchInfo ? 0 : !isStaff ? 0 : undefined}
                onKeyDown={
                  isStaff && !hasDispatchInfo
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleOpenAssignModal(detailItem.id);
                        }
                      }
                    : !isStaff
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setTrackingModalOpen(true);
                        }
                      }
                    : undefined
                }
              >
                {isStaff && (
                  <div
                    className="rdm-flat-row rdm-flat-row-mt"
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <span className="rdm-flat-label">오더번호</span>
                    <span className="rdm-flat-value">{detailItem.orderNumber?.trim() || "-"}</span>
                  </div>
                )}
                {isStaff && (
                  <div className="rdm-flat-row rdm-fare-summary-row">
                    <span className="rdm-flat-label">예상금액 / 배차금액</span>
                    <span className="rdm-flat-value">
                      {formatWon(expectedFare)} / {formatWon(dispatchFare)}
                    </span>
                  </div>
                )}
                <div
                  className="rdm-flat-row rdm-assign-info-row"
                  onMouseEnter={() => { if (isStaff && hasDispatchInfo) setIsAssignInfoHovered(true); }}
                  onMouseLeave={() => setIsAssignInfoHovered(false)}
                >
                  <span className="rdm-flat-label">배차정보</span>
                  <span className="rdm-flat-value rdm-flat-value-muted rdm-assign-value-slot">
                    {isStaff && hasDispatchInfo && isAssignInfoHovered ? (
                      <span className="rdm-assign-hover-actions" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="rdm-assign-action-btn"
                          onClick={() => handleOpenAssignModal(detailItem.id)}
                        >
                          입력
                        </button>
                        <button
                          type="button"
                          className="rdm-assign-action-btn"
                          onClick={() => void handleCopyCustomerMessage()}
                        >
                          {assignCopyFeedback ?? "복사"}
                        </button>
                      </span>
                    ) : (
                      <span className="rdm-assign-display">
                        <span>{assignmentSummary}</span>
                        {isStaff && (
                          <span className="rdm-location-icons">
                            <button
                              type="button"
                              className="rdm-location-btn"
                              title={`${integrationPlatformLabel} 차주 위치 조회`}
                              onClick={(e) => { e.stopPropagation(); setTrackingModalOpen(true); }}
                            >
                              <svg width="15" height="15" viewBox="0 0 22 22" fill="none">
                                <circle cx="11" cy="10" r="4" stroke="currentColor" strokeWidth="1.8" />
                                <path d="M11 2C7.13 2 4 5.13 4 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                              </svg>
                              {integrationPlatformLabel}
                            </button>
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                </div>
                {/* 청구가격: 고객도 볼 수 있는 항목 */}
                {latestBillingPrice != null && (
                  <div className="rdm-flat-row rdm-flat-row-mt">
                    <span className="rdm-flat-label">청구가격</span>
                    <span className="rdm-flat-value">₩{latestBillingPrice.toLocaleString()}</span>
                  </div>
                )}
                {/* 업무메모: 고객도 볼 수 있는 항목 */}
                {latestAssignment?.customerMemo && (
                  <div className="rdm-flat-row rdm-flat-row-mt">
                    <span className="rdm-flat-label">업무메모</span>
                    <span className="rdm-flat-value">{latestAssignment.customerMemo}</span>
                  </div>
                )}
                {/* 대외비: 직원/관리자만 표시 */}
                {isStaff && latestActualFare != null && (
                  <div className="rdm-flat-row rdm-flat-row-mt">
                    <span className="rdm-flat-label">실운임 <span className="rdm-confidential-badge">대외비</span></span>
                    <span className="rdm-flat-value">₩{latestActualFare.toLocaleString()}</span>
                  </div>
                )}
                {isStaff && latestAssignment?.extraFare != null && (
                  <div className="rdm-flat-row rdm-flat-row-mt">
                    <span className="rdm-flat-label">추가요금 <span className="rdm-confidential-badge">대외비</span></span>
                    <span className="rdm-flat-value rdm-flat-value-extra">
                      +₩{latestAssignment.extraFare.toLocaleString()}
                      {latestAssignment.extraFareReason ? ` · ${latestAssignment.extraFareReason}` : ""}
                    </span>
                  </div>
                )}
                {isStaff && latestAssignment?.codRevenue != null && (
                  <div className="rdm-flat-row rdm-flat-row-mt">
                    <span className="rdm-flat-label">착불수익 <span className="rdm-confidential-badge">대외비</span></span>
                    <span className="rdm-flat-value">₩{latestAssignment.codRevenue.toLocaleString()}</span>
                  </div>
                )}
                {isStaff && latestAssignment?.internalMemo && (
                  <div className="rdm-flat-row rdm-flat-row-mt">
                    <span className="rdm-flat-label">내부메모 <span className="rdm-confidential-badge">대외비</span></span>
                    <span className="rdm-flat-value">{latestAssignment.internalMemo}</span>
                  </div>
                )}
              </div>

              {/* ── 외부 연동 상태 (STAFF only, 단일 플랫폼) ── */}
              {isStaff && (orderId || syncStatus === "FAILED") && (
                <div className="rdm-section rdm-integration-section">
                  {orderId && (
                    <div className="rdm-flat-row">
                      <span className="rdm-flat-label">{integrationPlatformLabel}</span>
                      <span className="rdm-flat-value rdm-integration-id">{orderId}</span>
                    </div>
                  )}
                  {syncStatus === "FAILED" && !orderId && (
                    <div className="rdm-flat-row">
                      <span className="rdm-flat-label">{integrationPlatformLabel}</span>
                      <span className="rdm-flat-value rdm-integration-error">
                        등록 실패 · {lastError ?? "알 수 없는 오류"}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {isStaff && assignmentHistory.length > 0 && (
                <div className="rdm-section rdm-history-section">
                  <button
                    type="button"
                    className="rdm-history-toggle"
                    onClick={() => setHistoryExpanded((prev) => !prev)}
                    aria-expanded={historyExpanded}
                  >
                    <span className="rdm-history-toggle-title">이전 배차 이력</span>
                    <span className="rdm-history-toggle-meta">
                      {assignmentHistory.length}건
                      <svg
                        className={`rdm-history-toggle-icon${historyExpanded ? " is-open" : ""}`}
                        width="14"
                        height="14"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </button>
                  {historyExpanded && (
                    <div className="rdm-history-list">
                      {assignmentHistory.map((history) => {
                        const historyDriver = history.driver;
                        const historyVehicleLabel = historyDriver
                          ? `${historyDriver.vehicleNumber || "-"} · ${historyDriver.vehicleTonnage != null ? `${historyDriver.vehicleTonnage}톤` : "-"} / ${historyDriver.vehicleBodyType || "-"}`
                          : "-";

                        return (
                          <div key={history.id} className="rdm-history-item">
                            <div className="rdm-flat-value" style={{ width: "100%" }}>
                              <div>
                                {historyDriver?.name || "-"} · {historyDriver?.phone || "-"} · {historyVehicleLabel}
                              </div>
                              <div className="rdm-flat-value-muted">
                                배차 {formatDate(history.assignedAt)}
                                {history.endedAt ? ` · 종료 ${formatDate(history.endedAt)}` : ""}
                                {` · ${formatAssignmentEndedReason(history.endedReason)}`}
                              </div>
                              {history.billingPrice != null && (
                                <div>청구가격: ₩{history.billingPrice.toLocaleString()}</div>
                              )}
                              {history.customerMemo && <div>업무메모: {history.customerMemo}</div>}
                              {isStaff && history.actualFare != null && (
                                <div>실운임: ₩{history.actualFare.toLocaleString()}</div>
                              )}
                              {isStaff && history.extraFare != null && (
                                <div>
                                  추가요금: +₩{history.extraFare.toLocaleString()}
                                  {history.extraFareReason ? ` · ${history.extraFareReason}` : ""}
                                </div>
                              )}
                              {isStaff && history.codRevenue != null && (
                                <div>착불수익: ₩{history.codRevenue.toLocaleString()}</div>
                              )}
                              {isStaff && history.internalMemo && (
                                <div>내부메모: {history.internalMemo}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* 화물 이미지 업로드 — 직원만 가능 */}
              {isStaff && (
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="rdm-hidden-file"
                  ref={cargoInputRef}
                  onChange={(e) => {
                    void handleUploadCargo(detailItem.id, e.target.files);
                  }}
                />
              )}

              {/* ── 하단 액션 버튼 ── */}
              <div className="rdm-footer">
                {isPreDispatchState ? (
                  <>
                    {/* 배차진행: 상태만 변경하고 상세 모달을 닫는다 */}
                    <button
                      type="button"
                      className="rdm-footer-btn"
                      disabled={isDetailStatusChanging || !primaryStatusAction}
                      onClick={async () => {
                        if (!primaryStatusAction || !detailItem || isDetailStatusChanging) {
                          return;
                        }
                        setStatusActionError(null);
                        const success = await handleChangeStatus(
                          detailItem.id,
                          primaryStatusAction.next
                        );
                        if (!success) {
                          setStatusActionError("배차진행에 실패했습니다. 잠시 후 다시 시도해주세요.");
                          return;
                        }
                        handleCloseDetail();
                      }}
                    >
                      {isDetailStatusChanging ? "처리 중..." : primaryFooterLabel}
                    </button>
                    {/* 배차취소 */}
                    <button
                      type="button"
                      className="rdm-footer-btn rdm-footer-btn-danger"
                      onClick={() => {
                        if (detailItem && dangerStatusAction) {
                          handleCancelClick();
                          return;
                        }
                        handleCloseDetail();
                      }}
                      disabled={isDetailStatusChanging || (dangerStatusAction
                        ? changingStatusKey === detailDangerKey
                        : false)}
                    >
                      {dangerStatusAction
                        ? isDetailStatusChanging || changingStatusKey === detailDangerKey
                          ? "처리 중..."
                          : dangerStatusAction.label
                        : "닫기"}
                    </button>
                  </>
                ) : postDispatchFooterButtons.length > 0 ? (
                  postDispatchFooterButtons.map((button) => (
                    <button
                      key={button.key}
                      type="button"
                      className={`rdm-footer-btn ${
                        button.tone === "danger" ? "rdm-footer-btn-danger" : ""
                      }`}
                      onClick={button.onClick}
                      disabled={button.disabled}
                    >
                      {button.label}
                    </button>
                  ))
                ) : (
                  <button
                    type="button"
                    className="rdm-footer-btn rdm-footer-btn-danger"
                    onClick={handleCloseDetail}
                  >
                    닫기
                  </button>
                )}
              </div>
              {statusActionError && (
                <p className="rdm-state rdm-state-error">{statusActionError}</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>

    {isAdmin && (
      <HistoryModal
        open={historyOpen}
        resource="REQUEST"
        resourceId={detailItem?.id ?? null}
        title={detailItem ? `#${detailItem.id}` : ""}
        onClose={() => setHistoryOpen(false)}
      />
    )}

    {/* 배차취소 확인 모달 */}
    {cancelConfirmOpen && (
      <div
        className="cd-backdrop"
        style={{ zIndex: 1600 }}
        onClick={() => setCancelConfirmOpen(false)}
      >
        <div
          className="cd-panel"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="cd-header">
            <span className="cd-title">배차 취소</span>
            <button
              type="button"
              className="cd-close"
              aria-label="닫기"
              onClick={() => setCancelConfirmOpen(false)}
            >
              ×
            </button>
          </div>
          <p className="cd-message">배차를 취소할까요?{"\n"}취소 후에는 되돌릴 수 없습니다.</p>
          <div className="cd-actions">
            <button
              type="button"
              className="cd-btn cd-btn-cancel"
              onClick={() => setCancelConfirmOpen(false)}
            >
              계속 진행
            </button>
            <button
              type="button"
              className="cd-btn cd-btn-confirm"
              onClick={() => {
                setCancelConfirmOpen(false);
                if (detailItem && dangerStatusAction) {
                  void handleChangeStatus(detailItem.id, dangerStatusAction.next);
                }
              }}
            >
              네, 취소합니다
            </button>
          </div>
        </div>
      </div>
    )}

    {detailItem && (
      <DispatchTrackingModal
        requestId={detailItem.id}
        platform={isCall24 ? "hwamul24" : "insung"}
        open={trackingModalOpen}
        onClose={() => setTrackingModalOpen(false)}
      />
    )}
    </>
  );
}
