import { useState } from "react";
import { FareRuleModal } from "../modals/FareRuleModal";
import svgPaths from "../../../imports/svg-s1pcv0aano";

interface BottomSectionProps {
  specialType: string;
}

export function BottomSection({ specialType }: BottomSectionProps) {
  const [fareRuleOpen, setFareRuleOpen] = useState(false);

  // 기본 요금
  const baseFare = 115000;
  
  // 특이사항에 따른 요금 계산
  const calculateFare = () => {
    switch (specialType) {
      case "긴급":
        return baseFare + 10000; // 기본 + 1만원
      case "혼적":
        return baseFare * 0.5; // 기본의 50%
      case "왕복":
        return baseFare * 1.8; // 기본의 180%
      default:
        return baseFare; // 기본
    }
  };

  const finalFare = calculateFare();

  return (
    <>
      {/* PC 버전: ㄱ자 레이아웃 */}
      <div className="mt-5 max-[768px]:hidden">
        <div className="flex justify-end items-end gap-2.5 mb-2.5">
          <div className="w-[250px] h-[60px] rounded-[2px] flex items-center px-5 justify-between flex-shrink-0" style={{ background: 'var(--bg)' }}>
            <span className="text-base" style={{ color: 'var(--gray)' }}>예상거리</span>
            <span className="text-xl font-semibold" style={{ color: 'var(--black)' }}>36.15 km</span>
          </div>

          <div className="w-[250px] h-[95px] relative flex-shrink-0 overflow-visible">
            <div
              className="absolute left-[50px] top-[10px] w-[150px] h-[35px] cursor-pointer z-10 group"
              onClick={() => setFareRuleOpen(true)}
              style={{
                animation: 'floatUpDown 2s ease-in-out infinite'
              }}
            >
              <style>{`
                @keyframes floatUpDown {
                  0%, 100% {
                    transform: translateY(0px);
                  }
                  50% {
                    transform: translateY(-8px);
                  }
                }
              `}</style>
              <svg className="absolute block size-full transition-all group-hover:scale-110 group-active:scale-105" fill="none" preserveAspectRatio="none" viewBox="0 0 150 35">
                <path d={svgPaths.peb79a00} fill="var(--black)" style={{ borderRadius: '20px' }} />
              </svg>
              <p className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 font-semibold text-sm text-center text-white whitespace-nowrap leading-none" style={{ top: '13.5px' }}>
                요금약관 확인하기
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-[60px] rounded-[2px] flex items-center px-5 justify-between z-0" style={{ background: 'var(--bg)' }}>
              <span className="text-base" style={{ color: 'var(--gray)' }}>예상요금</span>
              <span className="text-xl font-semibold" style={{ color: 'var(--blue)' }}>
                {finalFare.toLocaleString()} 원
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button className="w-40 h-[60px] rounded-md text-xl text-white flex items-center justify-center transition-colors hover:!bg-[#00397D] active:brightness-95 flex-shrink-0" style={{ background: 'var(--blue)' }}>
            접수하기
          </button>
        </div>
      </div>

      {/* 모바일 버전 */}
      <div className="hidden max-[768px]:flex flex-col items-stretch gap-5 mt-5">
        {/* 모바일 전용: 거리 + 요금 통합 블록 */}
        <div className="w-full">
          <div className="rounded-[2px]" style={{ background: 'var(--bg)' }}>
            <div className="h-[60px] flex items-center px-5 justify-between" style={{ borderBottom: '1px solid var(--border3)' }}>
              <span className="text-base" style={{ color: 'var(--gray)' }}>예상거리</span>
              <span className="text-xl font-semibold" style={{ color: 'var(--black)' }}>36.15 km</span>
            </div>
            <div className="h-[60px] flex items-center px-5 justify-between">
              <span className="text-base" style={{ color: 'var(--gray)' }}>예상요금</span>
              <span className="text-xl font-semibold" style={{ color: 'var(--blue)' }}>
                {finalFare.toLocaleString()} 원
              </span>
            </div>
          </div>
          <div className="h-10 flex items-center justify-end">
            <button
              className="text-sm cursor-pointer underline"
              style={{ color: 'var(--black)' }}
              onClick={() => setFareRuleOpen(true)}
            >
              요금약관 확인하기
            </button>
          </div>
        </div>

        <button className="w-full h-[60px] rounded-md text-xl text-white flex items-center justify-center transition-colors hover:!bg-[#00397D] active:brightness-95" style={{ background: 'var(--blue)' }}>
          접수하기
        </button>
      </div>

      <FareRuleModal
        isOpen={fareRuleOpen}
        onClose={() => setFareRuleOpen(false)}
      />
    </>
  );
}