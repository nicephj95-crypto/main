// src/RequestList.tsx
import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import type { AuthUser } from "./LoginPanel";
import { useRequestList } from "./hooks/useRequestList";
import { RequestDetailModal } from "./components/RequestDetailModal";
import { ExternalPriceModal } from "./components/ExternalPriceModal";
import { RequestAssignModal } from "./components/RequestAssignModal";
import { getVehicleDisplayParts } from "./utils/vehicleCatalog";
import { RequestImageViewer } from "./components/RequestImageViewer";
import { ReceiptImageModal } from "./components/ReceiptImageModal";
import { exportRequestListExcel, listCompanies } from "./api/client";
import type { CompanyName } from "./api/types";
import { RequestListControls } from "./components/request-list/RequestListControls";

const MOBILE_STATUS_TABS = [
  { value: "ALL" as const, label: "전체" },
  { value: "PENDING" as const, label: "접수중" },
  { value: "DISPATCHING" as const, label: "배차중" },
  { value: "ASSIGNED" as const, label: "배차완료" },
  { value: "CANCELLED" as const, label: "취소" },
];

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="white"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="m7 17 4-4 2.5 2.5L17 12l3 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ReplayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 9h11v12H9V9Z"
        stroke="currentColor"
        strokeWidth="2"
        fill="white"
      />
      <path
        d="M4 15H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

type RequestListProps = {
  currentUser?: AuthUser | null;
  onReplayToRequestForm?: (requestId: number) => void;
  onEditRequest?: (requestId: number) => void;
  reloadTrigger?: number;
};

export function RequestList({
  currentUser,
  onReplayToRequestForm,
  onEditRequest,
  reloadTrigger,
}: RequestListProps) {
  const {
    isStaff,
    isAdmin,
    isClient,
    loading,
    error,
    detailMap,
    filteredItems,
    total,
    statusCount,
    statusTotal,
    statusFilter,
    setStatusFilter,
    dateSearchType,
    setDateSearchType,
    exportingExcel,
    setExportingExcel,
    changingStatusKey,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    pickupKeyword,
    setPickupKeyword,
    dropoffKeyword,
    setDropoffKeyword,
    companyKeyword,
    setCompanyKeyword,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    getPaginationNumbers,
    detailOpen,
    detailLoading,
    detailError,
    detailItem,
    appSending,
    appSendResult,
    assignModalOpen,
    assignTargetId,
    assignSaving,
    assignForm,
    setAssignForm,
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
    receiptModalOpen,
    receiptModalRequestId,
    receiptModalImages,
    receiptModalLoading,
    receiptModalError,
    pendingReceiptUploads,
    deletingReceiptImageId,
    receiptPreviewId,
    setReceiptPreviewId,
    cargoInputRef,
    receiptViewerInputRef,
    formatDate,
    formatStatus,
    formatReservedDateTime,
    getStatusActions,
    formatLocalYmd,
    handleChangeStatus,
    handleOpenDetail,
    handleCloseDetail,
    handleSendToApp,
    extPriceModalOpen,
    extPriceEstimated,
    extPricePlatformLabel,
    handleExtPriceConfirm,
    handleExtPriceCancel,
    handleOpenAssignModal,
    handleCloseAssignModal,
    handleOpenImageViewer,
    handleUploadReceipt,
    handleConfirmReceiptUpload,
    handleRemovePendingReceipt,
    handleOpenReceiptModal,
    handleCloseReceiptModal,
    handleDeleteReceiptImage,
    handleUploadCargo,
    handleSaveAssignment,
  } = useRequestList(currentUser, onReplayToRequestForm, reloadTrigger);

  const [companyFilterOpen, setCompanyFilterOpen] = useState(false);
  const [companySearchText, setCompanySearchText] = useState("");
  const [companyOptions, setCompanyOptions] = useState<CompanyName[]>([]);
  const [companyOptionsLoading, setCompanyOptionsLoading] = useState(false);
  const [companyOptionsError, setCompanyOptionsError] = useState<string | null>(null);

  // Mobile/tablet 전용 필터 시트
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileFilterDraft, setMobileFilterDraft] = useState({
    dateSearchType,
    fromDate,
    toDate,
    pickupKeyword,
    dropoffKeyword,
    statusFilter,
  });
  const openMobileFilter = () => {
    setMobileFilterDraft({
      dateSearchType,
      fromDate,
      toDate,
      pickupKeyword,
      dropoffKeyword,
      statusFilter,
    });
    setMobileFilterOpen(true);
  };
  const applyMobileFilter = () => {
    setDateSearchType(mobileFilterDraft.dateSearchType);
    setFromDate(mobileFilterDraft.fromDate);
    setToDate(mobileFilterDraft.toDate);
    setPickupKeyword(mobileFilterDraft.pickupKeyword);
    setDropoffKeyword(mobileFilterDraft.dropoffKeyword);
    setStatusFilter(mobileFilterDraft.statusFilter);
    setPage(1);
    setMobileFilterOpen(false);
  };
  const resetMobileFilter = () => {
    const today = new Date();
    const to = formatLocalYmd(today);
    const fromDateRef = new Date();
    fromDateRef.setDate(fromDateRef.getDate() - 7);
    const from = formatLocalYmd(fromDateRef);
    setMobileFilterDraft({
      dateSearchType: "RECEIVED_DATE",
      fromDate: from,
      toDate: to,
      pickupKeyword: "",
      dropoffKeyword: "",
      statusFilter: "ALL",
    });
  };
  const mobileActiveFilterCount =
    (pickupKeyword ? 1 : 0) +
    (dropoffKeyword ? 1 : 0) +
    (statusFilter !== "ALL" ? 1 : 0);

  useEffect(() => {
    if (!companyFilterOpen) return;
    setCompanySearchText(companyKeyword);
  }, [companyFilterOpen, companyKeyword]);

  useEffect(() => {
    if (!companyFilterOpen || companyOptions.length > 0) return;

    let cancelled = false;
    const fetchCompanies = async () => {
      try {
        setCompanyOptionsLoading(true);
        setCompanyOptionsError(null);
        const companies = await listCompanies();
        if (!cancelled) {
          setCompanyOptions(companies);
        }
      } catch (err: any) {
        if (!cancelled) {
          setCompanyOptionsError(err?.message || "업체 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setCompanyOptionsLoading(false);
        }
      }
    };

    void fetchCompanies();
    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyFilterOpen, companyOptions.length]);

  const filteredCompanies = useMemo(() => {
    const keyword = companySearchText.trim().toLowerCase();
    if (!keyword) return companyOptions;
    return companyOptions.filter((company) => company.name.toLowerCase().includes(keyword));
  }, [companyOptions, companySearchText]);

  const applyCompanyFilter = (name: string) => {
    setCompanyKeyword(name);
    setPage(1);
    setCompanyFilterOpen(false);
  };

  const clearCompanyFilter = () => {
    setCompanyKeyword("");
    setPage(1);
    setCompanySearchText("");
    setCompanyFilterOpen(false);
  };

  const renderPagination = () => (
    <div className="pagination-line">
      <button
        type="button"
        className="pager-nav-btn"
        disabled={page <= 1}
        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
      >
        &lt; 이전
      </button>
      <div className="pager-numbers">
        {getPaginationNumbers().map((p, idx) =>
          p === "..." ? (
            <span key={`ellipsis-${idx}`} className="page-ellipsis">...</span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              disabled={p === page}
              className={`page-number-btn ${p === page ? "active" : ""}`}
            >
              {p}
            </button>
          )
        )}
      </div>
      <button
        type="button"
        className="pager-nav-btn"
        disabled={page >= totalPages}
        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
      >
        다음 &gt;
      </button>
    </div>
  );

  return (
    <div className="table-page request-list-page">
      <div className="request-list-desktop-controls">
        <RequestListControls
          dateSearchType={dateSearchType}
          fromDate={fromDate}
          toDate={toDate}
          pickupKeyword={pickupKeyword}
          dropoffKeyword={dropoffKeyword}
          pageSize={pageSize}
          statusFilter={statusFilter}
          statusTotal={statusTotal}
          statusCount={statusCount}
          exportingExcel={exportingExcel}
          formatLocalYmd={formatLocalYmd}
          setDateSearchType={setDateSearchType}
          setFromDate={setFromDate}
          setToDate={setToDate}
          setPickupKeyword={setPickupKeyword}
          setDropoffKeyword={setDropoffKeyword}
          setPage={setPage}
          setPageSize={setPageSize}
          setStatusFilter={setStatusFilter}
          setExportingExcel={setExportingExcel}
          onExport={async () => {
            try {
              await exportRequestListExcel({
                status: statusFilter,
                from: fromDate || undefined,
                to: toDate || undefined,
                dateType: dateSearchType,
                pickupKeyword,
                dropoffKeyword,
                companyKeyword,
              });
            } catch (err: any) {
              alert(
                err?.message || "배차내역 엑셀 다운로드 중 오류가 발생했습니다."
              );
            }
          }}
        />
      </div>

      {/* Mobile 전용 헤더 — design-reference 그대로 (필터 버튼 + 총건수만) */}
      <div className="request-list-mobile-header">
        <button
          type="button"
          className="request-mobile-filter-btn"
          onClick={openMobileFilter}
          aria-label="필터"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M3 6h14M6 10h8M8 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>필터</span>
          {mobileActiveFilterCount > 0 && (
            <span className="request-mobile-filter-badge">{mobileActiveFilterCount}</span>
          )}
        </button>
        <div className="request-mobile-total-line">총 {total}건</div>
      </div>

      {!loading && !error && filteredItems.length === 0 && (
        <div className="table-page-results request-list-desktop-results request-list-empty-table-head">
          <table className="grid-table">
            <colgroup>
              <col style={{ width: 118 }} />
              <col style={{ width: 160 }} />
              <col style={{ width: 230 }} />
              <col style={{ width: 230 }} />
              <col style={{ width: 70 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 110 }} />
            </colgroup>
            <thead>
              <tr>
                <th>{dateSearchType === "PICKUP_DATE" ? "상차일시" : "접수일시"}</th>
                <th>
                  <button
                    type="button"
                    className={`list-company-filter-trigger${companyKeyword ? " is-active" : ""}`}
                    onClick={() => setCompanyFilterOpen(true)}
                    aria-label="업체 검색"
                    title="업체 검색"
                  >
                    <span>접수자</span>
                    {companyKeyword ? (
                      <span className="list-company-filter-pill">{companyKeyword}</span>
                    ) : (
                      <Search size={14} aria-hidden="true" />
                    )}
                  </button>
                </th>
                <th>출발지</th>
                <th>도착지</th>
                <th>차량</th>
                <th>운임</th>
                <th>배차정보</th>
                <th>기타</th>
              </tr>
            </thead>
          </table>
        </div>
      )}

      {/* 초기 로딩만 표시 - 데이터 있는 상태에서 백그라운드 갱신 시엔 숨김(깜빡임 방지) */}
      {loading && filteredItems.length === 0 && (
        <div className="list-empty-state">
          <p className="list-empty-msg">불러오는 중...</p>
        </div>
      )}
      {!loading && error && (
        <div className="list-empty-state">
          <p className="list-empty-msg">배차내역을 불러오지 못했습니다.</p>
          <p className="list-empty-sub">{error}</p>
        </div>
      )}
      {!loading && !error && total === 0 && (
        <div className="list-empty-state">
          <p className="list-empty-msg">배차내역이 없습니다.</p>
          <p className="list-empty-sub">위에서 배차접수를 먼저 진행해주세요.</p>
        </div>
      )}

      {!loading && !error && total > 0 && filteredItems.length === 0 && (
        <div className="list-empty-state">
          <p className="list-empty-msg">검색 조건에 맞는 배차내역이 없습니다.</p>
          <p className="list-empty-sub">검색 조건을 변경하거나 초기화해보세요.</p>
        </div>
      )}

      {!error && filteredItems.length > 0 && (
        <>
          <div className="table-page-results request-list-desktop-results">
            <table className="grid-table">
              <colgroup>
                <col style={{ width: 118 }} />
                <col style={{ width: 160 }} />
                <col style={{ width: 230 }} />
                <col style={{ width: 230 }} />
                <col style={{ width: 70 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 100 }} />
                <col style={{ width: 110 }} />
              </colgroup>
              <thead>
                <tr>
                  <th>{dateSearchType === "PICKUP_DATE" ? "상차일시" : "접수일시"}</th>
                  <th>
                    <button
                      type="button"
                      className={`list-company-filter-trigger${companyKeyword ? " is-active" : ""}`}
                      onClick={() => setCompanyFilterOpen(true)}
                      aria-label="업체 검색"
                      title="업체 검색"
                    >
                      <span>접수자</span>
                      {companyKeyword ? (
                        <span className="list-company-filter-pill">{companyKeyword}</span>
                      ) : (
                        <Search size={14} aria-hidden="true" />
                      )}
                    </button>
                  </th>
                  <th>출발지</th>
                  <th>도착지</th>
                  <th>차량</th>
                  <th>운임</th>
                  <th>배차정보</th>
                  <th>기타</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((r) => {
                const d = detailMap[r.id];

                // 출발지/도착지 정보
                const pickupPlaceName = d?.pickupPlaceName ?? r.pickupPlaceName;
                const pickupContactName = d?.pickupContactName ?? r.pickupContactName ?? "";
                const pickupPhone = d?.pickupContactPhone ?? r.pickupContactPhone ?? "";
                const pickupAddr = [
                  d?.pickupAddress ?? r.pickupAddress ?? "",
                  d?.pickupAddressDetail ?? r.pickupAddressDetail ?? "",
                ].filter(s => s !== "").join(" ");

                const dropoffPlaceName = d?.dropoffPlaceName ?? r.dropoffPlaceName;
                const dropoffContactName = d?.dropoffContactName ?? r.dropoffContactName ?? "";
                const dropoffPhone = d?.dropoffContactPhone ?? r.dropoffContactPhone ?? "";
                const dropoffAddr = [
                  d?.dropoffAddress ?? r.dropoffAddress ?? "",
                  d?.dropoffAddressDetail ?? r.dropoffAddressDetail ?? "",
                ].filter(s => s !== "").join(" ");

                // 상차/하차 시간 배지: 목록 데이터만으로도 기본 표시하고, 상세 캐시가 있으면 우선 사용
                const pickupIsImmediate = d?.pickupIsImmediate ?? r.pickupIsImmediate ?? false;
                const pickupDatetime = d?.pickupDatetime ?? r.pickupDatetime ?? null;
                const dropoffIsImmediate = d?.dropoffIsImmediate ?? r.dropoffIsImmediate ?? false;
                const dropoffDatetime = d?.dropoffDatetime ?? r.dropoffDatetime ?? null;
                const pickupBadge = pickupIsImmediate
                  ? "바로상차"
                  : pickupDatetime
                  ? formatReservedDateTime(pickupDatetime)
                  : null;
                const primaryListDate =
                  dateSearchType === "PICKUP_DATE"
                    ? (pickupIsImmediate || !pickupDatetime
                        ? d?.createdAt ?? r.createdAt
                        : pickupDatetime)
                    : d?.createdAt ?? r.createdAt;
                const dropoffBadge = dropoffIsImmediate
                  ? "바로하차"
                  : dropoffDatetime
                  ? formatReservedDateTime(dropoffDatetime)
                  : null;

                const vehicleParts = getVehicleDisplayParts(
                  d?.vehicleGroup ?? r.vehicleGroup,
                  d?.vehicleTonnage ?? r.vehicleTonnage,
                  d?.vehicleBodyType ?? r.vehicleBodyType
                );
                const vehicleTon = vehicleParts.title;
                const vehicleType = vehicleParts.subtitle;

                // 차량 하단 메타 정보: 레퍼런스처럼 작은 텍스트 한 줄로 표시
                const requestTypeValue = d?.requestType ?? r.requestType;
                const requestMeta =
                  requestTypeValue === "URGENT" ? "긴급"
                  : requestTypeValue === "DIRECT" ? "혼적"
                  : requestTypeValue === "ROUND_TRIP" ? "왕복"
                  : null;
                const paymentMethodValue = d?.paymentMethod ?? r.paymentMethod ?? null;
                const paymentMeta =
                  paymentMethodValue === "CASH_COLLECT" ? "착불"
                  : paymentMethodValue === "CASH_PREPAID" ? "선불"
                  : paymentMethodValue === "CARD" ? "카드"
                  : null;
                const vehicleMeta = [requestMeta, paymentMeta].filter(Boolean).join("\n");

                const pickupSpecialNote = r.pickupMemo?.trim() || "";
                const dropoffSpecialNote = r.dropoffMemo?.trim() || "";

                // 운임 (스태프만)
                const actualFare = d?.actualFare ?? r.actualFare;
                const billingPrice = d?.billingPrice ?? r.billingPrice;
                const extraFare = d?.assignments?.[0]?.extraFare ?? r.extraFare ?? null;

                const hasReceiptImage =
                  d?.images?.some((img) => img.kind === "receipt") ?? r.hasReceiptImage ?? false;

                return (
                  <tr
                    key={r.id}
                    className="list-row-clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenDetail(r.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleOpenDetail(r.id);
                      }
                    }}
                  >
                    {/* 접수/상차일시: #id + 접수연월일 + 시간 (2줄 분리) */}
                    <td>
                      <div className="list-cell">
                        {isStaff && <span className="list-order-id">#{r.id}</span>}
                        {(() => {
                          const [dateLabel, timeLabel] = formatDate(primaryListDate).split("\n");
                          return (
                            <>
                              <div className="list-cell-date">{dateLabel}</div>
                              <div className="list-cell-time">{timeLabel}</div>
                            </>
                          );
                        })()}
                      </div>
                    </td>

                    {/* 접수자: 회사명 + 접수자명 + 배차자명 */}
                    <td>
                      <div className="list-cell">
                        <div className="list-cell-title">
                          {d?.ownerCompany?.name ||
                            d?.targetCompanyName ||
                            r.ownerCompanyName ||
                            r.createdByCompany ||
                            "-"}
                        </div>
                        {isStaff && (
                          <>
                            <div className="list-party-line">
                              <span className="list-party-label">접수자</span>
                              <span className="list-party-value">
                                {d?.targetCompanyContactName ||
                                  d?.createdBy?.name ||
                                  r.targetCompanyContactName ||
                                  r.createdByName ||
                                  "-"}
                              </span>
                            </div>
                            <div className="list-party-line">
                              <span className="list-party-label">배차자</span>
                              <span className="list-party-value">
                                {r.assignedByName || "-"}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </td>

                    {/* 출발지: 상차 시간 배지 + 장소명 + 연락처 + 주소 */}
                    <td style={{ textAlign: "left" }}>
                      <div className="list-cell list-cell-left">
                        {pickupBadge && (
                          <div className="list-time-badge list-time-badge-pickup">{pickupBadge}</div>
                        )}
                        <div className={`list-cell-title${pickupSpecialNote ? " has-note" : ""}`}>
                          {pickupSpecialNote ? (
                            <span className="list-note-highlight" title={pickupSpecialNote}>
                              {pickupPlaceName}
                              <span className="list-note-tooltip">{pickupSpecialNote}</span>
                            </span>
                          ) : (
                            pickupPlaceName
                          )}
                        </div>
                        {(pickupContactName || pickupPhone) && (
                          <div className="list-cell-sub">
                            {[pickupContactName, pickupPhone].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {pickupAddr && <div className="list-cell-sub list-cell-addr" title={pickupAddr}>{pickupAddr}</div>}
                      </div>
                    </td>

                    {/* 도착지: 하차 시간 배지 + 장소명(특이사항 있으면 노란 하이라이트+툴팁) + 연락처 + 주소 */}
                    <td style={{ textAlign: "left" }}>
                      <div className="list-cell list-cell-left">
                        {dropoffBadge && (
                          <div className="list-time-badge list-time-badge-dropoff">{dropoffBadge}</div>
                        )}
                        <div className={`list-cell-title${dropoffSpecialNote ? " has-note" : ""}`}>
                          {dropoffSpecialNote ? (
                            <span className="list-note-highlight" title={dropoffSpecialNote}>
                              {dropoffPlaceName}
                              <span className="list-note-tooltip">{dropoffSpecialNote}</span>
                            </span>
                          ) : (
                            dropoffPlaceName
                          )}
                        </div>
                        {(dropoffContactName || dropoffPhone) && (
                          <div className="list-cell-sub">
                            {[dropoffContactName, dropoffPhone].filter(Boolean).join(" · ")}
                          </div>
                        )}
                        {dropoffAddr && <div className="list-cell-sub list-cell-addr" title={dropoffAddr}>{dropoffAddr}</div>}
                      </div>
                    </td>

                    {/* 차량: 톤수 + 차종 + 요청/결제 메타 */}
                    <td
                      onClick={(e) => { e.stopPropagation(); handleOpenDetail(r.id); }}
                    >
                      <div className="list-cell">
                        <div className="list-cell-title">{vehicleTon}</div>
                        <div className="list-cell-sub">{vehicleType}</div>
                        {vehicleMeta && (
                          <div className="list-vehicle-meta">{vehicleMeta}</div>
                        )}
                      </div>
                    </td>

                    {/* 운임: 스태프에게만 원가/청구 표시 */}
                    <td
                      style={{ textAlign: "center", verticalAlign: "middle" }}
                      onClick={(e) => { e.stopPropagation(); handleOpenDetail(r.id); }}
                    >
                      {(isStaff ? (actualFare != null || billingPrice != null || extraFare != null) : billingPrice != null) ? (
                        <div className="list-fare-cell">
                          {isStaff && actualFare != null && (
                            <div className="list-fare-row">
                              <span className="list-fare-label">원가</span>
                              <span className="list-fare-value">₩{actualFare.toLocaleString()}</span>
                            </div>
                          )}
                          {billingPrice != null && (
                            <div className="list-fare-row">
                              <span className="list-fare-label">청구</span>
                              <span className="list-fare-value list-fare-billing">₩{billingPrice.toLocaleString()}</span>
                            </div>
                          )}
                          {isStaff && extraFare != null && (
                            <div className="list-fare-row">
                              <span className="list-fare-label list-fare-label-extra">추가</span>
                              <span className="list-fare-value list-fare-extra">+₩{extraFare.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="list-cell-sub">-</span>
                      )}
                    </td>
                    <td
                      className={isStaff ? "list-assign-td" : undefined}
                      onClick={isStaff ? (e) => { e.stopPropagation(); handleOpenAssignModal(r.id); } : undefined}
                      title={isStaff ? "배차정보 입력" : undefined}
                    >
                      <div
                        className={`list-cell ${isStaff ? "list-assign-cell-btn" : ""}`}
                      >
                        {(() => {
                          const driverName = d?.assignments?.[0]?.driver?.name || r.driverName;
                          const driverPhone = d?.assignments?.[0]?.driver?.phone || r.driverPhone;
                          const vehicleNumber = d?.assignments?.[0]?.driver?.vehicleNumber || r.driverVehicleNumber;
                          const vehicleTon = d?.assignments?.[0]?.driver?.vehicleTonnage != null
                            ? `${d.assignments[0].driver.vehicleTonnage}톤`
                            : r.driverVehicleTonnage != null
                            ? `${r.driverVehicleTonnage}톤`
                            : null;
                          const vehicleType = d?.assignments?.[0]?.driver?.vehicleBodyType || r.driverVehicleBodyType;
                          const hasAny = driverName || driverPhone || vehicleNumber || vehicleTon || vehicleType;
                          if (!hasAny) {
                            return <span className="list-cell-sub">-</span>;
                          }
                          return (
                            <>
                              <div className="list-cell-title">{driverName || "-"}</div>
                              <div className="list-cell-sub">
                                {driverPhone || "-"}<br />
                                {vehicleNumber || "-"}<br />
                                {vehicleTon || "-"}/{vehicleType || "-"}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td>
                      <div className="list-other">
                        <span className={`list-status-chip ${r.status}`}>
                          {formatStatus(r.status)}
                        </span>
                        <div
                          className="list-other-actions"
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                        >
                          {/* 인수증 이미지 모달 */}
                          <button
                            type="button"
                            className={`list-icon-btn list-receipt-btn ${hasReceiptImage ? "has-images" : ""}`}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleOpenReceiptModal(r.id);
                            }}
                            aria-label={hasReceiptImage ? "인수증 이미지 보기" : "인수증 이미지 추가"}
                            title={hasReceiptImage ? "인수증 이미지 보기" : "인수증 이미지 추가"}
                            disabled={uploadingReceiptId === r.id}
                          >
                            {uploadingReceiptId === r.id ? "..." : <ImageIcon />}
                          </button>
                          <button
                            type="button"
                            className="list-icon-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReplayToRequestForm?.(r.id);
                            }}
                            aria-label="배차복사"
                            title="배차복사"
                          >
                            <ReplayIcon />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
                })}
              </tbody>
            </table>

            {renderPagination()}
          </div>

          <div className="request-list-mobile-results">
            {filteredItems.map((r) => {
              const d = detailMap[r.id];
              const pickupPlaceName = d?.pickupPlaceName ?? r.pickupPlaceName;
              const pickupAddr = [
                d?.pickupAddress ?? r.pickupAddress ?? "",
                d?.pickupAddressDetail ?? r.pickupAddressDetail ?? "",
              ].filter(Boolean).join(" ");
              const pickupSpecialNote = r.pickupMemo?.trim() || "";
              const dropoffPlaceName = d?.dropoffPlaceName ?? r.dropoffPlaceName;
              const dropoffAddr = [
                d?.dropoffAddress ?? r.dropoffAddress ?? "",
                d?.dropoffAddressDetail ?? r.dropoffAddressDetail ?? "",
              ].filter(Boolean).join(" ");
              const dropoffSpecialNote = r.dropoffMemo?.trim() || "";
              const pickupIsImmediate = d?.pickupIsImmediate ?? r.pickupIsImmediate ?? false;
              const pickupDatetime = d?.pickupDatetime ?? r.pickupDatetime ?? null;
              const dropoffIsImmediate = d?.dropoffIsImmediate ?? r.dropoffIsImmediate ?? false;
              const dropoffDatetime = d?.dropoffDatetime ?? r.dropoffDatetime ?? null;
              const pickupBadge = pickupIsImmediate
                ? "바로상차"
                : pickupDatetime
                ? formatReservedDateTime(pickupDatetime)
                : null;
              const dropoffBadge = dropoffIsImmediate
                ? "바로하차"
                : dropoffDatetime
                ? formatReservedDateTime(dropoffDatetime)
                : null;
              const primaryListDate =
                dateSearchType === "PICKUP_DATE"
                  ? (pickupIsImmediate || !pickupDatetime
                      ? d?.createdAt ?? r.createdAt
                      : pickupDatetime)
                  : d?.createdAt ?? r.createdAt;
              const [dateLabel, timeLabel] = formatDate(primaryListDate).split("\n");
              const vehicleParts = getVehicleDisplayParts(
                d?.vehicleGroup ?? r.vehicleGroup,
                d?.vehicleTonnage ?? r.vehicleTonnage,
                d?.vehicleBodyType ?? r.vehicleBodyType
              );
              const requestTypeValue = d?.requestType ?? r.requestType;
              const requestMeta =
                requestTypeValue === "URGENT" ? "긴급"
                : requestTypeValue === "DIRECT" ? "혼적"
                : requestTypeValue === "ROUND_TRIP" ? "왕복"
                : null;
              const paymentMethodValue = d?.paymentMethod ?? r.paymentMethod ?? null;
              const paymentMeta =
                paymentMethodValue === "CASH_COLLECT" ? "착불"
                : paymentMethodValue === "CASH_PREPAID" ? "선불"
                : paymentMethodValue === "CARD" ? "카드"
                : null;
              const actualFare = d?.actualFare ?? r.actualFare;
              const billingPrice = d?.billingPrice ?? r.billingPrice;
              const extraFare = d?.assignments?.[0]?.extraFare ?? r.extraFare ?? null;
              const driverName = d?.assignments?.[0]?.driver?.name || r.driverName;
              const driverPhone = d?.assignments?.[0]?.driver?.phone || r.driverPhone;
              const vehicleNumber = d?.assignments?.[0]?.driver?.vehicleNumber || r.driverVehicleNumber;
              const hasReceiptImage =
                d?.images?.some((img) => img.kind === "receipt") ?? r.hasReceiptImage ?? false;

              const companyName =
                d?.ownerCompany?.name ||
                d?.targetCompanyName ||
                r.ownerCompanyName ||
                r.createdByCompany ||
                "";
              const reporterName =
                d?.targetCompanyContactName ||
                d?.createdBy?.name ||
                r.targetCompanyContactName ||
                r.createdByName ||
                "";
              const orderIdLabel = `#${r.id}`;
              const headerSubLine = [orderIdLabel, companyName, reporterName].filter(Boolean).join(" · ");
              const driverInfoLine = [driverName, driverPhone, vehicleNumber].filter(Boolean).join(" · ");
              const carDisplay = vehicleParts.title;
              const ctypeDisplay = [vehicleParts.subtitle, requestMeta, paymentMeta].filter(Boolean).join(" / ");

              return (
                <div
                  key={r.id}
                  className="dr-history-card"
                  onClick={() => handleOpenDetail(r.id)}
                >
                  {/* Header: Status & Date */}
                  <div className="dr-history-card-head">
                    <span className={`dr-history-status dr-status-${r.status}`}>
                      {formatStatus(r.status)}
                    </span>
                    <div className="dr-history-card-datetime">
                      {dateLabel} {timeLabel}
                    </div>
                  </div>

                  {/* Order Number, Company & Assignee */}
                  {headerSubLine && (
                    <div className="dr-history-card-subline">{headerSubLine}</div>
                  )}

                  {/* From */}
                  <div className="dr-history-card-route-block">
                    <div className="dr-history-card-route-line">
                      <span className="dr-history-card-route-dot dr-pickup" />
                      <span className="dr-history-card-place">{pickupPlaceName}</span>
                      {pickupBadge && (
                        <span className="dr-history-card-time-badge dr-pickup">{pickupBadge}</span>
                      )}
                    </div>
                    {pickupAddr && <div className="dr-history-card-addr">{pickupAddr}</div>}
                    {pickupSpecialNote && (
                      <div className="dr-history-card-note">{pickupSpecialNote}</div>
                    )}
                  </div>

                  {/* To */}
                  <div className="dr-history-card-route-block">
                    <div className="dr-history-card-route-line">
                      <span className="dr-history-card-route-dot dr-dropoff" />
                      <span className="dr-history-card-place">{dropoffPlaceName}</span>
                      {dropoffBadge && (
                        <span className="dr-history-card-time-badge dr-dropoff">{dropoffBadge}</span>
                      )}
                    </div>
                    {dropoffAddr && <div className="dr-history-card-addr">{dropoffAddr}</div>}
                    {dropoffSpecialNote && (
                      <div className="dr-history-card-note">{dropoffSpecialNote}</div>
                    )}
                  </div>

                  {/* Driver Info */}
                  {driverInfoLine && (
                    <div className="dr-history-card-driver">{driverInfoLine}</div>
                  )}

                  {/* Divider */}
                  <div className="dr-history-card-divider" />

                  {/* Bottom: Vehicle/Type/Fare & Buttons */}
                  <div className="dr-history-card-bottom">
                    <div className="dr-history-card-bottom-info">
                      <div>
                        {carDisplay}
                        {ctypeDisplay ? ` / ${ctypeDisplay}` : ""}
                      </div>
                      {(actualFare != null || billingPrice != null || extraFare != null) ? (
                        <div className="dr-history-card-fares">
                          {isStaff && actualFare != null && (
                            <div>
                              <span className="dr-history-card-fare-label">원가 : </span>
                              <span>{actualFare.toLocaleString()}원</span>
                            </div>
                          )}
                          {billingPrice != null && (
                            <div>
                              <span className="dr-history-card-fare-label">청구 : </span>
                              <span className="dr-history-card-fare-billing">{billingPrice.toLocaleString()}원</span>
                            </div>
                          )}
                          {isStaff && extraFare != null && extraFare !== 0 && (
                            <div>
                              <span className="dr-history-card-fare-extra">+{extraFare.toLocaleString()}원</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="dr-history-card-fares">-</div>
                      )}
                    </div>
                    <div
                      className="dr-history-card-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className={`dr-history-card-icon-btn${hasReceiptImage ? " has-images" : ""}`}
                        disabled={uploadingReceiptId === r.id}
                        onClick={() => void handleOpenReceiptModal(r.id)}
                        title="이미지"
                        aria-label="인수증 이미지"
                      >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                          <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                          <path d="M2 11l3-3 2 2 3-3 3 3v2H2v-1z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="dr-history-card-icon-btn"
                        onClick={() => onReplayToRequestForm?.(r.id)}
                        title="복사"
                        aria-label="배차복사"
                      >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                          <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {renderPagination()}
          </div>
        </>
      )}

      {/* 🔹 상세 모달 */}
      <RequestDetailModal
        detailOpen={detailOpen}
        detailItem={detailItem}
        detailLoading={detailLoading}
        detailError={detailError}
        appSending={appSending}
        appSendResult={appSendResult}
        cargoInputRef={cargoInputRef}
        isStaff={isStaff}
        handleCloseDetail={handleCloseDetail}
        handleSendToApp={handleSendToApp}
        handleUploadCargo={handleUploadCargo}
        handleOpenImageViewer={handleOpenImageViewer}
        handleOpenAssignModal={handleOpenAssignModal}
        handleChangeStatus={handleChangeStatus}
        getStatusActions={getStatusActions}
        changingStatusKey={changingStatusKey}
        onReplayToRequestForm={onReplayToRequestForm}
        onEditRequest={onEditRequest}
        isAdmin={isAdmin}
        formatDate={formatDate}
        formatStatus={formatStatus}
        formatReservedDateTime={formatReservedDateTime}
      />

      <ExternalPriceModal
        open={extPriceModalOpen}
        platformLabel={extPricePlatformLabel}
        estimatedPrice={extPriceEstimated}
        minimumPrice={extPricePlatformLabel === "인성" ? 10000 : extPricePlatformLabel === "화물24" ? 20000 : 1}
        onConfirm={handleExtPriceConfirm}
        onCancel={handleExtPriceCancel}
      />

      <RequestAssignModal
        assignModalOpen={assignModalOpen}
        assignTargetId={assignTargetId}
        assignTargetVehicleGroup={
          assignTargetId != null
            ? (detailMap[assignTargetId]?.vehicleGroup ??
              filteredItems.find((item) => item.id === assignTargetId)?.vehicleGroup ??
              null)
            : null
        }
        assignTargetRequest={
          assignTargetId != null
            ? detailMap[assignTargetId] ??
              filteredItems.find((item) => item.id === assignTargetId) ??
              null
            : null
        }
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        assignSaving={assignSaving}
        isStaff={isStaff}
        handleCloseAssignModal={handleCloseAssignModal}
        handleSaveAssignment={handleSaveAssignment}
      />

      <RequestImageViewer
        imageViewerOpen={imageViewerOpen}
        imageViewerTitle={imageViewerTitle}
        imageViewerKind={imageViewerKind}
        imageViewerRequestId={imageViewerRequestId}
        imageViewerLoading={imageViewerLoading}
        imageViewerError={imageViewerError}
        imageViewerItems={imageViewerItems}
        imageViewerIndex={imageViewerIndex}
        uploadingReceiptId={uploadingReceiptId}
        receiptViewerInputRef={receiptViewerInputRef}
        setImageViewerOpen={setImageViewerOpen}
        handleUploadReceipt={handleUploadReceipt}
        setImageViewerIndex={setImageViewerIndex}
        canManageImages={isStaff}
      />

      <ReceiptImageModal
        open={receiptModalOpen}
        requestId={receiptModalRequestId}
        images={receiptModalImages}
        loading={receiptModalLoading}
        uploading={uploadingReceiptId === receiptModalRequestId}
        deletingId={deletingReceiptImageId}
        error={receiptModalError}
        pendingFiles={receiptModalRequestId !== null ? (pendingReceiptUploads[receiptModalRequestId] ?? []) : []}
        previewId={receiptPreviewId}
        setPreviewId={setReceiptPreviewId}
        handleUpload={(files) => {
          if (receiptModalRequestId !== null) void handleUploadReceipt(receiptModalRequestId, files);
        }}
        handleRemovePending={(index) => {
          if (receiptModalRequestId !== null) handleRemovePendingReceipt(receiptModalRequestId, index);
        }}
        handleDelete={handleDeleteReceiptImage}
        onConfirm={async () => {
          if (receiptModalRequestId === null) return;
          if (!isStaff) return;
          const ok = await handleConfirmReceiptUpload(receiptModalRequestId);
          if (ok) handleCloseReceiptModal();
        }}
        onClose={handleCloseReceiptModal}
        isReadOnly={isClient}
      />

      {mobileFilterOpen && (
        <div
          className="request-mobile-filter-backdrop"
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            className="request-mobile-filter-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="배차내역 필터"
          >
            <div className="request-mobile-filter-header">
              <h3>필터</h3>
              <button
                type="button"
                className="request-mobile-filter-close"
                onClick={() => setMobileFilterOpen(false)}
                aria-label="닫기"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="request-mobile-filter-body">
              <div className="request-mobile-filter-field">
                <div className="request-mobile-filter-label">날짜 검색 기준</div>
                <select
                  className="request-mobile-filter-select"
                  value={mobileFilterDraft.dateSearchType}
                  onChange={(e) =>
                    setMobileFilterDraft((prev) => ({
                      ...prev,
                      dateSearchType: e.target.value as "RECEIVED_DATE" | "PICKUP_DATE",
                    }))
                  }
                >
                  <option value="RECEIVED_DATE">접수일</option>
                  <option value="PICKUP_DATE">상차일</option>
                </select>
              </div>

              <div className="request-mobile-filter-field">
                <div className="request-mobile-filter-label">기간</div>
                <div className="request-mobile-filter-daterange">
                  <input
                    type="date"
                    value={mobileFilterDraft.fromDate}
                    onChange={(e) => {
                      const newFrom = e.target.value;
                      setMobileFilterDraft((prev) => ({
                        ...prev,
                        fromDate: newFrom,
                        toDate: newFrom > prev.toDate ? newFrom : prev.toDate,
                      }));
                    }}
                  />
                  <span className="request-mobile-filter-daterange-sep">~</span>
                  <input
                    type="date"
                    value={mobileFilterDraft.toDate}
                    onChange={(e) =>
                      setMobileFilterDraft((prev) => ({
                        ...prev,
                        toDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="request-mobile-filter-field">
                <div className="request-mobile-filter-label">출발지명</div>
                <input
                  className="request-mobile-filter-text"
                  type="text"
                  placeholder="출발지명 입력"
                  value={mobileFilterDraft.pickupKeyword}
                  onChange={(e) =>
                    setMobileFilterDraft((prev) => ({
                      ...prev,
                      pickupKeyword: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="request-mobile-filter-field">
                <div className="request-mobile-filter-label">도착지명</div>
                <input
                  className="request-mobile-filter-text"
                  type="text"
                  placeholder="도착지명 입력"
                  value={mobileFilterDraft.dropoffKeyword}
                  onChange={(e) =>
                    setMobileFilterDraft((prev) => ({
                      ...prev,
                      dropoffKeyword: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="request-mobile-filter-field">
                <div className="request-mobile-filter-label">상태</div>
                <div className="request-mobile-filter-statuslist">
                  {MOBILE_STATUS_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`request-mobile-filter-status-pill${
                        mobileFilterDraft.statusFilter === tab.value ? " is-active" : ""
                      }`}
                      onClick={() =>
                        setMobileFilterDraft((prev) => ({
                          ...prev,
                          statusFilter: tab.value,
                        }))
                      }
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="request-mobile-filter-footer">
              <button
                type="button"
                className="request-mobile-filter-reset"
                onClick={resetMobileFilter}
              >
                초기화
              </button>
              <button
                type="button"
                className="request-mobile-filter-apply"
                onClick={applyMobileFilter}
              >
                <Search size={18} aria-hidden="true" />
                적용
              </button>
            </div>
          </div>
        </div>
      )}

      {companyFilterOpen && (
        <div
          className="list-company-filter-backdrop"
          onClick={() => setCompanyFilterOpen(false)}
        >
          <div
            className="list-company-filter-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="list-company-filter-modal-header">
              <div>
                <div className="list-company-filter-modal-eyebrow">배차내역 검색</div>
                <h3>업체 검색</h3>
              </div>
              <button
                type="button"
                className="list-company-filter-close"
                onClick={() => setCompanyFilterOpen(false)}
                aria-label="업체 검색 닫기"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <label className="list-company-filter-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="text"
                value={companySearchText}
                onChange={(event) => setCompanySearchText(event.target.value)}
                placeholder="업체명을 검색하세요"
                autoFocus
              />
            </label>

            <div className="list-company-filter-actions">
              <button
                type="button"
                className="list-company-filter-clear"
                onClick={clearCompanyFilter}
              >
                전체 보기
              </button>
            </div>

            <div className="list-company-filter-list">
              {companyOptionsLoading ? (
                <div className="list-company-filter-empty">업체 목록을 불러오는 중입니다.</div>
              ) : companyOptionsError ? (
                <div className="list-company-filter-empty">{companyOptionsError}</div>
              ) : filteredCompanies.length === 0 ? (
                <div className="list-company-filter-empty">검색 결과가 없습니다.</div>
              ) : (
                filteredCompanies.map((company) => (
                  <button
                    key={company.id}
                    type="button"
                    className={`list-company-filter-item${companyKeyword === company.name ? " is-selected" : ""}`}
                    onClick={() => applyCompanyFilter(company.name)}
                  >
                    <span>{company.name}</span>
                    {companyKeyword === company.name && (
                      <span className="list-company-filter-item-badge">선택됨</span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
