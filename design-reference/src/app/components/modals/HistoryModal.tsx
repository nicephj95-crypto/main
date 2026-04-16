import { X } from 'lucide-react';

interface HistoryEntry {
  user: string;
  timestamp: string;
  action: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
}

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  histories: HistoryEntry[];
}

export function HistoryModal({ isOpen, onClose, title, histories }: HistoryModalProps) {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div 
          className="flex items-center justify-between p-6 border-b"
          style={{ borderColor: 'var(--border3)' }}
        >
          <h2 className="text-xl font-bold m-0" style={{ color: 'var(--black)' }}>
            📋 {title} 변경이력
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} style={{ color: 'var(--black)' }} />
          </button>
        </div>

        {/* 이력 목록 - 가로 나열 */}
        <div className="flex-1 overflow-y-auto p-6">
          {histories.length === 0 ? (
            <div className="text-center py-12" style={{ color: '#999' }}>
              <p className="text-base m-0">변경 이력이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {histories.map((history, index) => (
                <div 
                  key={index}
                  className="p-3 rounded-lg"
                  style={{ 
                    backgroundColor: '#f8f9fa',
                    border: '1px solid var(--border3)'
                  }}
                >
                  {/* 한 줄로 정보 표시 */}
                  <div className="flex items-center gap-3 flex-wrap text-sm">
                    <span 
                      className="px-2 py-0.5 rounded text-xs font-medium flex-shrink-0"
                      style={{ 
                        backgroundColor: 'var(--blue)',
                        color: 'white'
                      }}
                    >
                      {history.user}
                    </span>
                    <span className="text-xs flex-shrink-0" style={{ color: '#666' }}>
                      {history.timestamp}
                    </span>
                    <span className="font-medium flex-shrink-0" style={{ color: 'var(--black)' }}>
                      {history.action}
                    </span>
                    {history.field && (
                      <>
                        <span style={{ color: '#999' }}>•</span>
                        <span className="font-medium flex-shrink-0" style={{ color: 'var(--blue)' }}>
                          {history.field}
                        </span>
                      </>
                    )}
                    {history.oldValue && (
                      <>
                        <span style={{ color: '#999' }}>•</span>
                        <span style={{ color: '#dc3545' }}>이전:</span>
                        <span style={{ color: '#666' }}>{history.oldValue}</span>
                      </>
                    )}
                    {history.newValue && (
                      <>
                        <span style={{ color: '#999' }}>→</span>
                        <span style={{ color: '#28a745' }}>변경:</span>
                        <span style={{ color: 'var(--black)' }}>{history.newValue}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t" style={{ borderColor: 'var(--border3)' }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: 'var(--blue)' }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
