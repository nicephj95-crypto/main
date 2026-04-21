import { useEffect, useMemo, useState } from "react";
import { getRequestTracking } from "../api/tracking";
import type { DispatchTrackingDto, DispatchTrackingStatus } from "../api/types";

type Props = {
  requestId: number;
  open: boolean;
  onClose: () => void;
  refreshMs?: number;
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

function pointStyle(lat: number | null, lng: number | null, fallback: { x: number; y: number }) {
  if (lat == null || lng == null) {
    return { left: `${fallback.x}%`, top: `${fallback.y}%` };
  }
  const x = 12 + Math.abs(lng * 31) % 76;
  const y = 14 + Math.abs(lat * 29) % 70;
  return { left: `${x}%`, top: `${y}%` };
}

export function DispatchTrackingModal({ requestId, open, onClose, refreshMs = 30_000 }: Props) {
  const [tracking, setTracking] = useState<DispatchTrackingDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await getRequestTracking(requestId, { provider: "mock" });
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
  const mapPoints = useMemo(() => {
    if (!tracking) return null;
    return {
      pickup: pointStyle(tracking.pickupLat, tracking.pickupLng, { x: 18, y: 68 }),
      dropoff: pointStyle(tracking.dropoffLat, tracking.dropoffLng, { x: 78, y: 28 }),
      driver: pointStyle(tracking.currentLat, tracking.currentLng, { x: 48, y: 48 }),
    };
  }, [tracking]);

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

            <div className="tracking-map">
              <div className="tracking-route-line" />
              {mapPoints && (
                <>
                  <div className="tracking-marker tracking-marker-pickup" style={mapPoints.pickup}>상</div>
                  <div className="tracking-marker tracking-marker-dropoff" style={mapPoints.dropoff}>하</div>
                  {tracking.hasLocation && (
                    <div className="tracking-marker tracking-marker-driver" style={mapPoints.driver}>차</div>
                  )}
                </>
              )}
              {!tracking.pickupLat || !tracking.dropoffLat ? (
                <div className="tracking-map-notice">상차/하차 좌표가 일부 없어 mock 좌표로 보정했습니다.</div>
              ) : null}
            </div>

            <div className="tracking-grid">
              <section className="tracking-card">
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

              <section className="tracking-card">
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
              <div>
                <span className="tracking-dot tracking-dot-pickup" />
                <strong>{tracking.pickupName ?? "상차지"}</strong>
                <p>{tracking.pickupAddress ?? "상차지 주소 없음"}</p>
              </div>
              <div>
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
