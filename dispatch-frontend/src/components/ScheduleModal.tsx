// src/components/ScheduleModal.tsx
import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { ScheduleDraft } from "../hooks/useRequestForm";

type Props = {
  scheduleModalTarget: "pickup" | "dropoff" | null;
  scheduleDraft: ScheduleDraft;
  setScheduleModalTarget: (v: "pickup" | "dropoff" | null) => void;
  applyImmediateSchedule: () => void;
  applyScheduledDatetime: (overrideDraft?: ScheduleDraft) => void;
};

function toDateString(draft: ScheduleDraft): string {
  if (!draft.month || !draft.day) {
    const today = new Date();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${m}-${d}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${draft.month.padStart(2, "0")}-${draft.day.padStart(2, "0")}`;
}

export function ScheduleModal({
  scheduleModalTarget,
  scheduleDraft,
  setScheduleModalTarget,
  applyImmediateSchedule,
  applyScheduledDatetime,
}: Props) {
  const [timeType, setTimeType] = useState<"now" | "reserved">("now");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMin, setSelectedMin] = useState("00");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Initialize local state from scheduleDraft when modal opens
  useEffect(() => {
    if (!scheduleModalTarget) return;
    const today = new Date();
    if (scheduleDraft.month && scheduleDraft.day) {
      setTimeType("reserved");
      setSelectedDate(toDateString(scheduleDraft));
      setSelectedHour(scheduleDraft.hour.padStart(2, "0") || "09");
      setSelectedMin(
        (() => {
          const m = Number(scheduleDraft.minute);
          const snapped = Math.floor(m / 10) * 10;
          return String(snapped).padStart(2, "0");
        })()
      );
      const y = today.getFullYear();
      const mo = Number(scheduleDraft.month) - 1;
      setCurrentMonth(new Date(y, mo, 1));
    } else {
      setTimeType("now");
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      setSelectedDate(`${today.getFullYear()}-${m}-${d}`);
      setSelectedHour("09");
      setSelectedMin("00");
      setCurrentMonth(today);
    }
  }, [scheduleModalTarget]);

  if (!scheduleModalTarget) return null;

  const title = scheduleModalTarget === "pickup" ? "상차시간 설정" : "하차시간 설정";

  const moveMonth = (dir: number) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + dir);
      return next;
    });
  };

  const getDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const days: { day: number; date: string }[] = [];
    for (let i = 0; i < firstDow; i++) {
      days.push({ day: 0, date: "" });
    }
    for (let i = 1; i <= lastDay; i++) {
      days.push({
        day: i,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`,
      });
    }
    return days;
  };

  const isToday = (dateStr: string) => {
    const t = new Date();
    return (
      dateStr ===
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
    );
  };

  const handleConfirm = () => {
    if (timeType === "now") {
      applyImmediateSchedule();
      return;
    }
    // Build draft from selected date + hour/minute
    const parts = selectedDate.split("-");
    if (parts.length !== 3) {
      alert("날짜를 올바르게 선택해주세요.");
      return;
    }
    const draft: ScheduleDraft = {
      month: parts[1],
      day: parts[2],
      hour: selectedHour,
      minute: selectedMin,
    };
    applyScheduledDatetime(draft);
  };

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
  const mins = ["00", "10", "20", "30", "40", "50"];
  const monthLabel = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;
  const days = getDays();

  return (
    <div
      className="dispatch-schedule-backdrop"
      onClick={() => setScheduleModalTarget(null)}
    >
      <div
        className="dispatch-schedule-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="dispatch-schedule-header">
          <span className="dispatch-schedule-title">{title}</span>
          <button
            type="button"
            className="dispatch-schedule-close"
            onClick={() => setScheduleModalTarget(null)}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toggle: 바로 / 예약 */}
        <div className="dispatch-schedule-toggle">
          <button
            type="button"
            className={`dispatch-schedule-toggle-btn${timeType === "now" ? " active" : ""}`}
            onClick={() => setTimeType("now")}
          >
            바로
          </button>
          <button
            type="button"
            className={`dispatch-schedule-toggle-btn${timeType === "reserved" ? " active" : ""}`}
            onClick={() => setTimeType("reserved")}
          >
            예약 (날짜·시간 지정)
          </button>
        </div>

        {/* Body */}
        {timeType === "now" ? (
          <p className="dispatch-schedule-now-text">
            현재 시간 기준으로 바로 진행합니다.<br />
            별도의 날짜·시간 설정이 필요하지 않습니다.
          </p>
        ) : (
          <div className="dispatch-schedule-reserved">
            {/* Date + Time row */}
            <div className="dispatch-schedule-dt-row">
              <div className="dispatch-schedule-dt-col">
                <span className="dispatch-schedule-dt-label">날짜</span>
                <input
                  type="date"
                  className="dispatch-schedule-date-input"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    if (e.target.value) {
                      const parts = e.target.value.split("-");
                      setCurrentMonth(new Date(Number(parts[0]), Number(parts[1]) - 1, 1));
                    }
                  }}
                />
              </div>
              <div className="dispatch-schedule-dt-col">
                <span className="dispatch-schedule-dt-label">시간</span>
                <div className="dispatch-schedule-time-row">
                  <select
                    className="dispatch-schedule-time-select"
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <span className="dispatch-schedule-time-sep">시</span>
                  <select
                    className="dispatch-schedule-time-select"
                    value={selectedMin}
                    onChange={(e) => setSelectedMin(e.target.value)}
                  >
                    {mins.map((m) => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                  <span className="dispatch-schedule-time-sep">분</span>
                </div>
              </div>
            </div>

            {/* Calendar */}
            <div className="dispatch-schedule-calendar">
              <div className="dispatch-schedule-cal-header">
                <button
                  type="button"
                  className="dispatch-schedule-cal-nav"
                  onClick={() => moveMonth(-1)}
                  aria-label="이전 달"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="dispatch-schedule-cal-month">{monthLabel}</span>
                <button
                  type="button"
                  className="dispatch-schedule-cal-nav"
                  onClick={() => moveMonth(1)}
                  aria-label="다음 달"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="dispatch-schedule-cal-grid">
                {["일", "월", "화", "수", "목", "금", "토"].map((dow) => (
                  <div key={dow} className="dispatch-schedule-cal-dow">{dow}</div>
                ))}
                {days.map((d, idx) => {
                  const isSelected = d.date === selectedDate;
                  const isTodayDay = d.date ? isToday(d.date) : false;
                  let cls = "dispatch-schedule-cal-day";
                  if (isSelected) cls += " selected";
                  else if (isTodayDay) cls += " today";
                  return (
                    <button
                      key={idx}
                      type="button"
                      className={cls}
                      disabled={d.day === 0}
                      onClick={() => d.date && setSelectedDate(d.date)}
                    >
                      {d.day || ""}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="dispatch-schedule-footer">
          <button
            type="button"
            className="dispatch-schedule-btn-cancel"
            onClick={() => setScheduleModalTarget(null)}
          >
            취소
          </button>
          <button
            type="button"
            className="dispatch-schedule-btn-confirm"
            onClick={handleConfirm}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
