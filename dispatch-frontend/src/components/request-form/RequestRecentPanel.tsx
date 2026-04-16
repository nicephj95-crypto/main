type RequestRecentPanelProps = {
  recentLoading: boolean;
  recentError: string | null;
  recentRequests: Array<{
    id: number;
    orderNumber?: string | null;
    createdAt: string;
    pickupPlaceName: string;
    dropoffPlaceName: string;
    distanceKm: number | null;
    quotedPrice: number | null;
  }>;
  applyingId: number | null;
  onApply: (requestId: number) => void;
};

export function RequestRecentPanel({
  recentLoading,
  recentError,
  recentRequests,
  applyingId,
  onApply,
}: RequestRecentPanelProps) {
  return (
    <section className="dispatch-panel request-recent-inline-wrap">
      <div className="request-recent-panel request-recent-inline">
        <div className="request-recent-header">
          <span>최근 배차내역</span>
        </div>

        {recentLoading && <p>불러오는 중...</p>}
        {recentError && null}

        {!recentLoading && !recentError && recentRequests.length === 0 && (
          <p style={{ color: "#777" }}>최근 배차내역이 없습니다.</p>
        )}

        {!recentLoading && !recentError && recentRequests.length > 0 && (
          <div className="request-recent-list">
            {recentRequests.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onApply(r.id)}
                disabled={applyingId === r.id}
                className="request-recent-item"
              >
                <div style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
                  #{r.id}
                  {r.orderNumber?.trim() ? ` · 오더 ${r.orderNumber.trim()}` : ""}
                  {" · "}
                  {new Date(r.createdAt).toLocaleString("ko-KR", {
                    month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </div>
                <div style={{ fontWeight: 500, fontSize: 13 }}>
                  {r.pickupPlaceName} → {r.dropoffPlaceName}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                  거리: {r.distanceKm != null ? `${r.distanceKm.toFixed(1)} km` : "-"}
                  {" · "}요금: {r.quotedPrice != null ? `${r.quotedPrice.toLocaleString()}원` : "-"}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
