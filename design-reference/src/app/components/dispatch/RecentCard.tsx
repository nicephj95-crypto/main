interface AddressData {
  addr: string;
  detail: string;
  name: string;
  manager: string;
  tel: string;
  method: string;
  schedule: string;
}

interface VehicleData {
  category: string;
  ton: string;
  type: string;
  specialType: string;
  notes: string;
  cargo: string;
  payment: string;
}

interface RecentDispatch {
  from: AddressData;
  to: AddressData;
  vehicle: VehicleData;
  displayFrom: string;
  displayTo: string;
  company: string; // 회사 정보 추가
}

interface RecentCardProps {
  onSelectRecent: (data: { from: AddressData; to: AddressData; vehicle: VehicleData }) => void;
  userCompany?: string | null; // 고객 권한 시 회사 필터링용
}

export function RecentCard({ onSelectRecent, userCompany }: RecentCardProps) {
  // Mock recent routes with full data - 마루시공업체B는 2개만
  const recentRoutes: RecentDispatch[] = [
    {
      displayFrom: "청라국제도시역 푸르지오시티",
      displayTo: "잇츠PC 용현점",
      company: "마루시공업체B",
      from: {
        addr: "인천 서구 청라국제도시역로 12",
        detail: "푸르지오시티 101동 201호",
        name: "청라국제도시역 푸르지오시티",
        manager: "김철수",
        tel: "010-1234-5678",
        method: "포크레인",
        schedule: "바로 상차"
      },
      to: {
        addr: "인천 남구 용현동 123-45",
        detail: "잇츠PC 용현점",
        name: "잇츠PC 용현점",
        manager: "이영희",
        tel: "010-9876-5432",
        method: "지게차",
        schedule: "바로 하차"
      },
      vehicle: {
        category: "1톤이상",
        ton: "1톤",
        type: "카고",
        specialType: "기본",
        notes: "도착 전 전화 주세요",
        cargo: "컴퓨터 부품 3박스",
        payment: "카드"
      }
    },
    {
      displayFrom: "서울 강남구 테헤란로",
      displayTo: "서울 종로구 세종대로",
      company: "한국물류A",
      from: {
        addr: "서울 강남구 테헤란로 152",
        detail: "강남파이낸스센터 10층",
        name: "서울 강남구 테헤란로",
        manager: "박지성",
        tel: "010-1111-2222",
        method: "수작업",
        schedule: "바로 상차"
      },
      to: {
        addr: "서울 종로구 세종대로 209",
        detail: "정부서울청사 별관",
        name: "서울 종로구 세종대로",
        manager: "손흥민",
        tel: "010-3333-4444",
        method: "수작업",
        schedule: "바로 하차"
      },
      vehicle: {
        category: "오토바이",
        ton: "일반",
        type: "오토바이",
        specialType: "긴급",
        notes: "서류 배송",
        cargo: "계약서 1건",
        payment: "선불"
      }
    },
    {
      displayFrom: "제로백PC 청라",
      displayTo: "청라국제도시역 푸르지오시티",
      company: "마루시공업체B",
      from: {
        addr: "인천 서구 청라대로 45",
        detail: "제로백PC 청라점",
        name: "제로백PC 청라",
        manager: "박민수",
        tel: "010-2345-6789",
        method: "포크레인",
        schedule: "바로 상차"
      },
      to: {
        addr: "인천 서구 청라국제도시역로 12",
        detail: "푸르지오시티 101동 201호",
        name: "청라국제도시역 푸르지오시티",
        manager: "김철수",
        tel: "010-1234-5678",
        method: "지게차",
        schedule: "바로 하차"
      },
      vehicle: {
        category: "다마스",
        ton: "0.3톤",
        type: "다마스",
        specialType: "긴급",
        notes: "",
        cargo: "모니터 2대",
        payment: "신용"
      }
    },
    {
      displayFrom: "부산 해운대구 센텀시티",
      displayTo: "부산 남구 문현동",
      company: "부산운송C",
      from: {
        addr: "부산 해운대구 센텀중앙로 78",
        detail: "센텀시티타워 5층",
        name: "부산 해운대구 센텀시티",
        manager: "최민식",
        tel: "010-5555-6666",
        method: "포크레인",
        schedule: "오후 2시"
      },
      to: {
        addr: "부산 남구 문현동 1234-56",
        detail: "문현금융단지 빌딩 3층",
        name: "부산 남구 문현동",
        manager: "정우성",
        tel: "010-7777-8888",
        method: "지게차",
        schedule: "오후 3시"
      },
      vehicle: {
        category: "1톤이상",
        ton: "1.4톤",
        type: "카고",
        specialType: "왕복",
        notes: "무거운 화물",
        cargo: "기계 부품 5박스",
        payment: "착불"
      }
    },
    {
      displayFrom: "인천 계양구 봉오대로",
      displayTo: "인천 연수구 송도과학로",
      company: "인천로지스D",
      from: {
        addr: "인천 계양구 봉오대로 1456",
        detail: "계양산업단지 12동",
        name: "인천 계양구 봉오대로",
        manager: "안성기",
        tel: "010-3691-2580",
        method: "지게차",
        schedule: "오전 10시"
      },
      to: {
        addr: "인천 연수구 송도과학로 32",
        detail: "송도테크노파크",
        name: "인천 연수구 송도과학로",
        manager: "하정우",
        tel: "010-7410-8520",
        method: "포크레인",
        schedule: "오전 11시"
      },
      vehicle: {
        category: "1톤이상",
        ton: "3.5톤",
        type: "카고",
        specialType: "긴급",
        notes: "깨지기 쉬움",
        cargo: "유리 제품 20박스",
        payment: "착불"
      }
    },
    {
      displayFrom: "대전 유성구 대덕대로",
      displayTo: "대전 중구 대종로",
      company: "대전익스프레스E",
      from: {
        addr: "대전 유성구 대덕대로 321",
        detail: "한국과학기술원 정문",
        name: "대전 유성구 대덕대로",
        manager: "김대리",
        tel: "010-9999-0000",
        method: "수작업",
        schedule: "바로 상차"
      },
      to: {
        addr: "대전 중구 대종로 373",
        detail: "대전시청 본관",
        name: "대전 중구 대종로",
        manager: "이과장",
        tel: "010-1212-3434",
        method: "수작업",
        schedule: "바로 하차"
      },
      vehicle: {
        category: "라보",
        ton: "0.5톤",
        type: "라보",
        specialType: "기본",
        notes: "",
        cargo: "문서 보관함 3개",
        payment: "카드"
      }
    },
    {
      displayFrom: "광주 서구 상무대로",
      displayTo: "광주 북구 첨단과기로",
      company: "광주특송F",
      from: {
        addr: "광주 서구 상무대로 1456",
        detail: "상무지구 오피스텔 1204호",
        name: "광주 서구 상무대로",
        manager: "강호동",
        tel: "010-2468-1357",
        method: "포크레인",
        schedule: "오전 11시"
      },
      to: {
        addr: "광주 북구 첨단과기로 333",
        detail: "첨단테크노파크 2동",
        name: "광주 북구 첨단과기로",
        manager: "유재석",
        tel: "010-1357-2468",
        method: "지게차",
        schedule: "오후 1시"
      },
      vehicle: {
        category: "1톤이상",
        ton: "2.5톤",
        type: "윙바디",
        specialType: "혼적",
        notes: "온도 유지 필요",
        cargo: "전자부품 10박스",
        payment: "신용"
      }
    }
  ];

  const handleSelectRecent = (route: RecentDispatch) => {
    onSelectRecent({
      from: route.from,
      to: route.to,
      vehicle: route.vehicle
    });
  };

  // 고객 권한인 경우 회사 필터링
  const filteredRoutes = userCompany 
    ? recentRoutes.filter(route => route.company === userCompany)
    : recentRoutes;

  // 디버깅: 필터링 상태 확인
  console.log('🔍 RecentCard 디버깅:', {
    userCompany,
    totalRoutes: recentRoutes.length,
    filteredCount: filteredRoutes.length,
    companies: [...new Set(recentRoutes.map(r => r.company))],
    filteredRoutes: filteredRoutes.map(r => ({ from: r.displayFrom, to: r.displayTo, company: r.company }))
  });

  // 5칸을 채우기 위해 빈 항목 추가
  const displayRoutes = [...filteredRoutes];
  while (displayRoutes.length < 5) {
    displayRoutes.push(null as any);
  }

  return (
    <div className="rounded-md mb-5 px-9 py-7 max-[768px]:p-5 max-[768px]:px-4" style={{ background: 'var(--bg)' }}>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 max-[768px]:grid-cols-3 max-[480px]:grid-cols-2 gap-2.5">
        {displayRoutes.slice(0, 5).map((route, index) => (
          route ? (
            <div
              key={index}
              className="w-full h-20 bg-white rounded-[2px] px-5 pr-5 pl-[39px] flex flex-col justify-center relative cursor-pointer transition-all hover:!border-[#0075FF] max-[768px]:[&:nth-child(n+5)]:hidden"
              style={{ border: '1px solid var(--border2)' }}
              onClick={() => handleSelectRecent(route)}
            >
              <div className="absolute left-[19px] top-[22px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--dot-b)' }} />
              <div className="absolute left-[19px] top-[50px] w-1.5 h-1.5 rounded-full" style={{ background: 'var(--dot-r)' }} />
              <div className="text-sm leading-[2] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--black)' }}>
                {route.displayFrom}
              </div>
              <div className="text-sm leading-[2] whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--black)' }}>
                {route.displayTo}
              </div>
            </div>
          ) : (
            <div
              key={`empty-${index}`}
              className="w-full h-20 bg-white rounded-[2px] flex items-center justify-center max-[768px]:[&:nth-child(n+5)]:hidden"
              style={{ border: '1px solid var(--border2)' }}
            >
              <span className="text-xs" style={{ color: 'var(--border2)' }}>최근 이력이 없습니다</span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}