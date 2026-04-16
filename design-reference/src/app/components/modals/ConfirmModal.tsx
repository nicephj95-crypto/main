import { X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>{title}</span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--black)' }}>{message}</p>

        <div className="flex gap-2 justify-end">
          <button className="h-10 px-5 rounded text-sm transition-colors" style={{ background: 'var(--bg)', color: 'var(--gray)' }} onClick={onClose}>
            취소
          </button>
          <button className="h-10 px-5 rounded text-sm text-white transition-colors" style={{ background: '#e53935' }} onClick={onConfirm}>
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
