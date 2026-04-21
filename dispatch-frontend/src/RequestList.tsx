// src/RequestList.tsx
import type { AuthUser } from "./LoginPanel";
import { useRequestList } from "./hooks/useRequestList";
import { RequestDetailModal } from "./components/RequestDetailModal";
import { RequestAssignModal } from "./components/RequestAssignModal";
import { getVehicleDisplayParts } from "./utils/vehicleCatalog";
import { RequestImageViewer } from "./components/RequestImageViewer";
import { ReceiptImageModal } from "./components/ReceiptImageModal";
import { exportRequestListExcel } from "./api/client";
import { RequestListControls } from "./components/request-list/RequestListControls";

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
            });
          } catch (err: any) {
            alert(
              err?.message || "배차내역 엑셀 다운로드 중 오류가 발생했습니다."
            );
          }
        }}
      />

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
        <div className="table-page-results">
          <table className="grid-table">
            <colgroup>
              <col style={{ width: 128 }} />
              <col style={{ width: 150 }} />
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
                <th>접수자</th>
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
                const displayedOrderNumber = d?.orderNumber ?? r.orderNumber ?? "";

                // 출발지/도착지 정보
                const pickupPlaceName = d?.pickupPlaceName ?? r.pickupPlaceName;
                const pickupPhone = d?.pickupContactPhone ?? r.pickupContactPhone ?? "";
                const pickupAddr = [
                  d?.pickupAddress ?? r.pickupAddress ?? "",
                  d?.pickupAddressDetail ?? r.pickupAddressDetail ?? "",
                ].filter(s => s !== "").join(" ");

                const dropoffPlaceName = d?.dropoffPlaceName ?? r.dropoffPlaceName;
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
                    {/* 접수/상차일시: #id + 날짜 + 오더번호(표시 전용) */}
                    <td>
                      <div className="list-cell">
                        <span className="list-order-id">#{r.id}</span>
                        {displayedOrderNumber.trim() ? (
                          <div className="list-order-number-display" title={displayedOrderNumber}>
                            {displayedOrderNumber}
                          </div>
                        ) : (
                          <div className="list-order-number-display list-order-number-display-empty">
                            오더번호 없음
                          </div>
                        )}
                        <div className="list-cell-date">{formatDate(primaryListDate).replace("\n", " ")}</div>
                      </div>
                    </td>

                    {/* 접수자: 회사명 + 담당자명 */}
                    <td>
                      <div className="list-cell">
                        <div className="list-cell-title">
                          {d?.ownerCompany?.name || r.ownerCompanyName || r.createdByCompany || "-"}
                        </div>
                        <div className="list-cell-sub">
                          {d?.createdBy?.name || r.createdByName || "-"}
                        </div>
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
                        {pickupPhone && <div className="list-cell-sub">{pickupPhone}</div>}
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
                        {dropoffPhone && <div className="list-cell-sub">{dropoffPhone}</div>}
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
                      {isStaff && (actualFare != null || billingPrice != null || extraFare != null) ? (
                        <div className="list-fare-cell">
                          {actualFare != null && (
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
                          {extraFare != null && (
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
                          {(isStaff || r.status === "PENDING") && (
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
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

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
        assignForm={assignForm}
        setAssignForm={setAssignForm}
        assignSaving={assignSaving}
        assignDeleting={assignDeleting}
        hasCurrentAssignment={hasCurrentAssignment}
        isStaff={isStaff}
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
          if (isStaff) {
            await handleChangeStatus(receiptModalRequestId, "COMPLETED");
          }
          handleCloseReceiptModal();
        }}
        onClose={handleCloseReceiptModal}
        isReadOnly={isClient}
      />
    </div>
  );
}
