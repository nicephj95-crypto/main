import { X } from "lucide-react";

interface FareRuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FareRuleModal({ isOpen, onClose }: FareRuleModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[460px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>요금 안내</span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="text-sm leading-relaxed">
          <div className="mb-3.5">
            <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--black)' }}>📌 거리 기반 예상 요금</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              표시된 금은 출발지~도착지 간 거리를 기준으로 산정된 대략적인 예상 요금입니다. 실제 청구 금액과 차이가 발생할 수 있습니다.
            </p>
          </div>

          <div className="mb-3.5">
            <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--black)' }}>⚠️ 추가 요금 발생 항목</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              • 상하차 대기 지연 (30분 초과 시 추가)<br />
              • 검수 대기 (도착 후 검수 대기 시간 발생 시)<br />
              • 회차 (목적지 변경 또는 재이동 시)<br />
              • 층수 추가 (고층 운반 시)<br />
              • 거리 수정 (실제 경로와 예상 경로 차이 발생 시)
            </p>
          </div>

          <div className="mb-3.5">
            <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--black)' }}>💡 특이사항 요금 적용</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              • <strong>긴급</strong>: 기본 요금 + 10,000원<br />
              • <strong>혼적</strong>: 기본 요금의 50%<br />
              • <strong>왕복</strong>: 기본 요금 x 2<br />
              • <strong>수작업 포함</strong> (상/하차 방법): + 10,000���<br />
              • <strong>야간할증</strong> (22시~익일 06시): 기본 요금 + 20%<br />
              • <strong>월착할증</strong> (월말 마감 작업): 기본 요금 + 10%
            </p>
          </div>

          <div className="mb-0">
            <h3 className="text-sm font-bold mb-1.5" style={{ color: 'var(--black)' }}>📞 문의</h3>
            <p className="text-[13px] leading-relaxed" style={{ color: 'var(--gray)' }}>
              요금 관련 문의사항은 고객센터로 연락해 주세요.
            </p>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <button className="h-10 px-5 rounded text-sm text-white transition-colors" style={{ background: 'var(--blue)' }} onClick={onClose}>
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