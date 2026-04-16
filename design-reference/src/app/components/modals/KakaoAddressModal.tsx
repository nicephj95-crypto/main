import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface KakaoAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, detail: string) => void;
}

declare global {
  interface Window {
    daum: any;
  }
}

export function KakaoAddressModal({ isOpen, onClose, onSelect }: KakaoAddressModalProps) {
  const postcodeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const script = document.createElement('script');
    script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (postcodeRef.current && window.daum) {
        new window.daum.Postcode({
          oncomplete: function(data: any) {
            // 지번 주소에서 한글 부분과 숫자 부분 분리
            const jibunAddress = data.jibunAddress || data.autoJibunAddress || '';
            
            // 지번 주소를 공백으로 분리
            const jibunParts = jibunAddress.split(' ');
            
            // 마지막 부분이 숫자를 포함하면 상세주소로 이동
            let mainAddress = jibunAddress;
            let detailFromJibun = '';
            
            if (jibunParts.length > 0) {
              const lastPart = jibunParts[jibunParts.length - 1];
              // 마지막 부분에 숫자가 포함되어 있으면
              if (/\d/.test(lastPart)) {
                detailFromJibun = lastPart;
                mainAddress = jibunParts.slice(0, -1).join(' ');
              }
            }
            
            // 도로명 주소에서 "길이름 숫자" 형태 추출 (예: "하늘길 210")
            const roadAddress = data.roadAddress || '';
            const roadParts = roadAddress.split(' ');
            let roadDetail = '';
            
            // 뒤에서부터 검사하여 숫자로 끝나는 부분과 그 앞의 "길" 또는 "로"로 끝나는 부분 찾기
            for (let i = roadParts.length - 1; i >= 0; i--) {
              const part = roadParts[i];
              // 숫자가 포함된 부분이면
              if (/\d/.test(part)) {
                roadDetail = part + (roadDetail ? ' ' + roadDetail : '');
              } 
              // "길", "로", "대로" 등으로 끝나는 부분이면 포함하고 중단
              else if (/[길로대]$/.test(part)) {
                roadDetail = part + (roadDetail ? ' ' + roadDetail : '');
                break;
              }
            }
            
            // 상세주소 조합: "지번숫자(도로명)" 형식
            let finalDetail = '';
            if (detailFromJibun && roadDetail) {
              finalDetail = `${detailFromJibun}(${roadDetail})`;
            } else if (detailFromJibun) {
              finalDetail = detailFromJibun;
            } else if (roadDetail) {
              finalDetail = `(${roadDetail})`;
            }
            
            onSelect(mainAddress, finalDetail);
          },
          width: '100%',
          height: '100%',
        }).embed(postcodeRef.current);
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, [isOpen, onSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[560px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>주소 검색</span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="rounded-md overflow-hidden h-[450px]" style={{ border: '1px solid var(--border)' }}>
          <div ref={postcodeRef} className="w-full h-full" />
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