// src/components/ExternalPriceModal.tsx
import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  platformLabel: string;
  estimatedPrice: number;
  onConfirm: (sentPrice: number) => void;
  onCancel: () => void;
};

function formatPrice(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

export function ExternalPriceModal({ open, platformLabel, estimatedPrice, onConfirm, onCancel }: Props) {
  const [sentPriceStr, setSentPriceStr] = useState("");

  useEffect(() => {
    if (open) {
      setSentPriceStr(String(estimatedPrice));
    }
  }, [open, estimatedPrice]);

  if (!open) return null;

  const sentPrice = parseInt(sentPriceStr.replace(/,/g, ""), 10);
  const isValid = !isNaN(sentPrice) && sentPrice > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(sentPrice);
  };

  return (
    <div className="epm-backdrop" onClick={onCancel}>
      <div className="epm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="epm-header">
          <span className="epm-title">{platformLabel} 전송 금액 확인</span>
        </div>
        <div className="epm-body">
          <div className="epm-row">
            <span className="epm-label">예상 운임</span>
            <span className="epm-estimated">{formatPrice(estimatedPrice)}</span>
          </div>
          <div className="epm-row">
            <label className="epm-label" htmlFor="epm-sent-price">실제 전송 금액</label>
            <input
              id="epm-sent-price"
              className="epm-input"
              type="number"
              min={1}
              value={sentPriceStr}
              onChange={(e) => setSentPriceStr(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleConfirm(); }}
              autoFocus
            />
          </div>
        </div>
        <div className="epm-footer">
          <button type="button" className="epm-btn epm-btn-cancel" onClick={onCancel}>취소</button>
          <button
            type="button"
            className="epm-btn epm-btn-confirm"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            {platformLabel} 등록
          </button>
        </div>
      </div>
    </div>
  );
}
