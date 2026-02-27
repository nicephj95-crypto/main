// src/components/ScheduleModal.tsx
import type { Dispatch, SetStateAction } from "react";
import type { ScheduleDraft } from "../hooks/useRequestForm";

type Props = {
  scheduleModalTarget: "pickup" | "dropoff" | null;
  scheduleDraft: ScheduleDraft;
  setScheduleDraft: Dispatch<SetStateAction<ScheduleDraft>>;
  setScheduleModalTarget: Dispatch<SetStateAction<"pickup" | "dropoff" | null>>;
  applyImmediateSchedule: () => void;
  applyScheduledDatetime: () => void;
};

export function ScheduleModal({
  scheduleModalTarget,
  scheduleDraft,
  setScheduleDraft,
  setScheduleModalTarget,
  applyImmediateSchedule,
  applyScheduledDatetime,
}: Props) {
  if (!scheduleModalTarget) return null;

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={() => setScheduleModalTarget(null)}
    >
      <div
        className="dispatch-image-modal dispatch-schedule-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={scheduleModalTarget === "pickup" ? "상차시간 예약" : "하차시간 예약"}
      >
        <div className="dispatch-image-modal-header">
          <h3>{scheduleModalTarget === "pickup" ? "상차시간 예약" : "하차시간 예약"}</h3>
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={() => setScheduleModalTarget(null)}
          >
            닫기
          </button>
        </div>
        <div className="dispatch-image-modal-body">
          <div className="dispatch-schedule-form">
            <label className="dispatch-schedule-field">
              <span>예약 시간</span>
              <div className="dispatch-schedule-grid">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="월"
                  value={scheduleDraft.month}
                  onChange={(e) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      month: e.target.value.replace(/\D/g, "").slice(0, 2),
                    }))
                  }
                />
                <span>/</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="일"
                  value={scheduleDraft.day}
                  onChange={(e) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      day: e.target.value.replace(/\D/g, "").slice(0, 2),
                    }))
                  }
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="시"
                  value={scheduleDraft.hour}
                  onChange={(e) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      hour: e.target.value.replace(/\D/g, "").slice(0, 2),
                    }))
                  }
                />
                <span>:</span>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  placeholder="분"
                  value={scheduleDraft.minute}
                  onChange={(e) =>
                    setScheduleDraft((prev) => ({
                      ...prev,
                      minute: e.target.value.replace(/\D/g, "").slice(0, 2),
                    }))
                  }
                />
              </div>
            </label>
            <div className="dispatch-schedule-help">
              연도는 현재 연도로 저장됩니다. 예: 03/12 14:30
            </div>
          </div>
        </div>
        <div className="dispatch-image-modal-footer dispatch-schedule-actions">
          <button
            type="button"
            className="dispatch-image-modal-action dispatch-schedule-secondary"
            onClick={applyImmediateSchedule}
          >
            {scheduleModalTarget === "pickup" ? "바로 상차" : "바로 하차"}
          </button>
          <button
            type="button"
            className="dispatch-image-modal-action"
            onClick={applyScheduledDatetime}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
