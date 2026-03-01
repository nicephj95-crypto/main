// src/RequestList.tsx
import { ExcelIcon, SearchIcon } from "./ui/icons";
import type { AuthUser } from "./LoginPanel";
import { useRequestList } from "./hooks/useRequestList";
import { RequestDetailModal } from "./components/RequestDetailModal";
import { RequestAssignModal } from "./components/RequestAssignModal";
import { RequestImageViewer } from "./components/RequestImageViewer";
import { ReceiptImageModal } from "./components/ReceiptImageModal";
import { exportRequestListExcel } from "./api/client";

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
  reloadTrigger?: number;
};

export function RequestList({
  currentUser,
  onReplayToRequestForm,
  reloadTrigger,
}: RequestListProps) {
  const {
    isStaff,
    loading,
    error,
    detailMap,
    filteredItems,
    total,
    statusCount,
    statusTotal,
    statusFilter,
    setStatusFilter,
    exportingExcel,
    setExportingExcel,
    openStatusMenuId,
    setOpenStatusMenuId,
    changingStatusKey,
    fromDate,
    setFromDate,
    toDate,
    setToDate,
    pickupKeyword,
    setPickupKeyword,
    dropoffKeyword,
    setDropoffKeyword,
    page,
    setPage,
    pageSize,
    setPageSize,
    pageJumpInput,
    setPageJumpInput,
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
    assignDeleting,
    assignForm,
    setAssignForm,
    hasCurrentAssignment,
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
  } = useRequestList(currentUser, onReplayToRequestForm, reloadTrigger);

  return (
    <div className="table-page">
      <div className="table-page-toolbar">
        <div className="toolbar-left">
          <div className="list-pill list-date-range">
            <input
              className="pill-input"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <span className="list-sep">~</span>
            <input
              className="pill-input"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="list-pill list-locations">
            <input
              className="pill-input"
              type="text"
              placeholder="출발지명"
              value={pickupKeyword}
              onChange={(e) => setPickupKeyword(e.target.value)}
            />
            <span className="list-arrow">›</span>
            <input
              className="pill-input"
              type="text"
              placeholder="도착지명"
              value={dropoffKeyword}
              onChange={(e) => setDropoffKeyword(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="round-icon-btn list-search-btn"
            onClick={() => setPage(1)}
            aria-label="검색"
          >
            <SearchIcon />
          </button>
          <button
            type="button"
            className="list-reset-btn"
            onClick={() => {
              const d = new Date();
              const to = formatLocalYmd(d);
              d.setDate(d.getDate() - 7);
              const from = formatLocalYmd(d);
              setFromDate(from);
              setToDate(to);
              setPickupKeyword("");
              setDropoffKeyword("");
              setPage(1);
            }}
          >
            초기화
          </button>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-tabs">
          <button
            className={`status-tab ${statusFilter === "ALL" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("ALL");
              setPage(1);
            }}
          >
            <span className="status-label">전체</span>
            <span className="status-count">{statusTotal}건</span>
          </button>
          <button
            className={`status-tab ${statusFilter === "PENDING" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("PENDING");
              setPage(1);
            }}
          >
            <span className="status-label">접수중</span>
            <span className="status-count">{statusCount.PENDING}건</span>
          </button>
          <button
            className={`status-tab ${statusFilter === "DISPATCHING" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("DISPATCHING");
              setPage(1);
            }}
          >
            <span className="status-label">배차중</span>
            <span className="status-count">{statusCount.DISPATCHING}건</span>
          </button>
          <button
            className={`status-tab ${statusFilter === "ASSIGNED" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("ASSIGNED");
              setPage(1);
            }}
          >
            <span className="status-label">배차완료</span>
            <span className="status-count">{statusCount.ASSIGNED}건</span>
          </button>
          <button
            className={`status-tab ${statusFilter === "COMPLETED" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("COMPLETED");
              setPage(1);
            }}
          >
            <span className="status-label">완료</span>
            <span className="status-count">{statusCount.COMPLETED}건</span>
          </button>
          <button
            className={`status-tab ${statusFilter === "CANCELLED" ? "active" : ""}`}
            onClick={() => {
              setStatusFilter("CANCELLED");
              setPage(1);
            }}
          >
            <span className="status-label">취소</span>
            <span className="status-count">{statusCount.CANCELLED}건</span>
          </button>
        </div>

        <div className="status-actions">
          <select
            className="pill-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10개씩 보기</option>
            <option value={20}>20개씩 보기</option>
            <option value={30}>30개씩 보기</option>
            <option value={50}>50개씩 보기</option>
          </select>
          <button
            type="button"
            className="excel-btn"
            aria-label="엑셀 다운로드"
            title="엑셀 다운로드"
            disabled={exportingExcel}
            onClick={async () => {
              try {
                setExportingExcel(true);
                await exportRequestListExcel({
                  status: statusFilter,
                  from: fromDate || undefined,
                  to: toDate || undefined,
                  pickupKeyword,
                  dropoffKeyword,
                });
              } catch (err: any) {
                alert(
                  err?.message || "배차내역 엑셀 다운로드 중 오류가 발생했습니다."
                );
              } finally {
                setExportingExcel(false);
              }
            }}
          >
            <ExcelIcon />
          </button>
        </div>
      </div>

      {/* 초기 로딩만 표시 - 데이터 있는 상태에서 백그라운드 갱신 시엔 숨김(깜빡임 방지) */}
      {loading && filteredItems.length === 0 && <p>불러오는 중...</p>}
      {!loading && !error && total === 0 && (
        <p>배차내역이 없습니다. 위에서 폼으로 몇 건 만들어보세요.</p>
      )}

      {!loading && !error && total > 0 && filteredItems.length === 0 && (
        <p>검색 조건에 맞는 배차내역이 없습니다.</p>
      )}

      {!error && filteredItems.length > 0 && (
        <div className="table-page-results">
          <table className="grid-table">
            <colgroup>
              <col style={{ width: 108 }} />
              <col style={{ width: 112 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 74 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 120 }} />
              <col style={{ width: 92 }} />
            </colgroup>
            <thead>
              <tr>
                <th>접수일시</th>
                <th>접수자</th>
                <th>출발지</th>
                <th>도착지</th>
                <th>차량</th>
                <th>특이사항</th>
                <th>배차정보</th>
                <th>기타</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((r) => {
                const d = detailMap[r.id];
                const pickupLines = [
                  d?.pickupPlaceName ?? r.pickupPlaceName,
                  d?.pickupContactPhone ?? r.pickupContactPhone ?? "",
                  d?.pickupAddress ?? r.pickupAddress ?? "",
                  d?.pickupAddressDetail ?? r.pickupAddressDetail ?? "",
                ].filter(Boolean);
                const dropoffLines = [
                  d?.dropoffPlaceName ?? r.dropoffPlaceName,
                  d?.dropoffContactPhone ?? r.dropoffContactPhone ?? "",
                  d?.dropoffAddress ?? r.dropoffAddress ?? "",
                  d?.dropoffAddressDetail ?? r.dropoffAddressDetail ?? "",
                ].filter(Boolean);

                const vehicleLine1 = d?.vehicleTonnage != null
                  ? `${d.vehicleTonnage}톤`
                  : r.vehicleTonnage != null
                  ? `${r.vehicleTonnage}톤`
                  : "-";
                const vehicleLine2 = d?.vehicleBodyType || r.vehicleBodyType || "-";
                const actualFareText = d?.actualFare != null
                  ? `₩${d.actualFare.toLocaleString()}`
                  : r.actualFare != null
                  ? `₩${r.actualFare.toLocaleString()}`
                  : "-";
                const billingPriceText = d?.billingPrice != null
                  ? `₩${d.billingPrice.toLocaleString()}`
                  : r.billingPrice != null
                  ? `₩${r.billingPrice.toLocaleString()}`
                  : "-";
                const hasReceiptImage =
                  d?.images?.some((img) => img.kind === "receipt") ?? r.hasReceiptImage ?? false;

                const requestTypeValue = d?.requestType ?? r.requestType;
                const reqTypeLabel =
                  requestTypeValue === "NORMAL"
                    ? "기본"
                    : requestTypeValue === "URGENT"
                    ? "긴급"
                    : requestTypeValue === "DIRECT"
                    ? "혼적"
                    : requestTypeValue === "ROUND_TRIP"
                    ? "왕복"
                    : "-";

                const specialPrimary =
                  d?.driverNote?.trim() ||
                  r.driverNote?.trim() ||
                  d?.cargoDescription?.trim() ||
                  r.cargoDescription?.trim() ||
                  "";
                const specialNote =
                  requestTypeValue && requestTypeValue !== "NORMAL" ? reqTypeLabel : "";

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
                    <td>{formatDate(d?.createdAt ?? r.createdAt)}</td>
                    <td>
                      <div className="list-cell">
                        <div className="list-cell-title">
                          {d?.createdBy?.companyName || r.createdByCompany || "-"}
                        </div>
                        <div className="list-cell-sub">
                          {d?.createdBy?.name || r.createdByName || "-"}
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <div className="list-cell list-cell-left">
                        <div className="list-cell-title">{pickupLines[0]}</div>
                        {pickupLines.slice(1).map((t, idx) => (
                          <div key={idx} className="list-cell-sub">{t}</div>
                        ))}
                      </div>
                    </td>
                    <td style={{ textAlign: "left" }}>
                      <div className="list-cell list-cell-left">
                        <div className="list-cell-title">{dropoffLines[0]}</div>
                        {dropoffLines.slice(1).map((t, idx) => (
                          <div key={idx} className="list-cell-sub">{t}</div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className="list-cell">
                        <div className="list-cell-title">{vehicleLine1}</div>
                        <div className="list-cell-sub">{vehicleLine2}</div>
                        {isStaff && (
                          <div className="list-cell-sub">
                            실운임 {actualFareText} / 청구 {billingPriceText}
                          </div>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: "center", verticalAlign: "middle" }}>
                      <div className="list-special-cell list-special-cell-center">{specialPrimary}</div>
                      {specialNote && (
                        <div className="list-cell-sub list-cell-sub-center" style={{ marginTop: 2 }}>
                          {specialNote}
                        </div>
                      )}
                    </td>
                    <td>
                      <div
                        className={`list-cell ${isStaff ? "list-assign-cell-btn" : ""}`}
                        role={isStaff ? "button" : undefined}
                        tabIndex={isStaff ? 0 : undefined}
                        onClick={
                          isStaff
                            ? (e) => {
                                e.stopPropagation();
                                handleOpenAssignModal(r.id);
                              }
                            : undefined
                        }
                        onKeyDown={
                          isStaff
                            ? (e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleOpenAssignModal(r.id);
                                }
                              }
                            : undefined
                        }
                        title={isStaff ? "배차정보 입력" : undefined}
                      >
                        <div className="list-cell-title">
                          {d?.assignments?.[0]?.driver?.name || r.driverName || "-"}
                        </div>
                        <div className="list-cell-sub">
                          {d?.assignments?.[0]?.driver?.phone || r.driverPhone || "-"}
                          <br />
                          {d?.assignments?.[0]?.driver?.vehicleNumber || r.driverVehicleNumber || "-"}
                          <br />
                          {d?.assignments?.[0]?.driver?.vehicleTonnage != null
                            ? `${d.assignments[0].driver.vehicleTonnage}톤`
                            : r.driverVehicleTonnage != null
                            ? `${r.driverVehicleTonnage}톤`
                            : "-"}
                          {"/"}
                          {d?.assignments?.[0]?.driver?.vehicleBodyType || r.driverVehicleBodyType || "-"}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="list-other">
                        {getStatusActions(r.status).length > 0 ? (
                          <div
                            className="list-status-menu-wrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={`list-status-chip ${r.status} list-status-chip-btn`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenStatusMenuId((prev) => (prev === r.id ? null : r.id));
                              }}
                            >
                              {formatStatus(r.status)}
                            </button>
                            {openStatusMenuId === r.id && (
                              <div className="list-status-popover">
                                {getStatusActions(r.status).map((action) => {
                                  const key = `${r.id}:${action.next}`;
                                  return (
                                    <button
                                      key={`${action.label}-${action.next}`}
                                      type="button"
                                      className={`list-status-chip ${action.next} list-status-menu-item`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleChangeStatus(r.id, action.next);
                                      }}
                                      disabled={changingStatusKey === key}
                                    >
                                      {changingStatusKey === key ? "..." : action.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className={`list-status-chip ${r.status}`}>
                            {formatStatus(r.status)}
                          </span>
                        )}
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
                            aria-label="배차접수로 다시 넣기"
                            title="배차접수로 다시 넣기"
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

          <div className="pagination-line">
            <div className="pager-stack">
              <div className="pager-row">
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
              <div className="pager-jump-row">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageJumpInput}
                  onChange={(e) => setPageJumpInput(e.target.value)}
                  className="pager-jump-input"
                  aria-label="페이지 번호 입력"
                />
                <span className="pager-jump-total">/ {totalPages}</span>
                <button
                  type="button"
                  className="pager-jump-btn"
                  onClick={() => {
                    const n = Number(pageJumpInput);
                    if (!Number.isFinite(n)) return;
                    setPage(Math.min(totalPages, Math.max(1, Math.trunc(n))));
                  }}
                >
                  이동
                </button>
              </div>
            </div>
          </div>
        </div>
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
        uploadingCargoId={uploadingCargoId}
        isStaff={isStaff}
        handleCloseDetail={handleCloseDetail}
        handleSendToApp={handleSendToApp}
        handleUploadCargo={handleUploadCargo}
        handleOpenImageViewer={handleOpenImageViewer}
        formatDate={formatDate}
        formatStatus={formatStatus}
        formatReservedDateTime={formatReservedDateTime}
      />

      <RequestAssignModal
        assignModalOpen={assignModalOpen}
        assignTargetId={assignTargetId}
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        assignSaving={assignSaving}
        assignDeleting={assignDeleting}
        hasCurrentAssignment={hasCurrentAssignment}
        handleCloseAssignModal={handleCloseAssignModal}
        handleSaveAssignment={handleSaveAssignment}
        handleDeleteAssignment={handleDeleteAssignment}
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
          if (isStaff) {
            await handleChangeStatus(receiptModalRequestId, "COMPLETED");
          }
          handleCloseReceiptModal();
        }}
        onClose={handleCloseReceiptModal}
      />
    </div>
  );
}
