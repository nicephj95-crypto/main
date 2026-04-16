// src/components/FareRuleModal.tsx
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function FareRuleModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div
      className="fare-rule-backdrop"
      onClick={onClose}
    >
      <div
        className="fare-rule-box"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="요금 안내"
      >
        <div className="fare-rule-header">
          <span className="fare-rule-title">요금 안내</span>
          <button type="button" className="fare-rule-close" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div className="fare-rule-body">
          <div className="fare-rule-section">
            <h3 className="fare-rule-section-title">📌 거리 기반 예상 요금</h3>
            <p className="fare-rule-section-desc">
              표시된 금액은 출발지~도착지 간 거리를 기준으로 산정된 대략적인 예상 요금입니다.
              실제 청구 금액과 차이가 발생할 수 있습니다.
            </p>
          </div>

          <div className="fare-rule-section">
            <h3 className="fare-rule-section-title">⚠️ 추가 요금 발생 항목</h3>
            <p className="fare-rule-section-desc">
              • 상하차 대기 지연 (30분 초과 시 추가)<br />
              • 검수 대기 (도착 후 검수 대기 시간 발생 시)<br />
              • 회차 (목적지 변경 또는 재이동 시)<br />
              • 층수 추가 (고층 운반 시)<br />
              • 거리 수정 (실제 경로와 예상 경로 차이 발생 시)
            </p>
          </div>

          <div className="fare-rule-section">
            <h3 className="fare-rule-section-title">💡 특이사항 요금 적용</h3>
            <p className="fare-rule-section-desc">
              • <strong>긴급</strong>: 기본 요금 + 10,000원<br />
              • <strong>혼적</strong>: 기본 요금의 50%<br />
              • <strong>왕복</strong>: 기본 요금 x 2<br />
              • <strong>수작업 포함</strong> (상/하차 방법): + 10,000원<br />
              • <strong>야간할증</strong> (22시~익일 06시): 기본 요금 + 20%<br />
              • <strong>월말할증</strong> (월말 마감 작업): 기본 요금 + 10%
            </p>
          </div>

          <div className="fare-rule-section">
            <h3 className="fare-rule-section-title">📞 문의</h3>
            <p className="fare-rule-section-desc">
              요금 관련 문의사항은 고객센터로 연락해 주세요.
            </p>
          </div>
        </div>

        <div className="fare-rule-footer">
          <button type="button" className="fare-rule-confirm" onClick={onClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
