import { X } from 'lucide-react';

interface DispatchStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: '접수중' | '배차중' | '배차완료' | '취소';
  isCompleted?: boolean; // 운행완료 여부
}

export function DispatchStatusModal({ isOpen, onClose, status, isCompleted }: DispatchStatusModalProps) {
  if (!isOpen) return null;

  const getStatusMessage = () => {
    if (status === '취소') {
      return {
        title: '취소된 배차',
        message: '이 배차는 취소되었습니다.',
        icon: '❌',
        color: '#dc3545'
      };
    }
    
    if (status === '접수중' || status === '배차중') {
      return {
        title: '배차 진행중',
        message: '운행중이 아닙니다.',
        icon: '⏳',
        color: '#ffc107'
      };
    }
    
    if (status === '배차완료' && isCompleted) {
      return {
        title: '운행 완료',
        message: '운행이 완료된 건입니다.',
        icon: '✅',
        color: '#28a745'
      };
    }
    
    return null;
  };

  const statusInfo = getStatusMessage();
  if (!statusInfo) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-md shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border3)' }}
        >
          <h2 className="text-xl font-bold m-0" style={{ color: 'var(--black)' }}>
            {statusInfo.title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} style={{ color: 'var(--black)' }} />
          </button>
        </div>

        <div className="p-8 text-center">
          <div className="text-6xl mb-4">{statusInfo.icon}</div>
          <p className="text-base leading-relaxed" style={{ color: 'var(--black)' }}>
            {statusInfo.message}
          </p>
        </div>

        <div className="p-6 border-t" style={{ borderColor: 'var(--border3)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: statusInfo.color }}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
