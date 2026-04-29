import { useEffect, useState } from "react";
import { getRequestTracking } from "../api/tracking";
import type { DispatchTrackingDto, DispatchTrackingStatus } from "../api/types";
import { DispatchTrackingMap } from "./DispatchTrackingMap";

type Props = {
  requestId: number;
  open: boolean;
  onClose: () => void;
  refreshMs?: number;
  platform?: "mock" | "hwamul24" | "insung";
};

const STATUS_LABELS: Record<DispatchTrackingStatus, string> = {
  RECEIVED: "접수",
  DISPATCHING: "배차중",
  DISPATCHED: "배차완료",
  IN_TRANSIT: "운행중",
  ARRIVED: "도착",
  COMPLETED: "완료",
  CANCELLED: "취소",
  UNKNOWN: "상태미상",
};

function formatDateTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ko-KR");
}

function coordLabel(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return "-";
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

export function DispatchTrackingModal({ requestId, open, onClose, refreshMs = 30_000, platform }: Props) {
  const [tracking, setTracking] = useState<DispatchTrackingDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{
    target: "pickup" | "dropoff" | "driver";
    nonce: number;
  } | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getRequestTracking(requestId, { provider: platform });
      setTracking(data);
      setLastLoadedAt(new Date().toISOString());
    } catch (err: any) {
      setError(err?.message ?? "위치 정보를 불러오지 못했습니다.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void load(false);
    const timer = window.setInterval(() => {
      void load(true);
    }, refreshMs);
    return () => window.clearInterval(timer);
  }, [open, requestId, refreshMs]);

  const statusLabel = tracking ? STATUS_LABELS[tracking.dispatchStatus] : "조회중";

  if (!open) return null;

  return (
    <div className="rdm-confirm-backdrop" style={{ zIndex: 1700 }} onClick={onClose}>
      <div className="tracking-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tracking-modal-header">
          <div>
            <p className="tracking-kicker">실시간 위치</p>
            <h3 className="tracking-title">배차 지도</h3>
          </div>
          <button type="button" className="rdm-close-btn" onClick={onClose} aria-label="닫기">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {loading && <p className="tracking-state">위치 정보를 불러오는 중...</p>}
        {error && <p className="tracking-state tracking-state-error">{error}</p>}

        {!loading && !error && tracking && (
          <>
            <div className="tracking-summary">
              <span className={`tracking-status tracking-status-${tracking.dispatchStatus}`}>{statusLabel}</span>
              <span>공급자: {tracking.provider}</span>
              <span>조회: {formatDateTime(lastLoadedAt)}</span>
            </div>

            <DispatchTrackingMap tracking={tracking} focusRequest={focusRequest} />

            <div className="tracking-grid">
              <section
                className={`tracking-card${tracking.hasLocation ? " tracking-card-clickable" : ""}`}
                role={tracking.hasLocation ? "button" : undefined}
                tabIndex={tracking.hasLocation ? 0 : undefined}
                onClick={() => {
                  if (!tracking.hasLocation) return;
                  setFocusRequest({ target: "driver", nonce: Date.now() });
                }}
                onKeyDown={(event) => {
                  if (!tracking.hasLocation) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFocusRequest({ target: "driver", nonce: Date.now() });
                  }
                }}
              >
                <span className="tracking-card-label">기사</span>
                {tracking.hasDriverInfo ? (
                  <>
                    <strong>{tracking.driverName ?? "-"}</strong>
                    <p>{tracking.driverPhone ?? "-"} · {tracking.carNumber ?? "-"}</p>
                    <p>{tracking.carTon ?? "-"} / {tracking.carType ?? "-"}</p>
                  </>
                ) : (
                  <p>미배차 상태입니다.</p>
                )}
              </section>

              <section
                className={`tracking-card${tracking.hasLocation ? " tracking-card-clickable" : ""}`}
                role={tracking.hasLocation ? "button" : undefined}
                tabIndex={tracking.hasLocation ? 0 : undefined}
                onClick={() => {
                  if (!tracking.hasLocation) return;
                  setFocusRequest({ target: "driver", nonce: Date.now() });
                }}
                onKeyDown={(event) => {
                  if (!tracking.hasLocation) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFocusRequest({ target: "driver", nonce: Date.now() });
                  }
                }}
              >
                <span className="tracking-card-label">현재 위치</span>
                {tracking.hasLocation ? (
                  <>
                    <strong>{tracking.currentAddress ?? "기사 위치"}</strong>
                    <p>{coordLabel(tracking.currentLat, tracking.currentLng)}</p>
                    <p>갱신: {formatDateTime(tracking.locationUpdatedAt)}</p>
                  </>
                ) : (
                  <p>위치 정보 없음</p>
                )}
              </section>
            </div>

            <div className="tracking-route-list">
              <div
                className={tracking.pickupLat != null && tracking.pickupLng != null ? "tracking-route-item-clickable" : ""}
                role={tracking.pickupLat != null && tracking.pickupLng != null ? "button" : undefined}
                tabIndex={tracking.pickupLat != null && tracking.pickupLng != null ? 0 : undefined}
                onClick={() => {
                  if (tracking.pickupLat == null || tracking.pickupLng == null) return;
                  setFocusRequest({ target: "pickup", nonce: Date.now() });
                }}
                onKeyDown={(event) => {
                  if (tracking.pickupLat == null || tracking.pickupLng == null) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFocusRequest({ target: "pickup", nonce: Date.now() });
                  }
                }}
              >
                <span className="tracking-dot tracking-dot-pickup" />
                <strong>{tracking.pickupName ?? "상차지"}</strong>
                <p>{tracking.pickupAddress ?? "상차지 주소 없음"}</p>
              </div>
              <div
                className={tracking.dropoffLat != null && tracking.dropoffLng != null ? "tracking-route-item-clickable" : ""}
                role={tracking.dropoffLat != null && tracking.dropoffLng != null ? "button" : undefined}
                tabIndex={tracking.dropoffLat != null && tracking.dropoffLng != null ? 0 : undefined}
                onClick={() => {
                  if (tracking.dropoffLat == null || tracking.dropoffLng == null) return;
                  setFocusRequest({ target: "dropoff", nonce: Date.now() });
                }}
                onKeyDown={(event) => {
                  if (tracking.dropoffLat == null || tracking.dropoffLng == null) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setFocusRequest({ target: "dropoff", nonce: Date.now() });
                  }
                }}
              >
                <span className="tracking-dot tracking-dot-dropoff" />
                <strong>{tracking.dropoffName ?? "하차지"}</strong>
                <p>{tracking.dropoffAddress ?? "하차지 주소 없음"}</p>
              </div>
            </div>

            {tracking.message && <p className="tracking-message">{tracking.message}</p>}
          </>
        )}
      </div>
    </div>
  );
}
