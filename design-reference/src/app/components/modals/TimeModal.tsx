import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface TimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onConfirm: (type: "now" | "reserved", date: string, time: string) => void;
}

export function TimeModal({ isOpen, onClose, title, onConfirm }: TimeModalProps) {
  const [timeType, setTimeType] = useState<"now" | "reserved">("now");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedHour, setSelectedHour] = useState("09");
  const [selectedMin, setSelectedMin] = useState("00");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${year}-${month}-${day}`);
    setCurrentMonth(today);
  }, [isOpen]);

  const handleConfirm = () => {
    const timeString = timeType === "reserved" ? `${selectedHour}:${selectedMin}` : "";
    onConfirm(timeType, selectedDate, timeString);
  };

  const moveMonth = (direction: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  };

  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push({ day: 0, date: "" });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({ day: i, date: dateStr });
    }
    return days;
  };

  const isToday = (dateStr: string) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return dateStr === `${year}-${month}-${day}`;
  };

  if (!isOpen) return null;

  const days = getDaysInMonth();
  const monthLabel = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[400px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>{title}</span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTimeType("now")}
            className={`flex-1 h-9 rounded text-sm transition-all ${timeType === "now" ? 'font-bold' : ''}`}
            style={{
              border: `1px solid ${timeType === "now" ? 'var(--blue)' : 'var(--border)'}`,
              color: timeType === "now" ? 'var(--blue)' : 'var(--black)',
              background: timeType === "now" ? '#f0f6ff' : 'transparent',
            }}
          >
            바로
          </button>
          <button
            onClick={() => setTimeType("reserved")}
            className={`flex-1 h-9 rounded text-sm transition-all ${timeType === "reserved" ? 'font-bold' : ''}`}
            style={{
              border: `1px solid ${timeType === "reserved" ? 'var(--blue)' : 'var(--border)'}`,
              color: timeType === "reserved" ? 'var(--blue)' : 'var(--black)',
              background: timeType === "reserved" ? '#f0f6ff' : 'transparent',
            }}
          >
            예약 (날짜·시간 지정)
          </button>
        </div>

        {timeType === "now" ? (
          <div>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              현재 시간 기준으로 바로 진행합니다.<br />
              별도의 날짜·시간 설정이 필요하지 않습니다.
            </p>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-[480px]:grid-cols-1">
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--gray)' }}>날짜</label>
                <input
                  className="h-10 w-full rounded px-3 text-sm outline-none transition-all"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--gray)' }}>시간</label>
                <div className="flex gap-1.5 items-center">
                  <select
                    className="flex-1 h-10 rounded px-2.5 pr-7 text-sm outline-none cursor-pointer appearance-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                    value={selectedHour}
                    onChange={(e) => setSelectedHour(e.target.value)}
                  >
                    {hours.map((h) => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <span className="text-[13px]" style={{ color: 'var(--gray)' }}>시</span>
                  <select
                    className="flex-1 h-10 rounded px-2.5 pr-7 text-sm outline-none cursor-pointer appearance-none"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                    value={selectedMin}
                    onChange={(e) => setSelectedMin(e.target.value)}
                  >
                    <option value="00">00분</option>
                    <option value="10">10분</option>
                    <option value="20">20분</option>
                    <option value="30">30분</option>
                    <option value="40">40분</option>
                    <option value="50">50분</option>
                  </select>
                  <span className="text-[13px]" style={{ color: 'var(--gray)' }}>분</span>
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between mb-2">
                <button className="w-7 h-7 rounded flex items-center justify-center text-base transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={() => moveMonth(-1)}>
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-bold" style={{ color: 'var(--black)' }}>{monthLabel}</span>
                <button className="w-7 h-7 rounded flex items-center justify-center text-base transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={() => moveMonth(1)}>
                  <ChevronRight size={16} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <div key={day} className="h-7 flex items-center justify-center text-[11px] font-semibold" style={{ color: 'var(--gray)' }}>
                    {day}
                  </div>
                ))}
                {days.map((d, idx) => (
                  <button
                    key={idx}
                    disabled={d.day === 0}
                    onClick={() => d.date && setSelectedDate(d.date)}
                    className={`h-8 flex items-center justify-center rounded text-[13px] transition-all ${
                      d.day === 0 ? 'cursor-default' : 'cursor-pointer'
                    } ${
                      d.date === selectedDate ? 'text-white' : ''
                    } ${
                      d.date && isToday(d.date) && d.date !== selectedDate ? 'font-bold' : ''
                    }`}
                    style={{
                      color: d.date === selectedDate ? '#fff' : (d.date && isToday(d.date) ? 'var(--blue)' : 'var(--black)'),
                      background: d.date === selectedDate ? 'var(--blue)' : 'transparent',
                    }}
                  >
                    {d.day || ''}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end mt-5">
          <button className="h-10 px-5 rounded text-sm transition-colors" style={{ background: 'var(--bg)', color: 'var(--gray)' }} onClick={onClose}>
            취소
          </button>
          <button className="h-10 px-5 rounded text-sm text-white transition-colors" style={{ background: 'var(--blue)' }} onClick={handleConfirm}>
            확인
          </button>
        </div>
      </div>

      <style>{`
        @keyframes mIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
