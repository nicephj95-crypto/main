import React from 'react';

interface DispatchHistory {
  date: string;
  time: string;
  company: string;
  rep: string;
  fN: string;
  fT: string;
  fA: string;
  tN: string;
  tT: string;
  tA: string;
  car: string;
  ctype: string;
  note: string;
  bl: string;
  driver: string;
  status: "접수중" | "배차중" | "배차완료" | "취소";
  pickupTime?: string;
  deliveryTime?: string;
  fare?: string;
  actualFare?: string;
  billingFare?: string;
  additionalFare?: string;
  additionalFareReason?: string;
  specialType?: string;
  paymentMethod?: string;
  orderNumber: string;
  assignee: string;
}

// 숫자를 세자리마다 콤마로 포맷팅하는 함수
const formatNumber = (value: string | undefined): string => {
  if (!value) return '';
  // 숫자만 추출
  const numbers = value.replace(/[^\d]/g, '');
  if (!numbers) return '';
  // 세자리마다 콤마 추가
  return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

interface Props {
  item: DispatchHistory;
  index: number;
  onCardClick: (item: DispatchHistory) => void;
  onCopyClick: (item: DispatchHistory) => void;
  getStatusBadgeClass: (status: string) => string;
  getPlaceNote: (placeName: string) => string;
}

export function DispatchHistoryMobileCard({
  item,
  index,
  onCardClick,
  onCopyClick,
  getStatusBadgeClass,
  getPlaceNote,
}: Props) {
  // Parse driver info - 데스크톱과 동일하게 '\\n'으로 split
  const driverInfo = item.driver ? item.driver.split('\\n') : [];
  const driverName = driverInfo[0] || '';
  const driverPhone = driverInfo[1] || '';
  const carNumber = driverInfo[2] || '';

  return (
    <div
      key={index}
      className="bg-white rounded-lg p-4 shadow-sm"
      style={{ border: '1px solid var(--border3)' }}
      onClick={() => onCardClick(item)}
    >
      {/* Header: Status & Date */}
      <div className="flex items-center justify-between mb-3">
        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
        <div className="text-xs" style={{ color: 'var(--gray)' }}>
          {item.date} {item.time}
        </div>
      </div>

      {/* Order Number, Company & Assignee */}
      <div className="mb-3 text-xs" style={{ color: 'var(--black)' }}>
        {item.orderNumber} · {item.company} · {item.assignee}
      </div>

      {/* From */}
      <div className="mb-2">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="flex items-start gap-1.5 flex-1">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: 'var(--blue)' }}></span>
            {getPlaceNote(item.fN) ? (
              <span 
                className="text-sm font-bold max-[768px]:truncate max-[768px]:max-w-[180px]"
                style={{ 
                  color: 'var(--black)',
                  background: 'linear-gradient(to top, rgba(255, 255, 0, 0.4) 0%, rgba(255, 255, 0, 0.4) 50%, transparent 50%)',
                  backgroundPosition: '0 -2px'
                }}
                title={getPlaceNote(item.fN)}
              >
                {item.fN}
              </span>
            ) : (
              <span className="text-sm font-bold max-[768px]:truncate max-[768px]:max-w-[180px]" style={{ color: 'var(--black)' }}>{item.fN}</span>
            )}
          </div>
          {item.pickupTime && (
            <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ color: 'var(--blue)', background: 'rgba(0, 117, 255, 0.1)' }}>
              {item.pickupTime}
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--gray)', marginLeft: '12px' }}>
          {item.fA}
        </div>
        {getPlaceNote(item.fN) && (
          <div className="text-xs mt-1 px-2 py-1 rounded" style={{ color: '#856404', background: '#fff3cd', marginLeft: '12px' }}>
            💡 {getPlaceNote(item.fN)}
          </div>
        )}
      </div>

      {/* To */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <div className="flex items-start gap-1.5 flex-1">
            <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#ff4d4d' }}></span>
            {getPlaceNote(item.tN) ? (
              <span 
                className="text-sm font-bold max-[768px]:truncate max-[768px]:max-w-[180px]"
                style={{ 
                  color: 'var(--black)',
                  background: 'linear-gradient(to top, rgba(255, 255, 0, 0.4) 0%, rgba(255, 255, 0, 0.4) 50%, transparent 50%)',
                  backgroundPosition: '0 -2px'
                }}
                title={getPlaceNote(item.tN)}
              >
                {item.tN}
              </span>
            ) : (
              <span className="text-sm font-bold max-[768px]:truncate max-[768px]:max-w-[180px]" style={{ color: 'var(--black)' }}>{item.tN}</span>
            )}
          </div>
          {item.deliveryTime && (
            <span className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)' }}>
              {item.deliveryTime}
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--gray)', marginLeft: '12px' }}>
          {item.tA}
        </div>
        {getPlaceNote(item.tN) && (
          <div className="text-xs mt-1 px-2 py-1 rounded" style={{ color: '#856404', background: '#fff3cd', marginLeft: '12px' }}>
            💡 {getPlaceNote(item.tN)}
          </div>
        )}
      </div>

      {/* Driver Info - 기사이름, 연락처, 차량번호만 표시 */}
      {item.driver && (
        <div className="mb-3 text-xs" style={{ color: 'var(--black)' }}>
          {driverName} · {driverPhone} · {carNumber}
        </div>
      )}

      {/* Divider */}
      <div className="mb-3" style={{ borderBottom: '1px solid var(--border3)' }}></div>

      {/* Bottom: Vehicle/Type/Fare & Buttons */}
      <div className="flex items-center justify-between">
        <div className="text-xs leading-relaxed" style={{ color: 'var(--black)' }}>
          <div>{item.car} / {item.ctype}</div>
          {(item.actualFare || item.billingFare || item.additionalFare) ? (
            <div className="mt-1 space-y-0.5">
              {item.actualFare && (
                <div>
                  <span style={{ color: '#666' }}>원가 : </span>
                  <span>{formatNumber(item.actualFare)}원</span>
                </div>
              )}
              {item.billingFare && (
                <div>
                  <span style={{ color: '#666' }}>청구 : </span>
                  <span style={{ color: 'var(--blue)' }}>{formatNumber(item.billingFare)}원</span>
                </div>
              )}
              {item.additionalFare && item.additionalFare !== '0' && (
                <div style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ color: '#ff6b6b' }}>+{formatNumber(item.additionalFare)}원</span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-1">-</div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            className="w-9 h-9 rounded flex items-center justify-center bg-white transition-colors active:bg-gray-50"
            style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            title="이미지"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
              <path d="M2 11l3-3 2 2 3-3 3 3v2H2v-1z" fill="currentColor"/>
            </svg>
          </button>
          <button
            className="w-9 h-9 rounded flex items-center justify-center bg-white transition-colors active:bg-gray-50"
            style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
            onClick={(e) => {
              e.stopPropagation();
              onCopyClick(item);
            }}
            title="복사"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}