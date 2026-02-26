// src/components/RequestDetailModal.tsx
import type { MutableRefObject } from "react";
import type { RequestDetail } from "../api/types";
import type { AppSendResult } from "../hooks/useRequestList";

type Props = {
  detailOpen: boolean;
  detailItem: RequestDetail | null;
  detailLoading: boolean;
  detailError: string | null;
  appSending: "APP1" | "APP2" | null;
  appSendResult: AppSendResult | null;
  cargoInputRef: MutableRefObject<HTMLInputElement | null>;
  uploadingCargoId: number | null;
  isStaff: boolean;
  handleCloseDetail: () => void;
  handleSendToApp: (target: "APP1" | "APP2") => void;
  handleUploadCargo: (requestId: number, files: FileList | null) => Promise<void>;
  handleOpenImageViewer: (
    requestId: number,
    options?: { kind?: "all" | "receipt"; title?: string }
  ) => Promise<void>;
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
  uploadingCargoId,
  isStaff,
  handleCloseDetail,
  handleSendToApp,
  handleUploadCargo,
  handleOpenImageViewer,
  formatDate,
  formatStatus,
  formatReservedDateTime,
}: Props) {
  if (!detailOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={handleCloseDetail}
    >
      <div
        style={{
          width: 600,
          maxHeight: "80vh",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          padding: 16,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>배차요청 상세</h2>
            <button
              type="button"
              title="앱1 전송"
              aria-label="앱1 전송"
              onClick={() => void handleSendToApp("APP1")}
              disabled={!detailItem || !!appSending}
              style={{
                border: "1px solid #d4d4d4",
                background: "#fff",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {appSending === "APP1" ? "전송중..." : "앱1"}
            </button>
            <button
              type="button"
              title="앱2 전송"
              aria-label="앱2 전송"
              onClick={() => void handleSendToApp("APP2")}
              disabled={!detailItem || !!appSending}
              style={{
                border: "1px solid #d4d4d4",
                background: "#fff",
                borderRadius: 4,
                padding: "6px 10px",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {appSending === "APP2" ? "전송중..." : "앱2"}
            </button>
          </div>
          <button type="button" onClick={handleCloseDetail}>
            닫기
          </button>
        </div>

        {appSendResult && (
          <div
            style={{
              marginBottom: 10,
              border: `1px solid ${appSendResult.success ? "#c5dfc5" : "#ecc7c7"}`,
              background: appSendResult.success ? "#f3fbf3" : "#fff4f4",
              color: appSendResult.success ? "#2f6a2f" : "#a24545",
              borderRadius: 6,
              padding: "8px 10px",
              fontSize: 12,
            }}
          >
            <div>{appSendResult.message}</div>
            {appSendResult.externalRequestId && (
              <div style={{ marginTop: 2 }}>
                외부 접수번호: {appSendResult.externalRequestId}
              </div>
            )}
            {appSendResult.payload && (
              <pre
                style={{
                  marginTop: 8,
                  marginBottom: 0,
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.7)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  borderRadius: 4,
                  color: "#333",
                  fontSize: 11,
                  lineHeight: 1.45,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                  maxHeight: 220,
                  overflow: "auto",
                }}
              >
                {JSON.stringify(appSendResult.payload, null, 2)}
              </pre>
            )}
          </div>
        )}

        {detailLoading && <p>상세 정보를 불러오는 중...</p>}
        {detailError && null}

        {detailItem && !detailLoading && !detailError && (
          <div style={{ fontSize: 13, lineHeight: 1.6 }}>
            {/* 기본 정보 */}
            <section style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                기본 정보
              </h3>
              <div>ID: {detailItem.id}</div>
              <div>상태: {formatStatus(detailItem.status)}</div>
              <div>
                요청일시: {formatDate(detailItem.createdAt)}
              </div>
            </section>

            {/* 출발지 */}
            <section style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                출발지
              </h3>
              <div>출발지명: {detailItem.pickupPlaceName}</div>
              <div>주소: {detailItem.pickupAddress}</div>
              {detailItem.pickupAddressDetail && (
                <div>
                  상세주소: {detailItem.pickupAddressDetail}
                </div>
              )}
              {detailItem.pickupContactName && (
                <div>
                  담당자: {detailItem.pickupContactName}
                </div>
              )}
              {detailItem.pickupContactPhone && (
                <div>
                  연락처: {detailItem.pickupContactPhone}
                </div>
              )}
              <div>상차방법: {detailItem.pickupMethod}</div>
              <div>
                바로상차:{" "}
                {detailItem.pickupIsImmediate ? "예" : "아니오"}
              </div>
              {!detailItem.pickupIsImmediate && detailItem.pickupDatetime && (
                <div>
                  상차예약시간: {formatReservedDateTime(detailItem.pickupDatetime)}
                </div>
              )}
            </section>

            {/* 도착지 */}
            <section style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                도착지
              </h3>
              <div>도착지명: {detailItem.dropoffPlaceName}</div>
              <div>주소: {detailItem.dropoffAddress}</div>
              {detailItem.dropoffAddressDetail && (
                <div>
                  상세주소: {detailItem.dropoffAddressDetail}
                </div>
              )}
              {detailItem.dropoffContactName && (
                <div>
                  담당자: {detailItem.dropoffContactName}
                </div>
              )}
              {detailItem.dropoffContactPhone && (
                <div>
                  연락처: {detailItem.dropoffContactPhone}
                </div>
              )}
              <div>하차방법: {detailItem.dropoffMethod}</div>
              <div>
                바로하차:{" "}
                {detailItem.dropoffIsImmediate ? "예" : "아니오"}
              </div>
              {!detailItem.dropoffIsImmediate && detailItem.dropoffDatetime && (
                <div>
                  하차예약시간: {formatReservedDateTime(detailItem.dropoffDatetime)}
                </div>
              )}
            </section>

            {/* 차량 / 화물 */}
            <section style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                차량 / 화물
              </h3>
              <div>
                차량그룹: {detailItem.vehicleGroup ?? "-"}
              </div>
              <div>
                차량톤수:{" "}
                {detailItem.vehicleTonnage != null
                  ? `${detailItem.vehicleTonnage}톤`
                  : "-"}
              </div>
              <div>
                차량타입: {detailItem.vehicleBodyType ?? "-"}
              </div>
              <div>
                화물내용: {detailItem.cargoDescription ?? "-"}
              </div>
            </section>

            {/* 요청 / 결제 */}
            <section style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                요청 / 결제
              </h3>
              <div>
                요청유형: {detailItem.requestType}
              </div>
              <div>
                결제방법: {detailItem.paymentMethod ?? "-"}
              </div>
              <div>
                거리(km):{" "}
                {detailItem.distanceKm != null
                  ? detailItem.distanceKm
                  : "-"}
              </div>
              {isStaff && (
                <>
                  <div>
                    실운임:{" "}
                    {detailItem.actualFare != null
                      ? `₩${detailItem.actualFare.toLocaleString()}`
                      : "-"}
                  </div>
                  <div>
                    청구가★:{" "}
                    {detailItem.billingPrice != null
                      ? `₩${detailItem.billingPrice.toLocaleString()}`
                      : "-"}
                  </div>
                </>
              )}
              <div>
                기사요청사항: {detailItem.driverNote ?? "-"}
              </div>
            </section>

            {/* 화물 이미지 */}
            <section style={{ marginBottom: 12 }}>
              <h3 style={{ margin: "4px 0 8px", fontSize: 14 }}>화물 이미지</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  ref={cargoInputRef}
                  onChange={(e) => {
                    if (detailItem) void handleUploadCargo(detailItem.id, e.target.files);
                  }}
                />
                <button
                  type="button"
                  style={{ fontSize: 13, padding: "4px 10px", cursor: "pointer", borderRadius: 4, border: "1px solid #d4d4d4", background: "#fff" }}
                  onClick={() => cargoInputRef.current?.click()}
                  disabled={uploadingCargoId === detailItem.id}
                >
                  {uploadingCargoId === detailItem.id ? "업로드 중..." : "화물 이미지 업로드"}
                </button>
                {(detailItem.images?.filter(img => img.kind !== "receipt").length ?? 0) > 0 && (
                  <button
                    type="button"
                    style={{ fontSize: 13, padding: "4px 10px", cursor: "pointer", borderRadius: 4, border: "1px solid #d4d4d4", background: "#fff" }}
                    onClick={() => void handleOpenImageViewer(detailItem.id)}
                  >
                    화물 이미지 보기 ({detailItem.images?.filter(img => img.kind !== "receipt").length ?? 0}장)
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
