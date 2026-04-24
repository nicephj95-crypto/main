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
    vehicleGroup?: string | null;
    vehicleTonnage?: number | null;
    vehicleBodyType?: string | null;
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
            {recentRequests.map((r) => {
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onApply(r.id)}
                  disabled={applyingId === r.id}
                  className="request-recent-item"
                  title={`${r.pickupPlaceName} → ${r.dropoffPlaceName}`}
                >
                  <span className="request-recent-row">
                    <span className="request-recent-dot request-recent-dot-pickup" aria-hidden="true" />
                    <span className="request-recent-line request-recent-line-pickup">
                      {r.pickupPlaceName}
                    </span>
                  </span>
                  <span className="request-recent-row">
                    <span className="request-recent-dot request-recent-dot-dropoff" aria-hidden="true" />
                    <span className="request-recent-line request-recent-line-dropoff">
                      {r.dropoffPlaceName}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
