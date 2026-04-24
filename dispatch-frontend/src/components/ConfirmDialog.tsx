// src/components/ConfirmDialog.tsx
import { useEffect, useState } from "react";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type InternalState = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

let subscriber: ((state: InternalState | null) => void) | null = null;

export function openConfirm(options: ConfirmOptions): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    if (!subscriber) {
      resolve(window.confirm(`${options.title}\n\n${options.message}`));
      return;
    }
    subscriber({ ...options, resolve });
  });
}

export function ConfirmDialog() {
  const [state, setState] = useState<InternalState | null>(null);

  useEffect(() => {
    subscriber = setState;
    return () => {
      subscriber = null;
    };
  }, []);

  if (!state) return null;

  const handleClose = () => {
    state.resolve(false);
    setState(null);
  };

  const handleConfirm = () => {
    state.resolve(true);
    setState(null);
  };

  return (
    <div className="cd-backdrop" onClick={handleClose}>
      <div className="cd-panel" onClick={(e) => e.stopPropagation()}>
        <div className="cd-header">
          <span className="cd-title">{state.title}</span>
          <button
            type="button"
            className="cd-close"
            aria-label="닫기"
            onClick={handleClose}
          >
            ×
          </button>
        </div>
        <p className="cd-message">{state.message}</p>
        <div className="cd-actions">
          <button type="button" className="cd-btn cd-btn-cancel" onClick={handleClose}>
            {state.cancelLabel ?? "취소"}
          </button>
          <button type="button" className="cd-btn cd-btn-confirm" onClick={handleConfirm}>
            {state.confirmLabel ?? "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}
