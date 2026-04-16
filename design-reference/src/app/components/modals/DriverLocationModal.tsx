import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DriverLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  fromAddress: string;
  toAddress: string;
}

export function DriverLocationModal({ isOpen, onClose, fromAddress, toAddress }: DriverLocationModalProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen || !mapRef.current) return;

    const initializeMap = () => {
      if (!window.kakao || !window.kakao.maps) return;

      window.kakao.maps.load(() => {
        const container = mapRef.current;
        if (!container) return;

        const options = {
          center: new window.kakao.maps.LatLng(37.5665, 126.9780), // 서울 기본 좌표
          level: 8,
        };

        const map = new window.kakao.maps.Map(container, options);
        kakaoMapRef.current = map;

        // 출발지 마커 (파란색)
        const fromMarkerPosition = new window.kakao.maps.LatLng(37.5665, 126.9780);
        const fromMarker = new window.kakao.maps.Marker({
          position: fromMarkerPosition,
          map: map,
        });

        const fromInfowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px;font-size:12px;color:#0066cc;">출발지<br/>${fromAddress}</div>`,
        });
        fromInfowindow.open(map, fromMarker);

        // 도착지 마커 (빨간색)
        const toMarkerPosition = new window.kakao.maps.LatLng(37.5555, 126.9900);
        const toMarker = new window.kakao.maps.Marker({
          position: toMarkerPosition,
          map: map,
        });

        const toInfowindow = new window.kakao.maps.InfoWindow({
          content: `<div style="padding:5px;font-size:12px;color:#cc0000;">도착지<br/>${toAddress}</div>`,
        });
        toInfowindow.open(map, toMarker);

        // 기사 위치 마커 (초록색)
        const driverMarkerPosition = new window.kakao.maps.LatLng(37.5610, 126.9840);
        const driverMarker = new window.kakao.maps.Marker({
          position: driverMarkerPosition,
          map: map,
        });

        const driverInfowindow = new window.kakao.maps.InfoWindow({
          content: '<div style="padding:5px;font-size:12px;color:#00cc00;">🚛 기사 위치</div>',
        });
        driverInfowindow.open(map, driverMarker);

        // 지도 범위 재설정
        const bounds = new window.kakao.maps.LatLngBounds();
        bounds.extend(fromMarkerPosition);
        bounds.extend(toMarkerPosition);
        bounds.extend(driverMarkerPosition);
        map.setBounds(bounds);
      });
    };

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="dapi.kakao.com"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_APP_KEY&autoload=false&libraries=services`;
      script.async = true;
      
      script.onload = () => {
        initializeMap();
      };

      document.head.appendChild(script);
    } else {
      // Script exists, check if kakao is loaded
      if (window.kakao && window.kakao.maps) {
        initializeMap();
      } else {
        // Wait for script to load
        const checkKakao = setInterval(() => {
          if (window.kakao && window.kakao.maps) {
            clearInterval(checkKakao);
            initializeMap();
          }
        }, 100);

        // Clear interval after 5 seconds to prevent memory leak
        setTimeout(() => clearInterval(checkKakao), 5000);
      }
    }
  }, [isOpen, fromAddress, toAddress]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div 
          className="flex items-center justify-between p-6"
          style={{ borderBottom: '1px solid var(--border3)' }}
        >
          <h2 className="text-xl font-bold m-0" style={{ color: 'var(--black)' }}>
            기사 위치 확인
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} style={{ color: 'var(--black)' }} />
          </button>
        </div>

        {/* 안내 문구 */}
        <div className="px-6 py-3" style={{ backgroundColor: '#fff9e6', borderBottom: '1px solid var(--border3)' }}>
          <p className="text-sm m-0" style={{ color: '#856404' }}>
            ⚠️ 기사 위치는 5~10분 간격으로 추적되므로 실시간 위치와 차이가 있을 수 있습니다.
          </p>
        </div>

        {/* 지도 */}
        <div className="flex-1 p-6 overflow-hidden">
          <div 
            ref={mapRef}
            className="w-full h-full min-h-[400px] rounded"
            style={{ border: '1px solid var(--border3)' }}
          />
        </div>

        {/* 범례 */}
        <div className="px-6 pb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#0066cc' }}></div>
              <span style={{ color: 'var(--black)' }}>출발지</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#cc0000' }}></div>
              <span style={{ color: 'var(--black)' }}>도착지</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#00cc00' }}></div>
              <span style={{ color: 'var(--black)' }}>🚛 기사 위치</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 전역 타입 선언
declare global {
  interface Window {
    kakao: any;
  }
}