// src/components/HistoryModal.tsx
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchAuditLogs } from "../api/admin";
import type { AuditLogEntry } from "../api/types";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "생성",
  UPDATE: "수정",
  DELETE: "삭제",
  APPROVE: "승인",
  REJECT: "거절",
  STATUS_CHANGE: "상태변경",
  IMAGE_UPLOAD: "이미지업로드",
};

function formatDetail(detail: string | null): string {
  if (!detail) return "";
  try {
    const obj = JSON.parse(detail);
    if (Array.isArray(obj?.changes)) {
      return obj.changes
        .map((value: unknown) => {
          if (typeof value === "string" && value.trim() !== "") {
            return value;
          }
          if (
            value &&
            typeof value === "object" &&
            typeof (value as { label?: unknown }).label === "string"
          ) {
            const change = value as { label: string; before?: unknown; after?: unknown };
            return `${change.label}: ${change.before ?? "-"} -> ${change.after ?? "-"}`;
          }
          return null;
        })
        .filter((value: string | null): value is string => typeof value === "string" && value.trim() !== "")
        .join(" | ");
    }
    const hiddenKeys = new Set([
      "target",
      "groupId",
      "departmentId",
      "contactId",
      "imageId",
      "resourceId",
      "userId",
      "type",
    ]);

    const formatValue = (key: string, value: unknown): string | null => {
      if (value == null || value === "") return null;
      if (hiddenKeys.has(key)) return null;
      if (typeof value === "boolean") return value ? "예" : "아니오";
      if (key === "newStatus") {
        return value === "PENDING" ? "접수중"
          : value === "DISPATCHING" ? "배차중"
          : value === "ASSIGNED" ? "배차완료"
          : value === "IN_TRANSIT" ? "운행중"
          : value === "COMPLETED" ? "완료"
          : value === "CANCELLED" ? "취소"
          : String(value);
      }
      if (key === "count" && typeof value === "number") {
        return `${value}건`;
      }
      return String(value);
    };

    return Object.entries(obj)
      .map(([k, v]) => formatValue(k, v))
      .filter((value): value is string => !!value)
      .join(" | ");
  } catch {
    return detail;
  }
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

type Props = {
  open: boolean;
  resource: string;
  resourceId?: number | null;
  title: string;
  onClose: () => void;
};

export function HistoryModal({ open, resource, resourceId, title, onClose }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAuditLogs({ resource, resourceId: resourceId ?? undefined, limit: 50 })
      .then((res) => {
        if (!cancelled) {
          setLogs(res.items);
          setTotal(res.total);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "변경이력 조회 중 오류가 발생했습니다.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, resource, resourceId]);

  if (!open) return null;

  return (
    <div className="history-backdrop" onClick={onClose}>
      <div
        className="history-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="변경이력"
      >
        <div className="history-header">
          <span className="history-title">{title} — 변경이력</span>
          <button type="button" className="history-close" onClick={onClose} aria-label="닫기">
            <X size={16} />
          </button>
        </div>

        <div className="history-body">
          {loading && <p className="history-empty">불러오는 중...</p>}
          {error && <p className="history-empty history-error">{error}</p>}
          {!loading && !error && logs.length === 0 && (
            <p className="history-empty">변경이력이 없습니다.</p>
          )}
          {!loading && !error && logs.length > 0 && (
            <table className="history-table">
              <thead>
                <tr>
                  <th>일시</th>
                  <th>작업</th>
                  <th>작업자</th>
                  <th>상세</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="history-td-date">{formatDateTime(log.createdAt)}</td>
                    <td>
                      <span className="history-action-badge">
                        {ACTION_LABELS[log.action] ?? log.action}
                      </span>
                    </td>
                    <td>
                      <div>{log.userName ?? "-"}</div>
                    </td>
                    <td className="history-td-detail">{formatDetail(log.detail)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {total > 50 && (
          <div className="history-footer">
            최근 50건 표시 중 (전체 {total}건)
          </div>
        )}
      </div>
    </div>
  );
}
