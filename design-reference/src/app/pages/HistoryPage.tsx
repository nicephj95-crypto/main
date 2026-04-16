import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Search, FileSpreadsheet } from "lucide-react";
import { Footer } from "../components/Footer";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { DispatchHistoryMobileCard } from "../components/DispatchHistoryMobileCard";
import { DriverLocationModal } from "../components/modals/DriverLocationModal";
import { DispatchStatusModal } from "../components/modals/DispatchStatusModal";
import { HistoryModal } from "../components/modals/HistoryModal";
import { useAuth } from "../contexts/AuthContext";

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
  arrivalImages?: string[]; // 도착보고 이미지 (최대 5장)
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

// 주소록 데이터 (특이사항 참조용)
const addressBookData = [
  { name: "효진이네", note: "" },
  { name: "현서네", note: "" },
  { name: "302호 렌지네", note: "도착 전 반드시 하차지 통화" },
  { name: "301호 이자네", note: "도착 전 반드시 하차지 통화" },
  { name: "청라 제로백PC방", note: "검수 및 대기 (20~90분)" },
  { name: "용현동 잇츠PC", note: "도착 전 반드시 하차지 통화" },
  { name: "204호 비타네", note: "" },
  { name: "203호 민이네", note: "" },
  { name: "잇츠PC 용현점", note: "도착 전 반드시 하차지 통화" },
];

const initialMockHistory: DispatchHistory[] = [
  { date: "2025.12.01", time: "15:38:02", company: "화장품공장A", rep: "김생산 팀장", fN: "청라국제도시역 푸르지오시티", fT: "010-4902-2652", fA: "인천 서구 에코로 65 1402호", tN: "잇츠PC 용현점", tT: "010-8617-7250", tA: "인천 미추홀구 낙섬중로 100", car: "1.4톤", ctype: "카고", note: "긴급 / 3파렛트", bl: "BL : TWW847651201", driver: "", status: "접수중", pickupTime: "바로상차", deliveryTime: "바로하차", fare: "120,000원", specialType: "긴급", paymentMethod: "착불", orderNumber: "A251201001", assignee: "" },
  { date: "2025.12.01", time: "15:21:59", company: "마루시공업체B", rep: "정영업 부장", fN: "제로백PC 청라", fT: "010-1234-9876", fA: "인천 서구 청라 100 3층", tN: "청라국제도시역 푸르지오시티", tT: "010-4902-2652", tA: "인천 서구 에코로 65 1402호", car: "1톤", ctype: "전체", note: "기본 / 2파렛트", bl: "BL : TWW847650952", driver: "", status: "배차중", pickupTime: "251202 09:30", deliveryTime: "251202 10:30", fare: "95,000원", specialType: "기본", paymentMethod: "선불", orderNumber: "B251201001", assignee: "김배차" },
  { date: "2025.12.01", time: "14:52:20", company: "화장품공장A", rep: "박구매 과장", fN: "잇츠PC 용현점", fT: "010-8617-7250", fA: "인천 미추홀구 낙섬중로 100", tN: "제로백PC 청라 신현서 대리", tT: "010-1234-9876", tA: "인천 서구 청라 100 3층", car: "0톤", ctype: "오토바이", note: "기본 / 샘플 전달", bl: "", driver: "김철수\\n010-0000-0000\\n인천82바9876\\n1톤/윙바디", status: "배차완료", pickupTime: "바로상차", deliveryTime: "251202 10:00", fare: "35,000원", specialType: "혼적", paymentMethod: "신용", orderNumber: "A251201002", assignee: "이배차" },
  { date: "2025.12.01", time: "14:52:20", company: "마루시공업체B", rep: "윤물류 팀장", fN: "잇츠PC 용현점", fT: "010-8617-7250", fA: "인천 미추홀구 낙섬중로 100", tN: "레드진영 넥서스 앞", tT: "02-1234-9874", tA: "리그 랭크 운타라 902", car: "0톤", ctype: "오토바이", note: "기본 / 샘플 전달", bl: "", driver: "홍길동\\n010-XXXX-XXXX\\n인천86고1234\\n1.4톤/카고", status: "배차완료", pickupTime: "251202 09:00", deliveryTime: "바로하차", fare: "40,000원", specialType: "왕복", paymentMethod: "카드", orderNumber: "B251201002", assignee: "김배차", arrivalImages: ["https://via.placeholder.com/300", "https://via.placeholder.com/300"] },
  { date: "2025.12.01", time: "14:47:31", company: "헬스가구제조C", rep: "송관리 차장", fN: "그 뭐냐 뭐더라 어디더라 진짜 어디지", fT: "010-3210-6541", fA: "서울 강서 공항동 119 2층", tN: "청라국제도시역 푸르지오시티", tT: "010-4902-2652", tA: "인천 서구 에코로 65 1402호", car: "0톤", ctype: "오토바이", note: "기본 / 샘플 전달", bl: "", driver: "김철수\\n010-0000-0000\\n인천82바9876\\n1톤/윙바디", status: "취소", pickupTime: "251201 17:00", deliveryTime: "251201 20:00", fare: "38,000원", specialType: "기본", paymentMethod: "신용", orderNumber: "C251201001", assignee: "박배차" },
];

export function HistoryPage() {
  const navigate = useNavigate();
  const { userRole, company } = useAuth();
  
  const [historyData, setHistoryData] = useState<DispatchHistory[]>(initialMockHistory);
  
  // 주소록에서 특이사항 가져오기 함수
  const getPlaceNote = (placeName: string): string => {
    const addressItem = addressBookData.find(item => item.name === placeName);
    return addressItem?.note || "";
  };
  
  // 날짜 기본값 설정: 2025년 11월 25일 ~ 12월 1일
  const defaultDates = {
    from: '2025-11-25',
    to: '2025-12-01'
  };
  
  const [dateFrom, setDateFrom] = useState(defaultDates.from);
  const [dateTo, setDateTo] = useState(defaultDates.to);
  const [dateSearchType, setDateSearchType] = useState<"접수일" | "상차일">("접수일");
  const [fromName, setFromName] = useState("");
  const [toName, setToName] = useState("");
  const [activeTab, setActiveTab] = useState("전체");
  const [selectedItem, setSelectedItem] = useState<DispatchHistory | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<DispatchHistory | null>(null);
  const [driverLocationModalOpen, setDriverLocationModalOpen] = useState(false);
  const [driverLocationItem, setDriverLocationItem] = useState<DispatchHistory | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusModalItem, setStatusModalItem] = useState<DispatchHistory | null>(null);

  // 변경이력 모달 상태
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState('');
  const [historyModalData, setHistoryModalData] = useState<any[]>([]);

  const [tempDateFrom, setTempDateFrom] = useState(dateFrom);
  const [tempDateTo, setTempDateTo] = useState(dateTo);
  const [tempDateSearchType, setTempDateSearchType] = useState<"접수일" | "상차일">(dateSearchType);
  const [tempFromName, setTempFromName] = useState("");
  const [tempToName, setTempToName] = useState("");
  const [tempActiveTab, setTempActiveTab] = useState(activeTab);

  // 사용자 타입 및 정보 (실제로는 로그인 시스템과 연동)
  const [userType, setUserType] = useState<'우리회사' | '고객사'>('우리회사'); // 임시로 우리회사로 설정
  const [currentUserName, setCurrentUserName] = useState('이배차'); // 현재 로그인한 사용자 이름

  // 도착보고 이미지 관련 상태
  const [arrivalReportOpen, setArrivalReportOpen] = useState(false);
  const [arrivalReportItem, setArrivalReportItem] = useState<DispatchHistory | null>(null);
  const [arrivalRequestConfirmOpen, setArrivalRequestConfirmOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0); // 현재 이미지 인덱스
  
  // 배차정보 모달 상태
  const [dispatchInfoOpen, setDispatchInfoOpen] = useState(false);
  const [dispatchInfoItem, setDispatchInfoItem] = useState<DispatchHistory | null>(null);
  const [specialReasonsOpen, setSpecialReasonsOpen] = useState(false);
  const [pickupReasons, setPickupReasons] = useState<string[]>([]);
  const [deliveryReasons, setDeliveryReasons] = useState<string[]>([]);
  const [tempPickupReasons, setTempPickupReasons] = useState<string[]>([]);
  const [tempDeliveryReasons, setTempDeliveryReasons] = useState<string[]>([]);
  const [driverNameInput, setDriverNameInput] = useState('');
  const [driverPhoneInput, setDriverPhoneInput] = useState('');
  const [carNumberInput, setCarNumberInput] = useState('');
  const [additionalFareInput, setAdditionalFareInput] = useState('');
  const [orderNumberInput, setOrderNumberInput] = useState('');
  const [carTonInput, setCarTonInput] = useState('');
  const [carTypeInput, setCarTypeInput] = useState('');
  const [actualFareInput, setActualFareInput] = useState('');
  const [billingFareInput, setBillingFareInput] = useState('');
  
  // dispatchInfoItem이 변경될 때 driver 정보 파싱
  useEffect(() => {
    if (dispatchInfoItem && dispatchInfoItem.driver) {
      const driverInfo = dispatchInfoItem.driver.split('\\n');
      setDriverNameInput(driverInfo[0] || '');
      setDriverPhoneInput(driverInfo[1] || '');
      setCarNumberInput(driverInfo[2] || '');
      
      // 차량 정보 파싱: "1톤/윙바디" 형식
      const carInfo = driverInfo[3] || '';
      const carParts = carInfo.split('/');
      setCarTonInput(carParts[0] || '');
      setCarTypeInput(carParts[1] || '');
    } else {
      setDriverNameInput('');
      setDriverPhoneInput('');
      setCarNumberInput('');
      setCarTonInput('');
      setCarTypeInput('');
    }
    
    if (dispatchInfoItem) {
      setOrderNumberInput(dispatchInfoItem.orderNumber || '');
      setActualFareInput(dispatchInfoItem.actualFare || '');
      setBillingFareInput(dispatchInfoItem.billingFare || '');
      setAdditionalFareInput(dispatchInfoItem.additionalFare || '');
      
      // additionalFareReason에서 특이사항 파싱
      if (dispatchInfoItem.additionalFareReason) {
        const reasons = dispatchInfoItem.additionalFareReason.split(',').map(r => r.trim());
        setPickupReasons(reasons);
        setDeliveryReasons([]);
      } else {
        setPickupReasons([]);
        setDeliveryReasons([]);
      }
    } else {
      setOrderNumberInput('');
      setActualFareInput('');
      setBillingFareInput('');
      setAdditionalFareInput('');
      setPickupReasons([]);
      setDeliveryReasons([]);
    }
  }, [dispatchInfoItem]);

  // 1단계: 날짜 범위 필터링 (상태별 건수 계산용)
  const dateFilteredHistory = historyData.filter(h => {
    const itemDate = h.date.replace(/\./g, '-');
    
    if (dateSearchType === "접수일") {
      if (itemDate < dateFrom || itemDate > dateTo) return false;
    } else {
      // 상차일 기준 필터
      let pickupDateTime = '';
      if (!h.pickupTime || h.pickupTime === "바로상차") {
        // 바로상차는 접수일시와 동일하게 취급
        pickupDateTime = itemDate + ' ' + h.time;
      } else {
        // "251201 18:00" 형식을 "2025-12-01 18:00"으로 변환
        const yymmdd = h.pickupTime.substring(0, 6);
        const time = h.pickupTime.substring(7);
        pickupDateTime = `20${yymmdd.substring(0, 2)}-${yymmdd.substring(2, 4)}-${yymmdd.substring(4, 6)} ${time}`;
      }
      
      // 상차일 범위 계산: dateFrom 00:00 ~ dateTo 익일 09:10 이하
      const fromDateTime = dateFrom + ' 00:00';
      
      // dateTo의 익일 09:10 계산 (09:00 이하까지 포함하기 위해)
      const toDateObj = new Date(dateTo);
      toDateObj.setDate(toDateObj.getDate() + 1);
      const nextDay = toDateObj.toISOString().split('T')[0];
      const toDateTime = nextDay + ' 09:10';
      
      if (pickupDateTime < fromDateTime || pickupDateTime >= toDateTime) return false;
    }
    
    return true;
  });

  // 2단계: 회사 필터링 (고객 권한인 경우)
  const companyFilteredHistory = dateFilteredHistory.filter(h => {
    if (userRole === '고객' && company) {
      return h.company === company;
    }
    return true;
  });

  const statusCounts = {
    "전체": companyFilteredHistory.length,
    "접수중": companyFilteredHistory.filter(h => h.status === "접수중").length,
    "배차중": companyFilteredHistory.filter(h => h.status === "배차중").length,
    "배차완료": companyFilteredHistory.filter(h => h.status === "배차완료").length,
    "취소": companyFilteredHistory.filter(h => h.status === "취소").length,
  };

  // 3단계: 상태별, 출발지/도착지 필터링
  const filteredHistory = companyFilteredHistory.filter(h => {
    if (activeTab !== "전체" && h.status !== activeTab) return false;
    if (fromName && !h.fN.toLowerCase().includes(fromName.toLowerCase())) return false;
    if (toName && !h.tN.toLowerCase().includes(toName.toLowerCase())) return false;
    return true;
  });

  // 정렬: 접수일 또는 상차일 기준
  const sortedHistory = [...filteredHistory].sort((a, b) => {
    if (dateSearchType === "접수일") {
      // 접수일시 기준 정렬 (최신순)
      const aDateTime = a.date.replace(/\./g, '') + a.time.replace(/:/g, '');
      const bDateTime = b.date.replace(/\./g, '') + b.time.replace(/:/g, '');
      return bDateTime.localeCompare(aDateTime);
    } else {
      // 상차일 기준 정렬 (최신순)
      const getPickupDateTime = (item: DispatchHistory) => {
        if (!item.pickupTime || item.pickupTime === "바로상차") {
          // 바로상차는 접수일시와 동일하게 취급
          return item.date.replace(/\./g, '') + item.time.replace(/:/g, '');
        }
        // "251201 18:00" 형식을 "20251201180000"으로 변환
        const pickup = item.pickupTime.replace(/\s/g, '');
        const yymmdd = pickup.substring(0, 6); // "251201"
        const hhmm = pickup.substring(6); // "18:00"
        return '20' + yymmdd + hhmm.replace(/:/g, '') + '00';
      };
      
      const aPickup = getPickupDateTime(a);
      const bPickup = getPickupDateTime(b);
      return bPickup.localeCompare(aPickup);
    }
  });

  const getStatusBadgeClass = (status: string) => {
    const baseClass = "inline-flex items-center justify-center h-8 w-[70px] rounded text-sm text-white whitespace-nowrap";
    switch (status) {
      case "접수중": return baseClass + " bg-[#f0a983]";
      case "배차중": return baseClass + " bg-[#839cf0]";
      case "배차완료": return baseClass + " bg-[#90c083]";
      case "취소": return baseClass + " bg-[#b8b8b8]";
      default: return baseClass;
    }
  };

  const getSpecialPaymentBadges = (item: DispatchHistory) => {
    const badges = [];
    if (item.specialType && item.specialType !== "기본") {
      badges.push(item.specialType);
    }
    if (item.paymentMethod && item.paymentMethod !== "신용") {
      badges.push(item.paymentMethod);
    }
    return badges;
  };

  const handleCopyToDispatch = (item: DispatchHistory) => {
    const noteParts = item.note.split(" / ");
    const specialType = noteParts[0] || "기본";
    const cargo = noteParts[1] || "";

    const carMapping: { [key: string]: { category: string; ton: string; type: string } } = {
      "0톤": { category: "오토바이", ton: "일반", type: "오토바이" },
      "1톤": { category: "1톤이상", ton: "1톤", type: "윙바디" },
      "1.4톤": { category: "1톤이상", ton: "1.4톤", type: "고" },
    };

    const vehicleInfo = carMapping[item.car] || { category: "오토바이", ton: "일반", type: "오토바이" };

    navigate("/", {
      state: {
        copiedData: {
          from: {
            addr: item.fA,
            detail: "",
            name: item.fN,
            manager: "",
            tel: item.fT,
            method: "",
          },
          to: {
            addr: item.tA,
            detail: "",
            name: item.tN,
            manager: "",
            tel: item.tT,
            method: "",
          },
          vehicle: {
            category: vehicleInfo.category,
            ton: vehicleInfo.ton,
            type: item.ctype === "전체" ? vehicleInfo.type : item.ctype,
            specialType: specialType,
            notes: "",
            cargo: cargo,
            payment: "신용",
          },
        },
      },
    });
  };

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (selectedItem || showMobileFilter || alertMessage || deleteConfirmOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedItem, showMobileFilter, alertMessage, deleteConfirmOpen]);

  return (
    <>
      <div className="max-w-[1180px] mx-auto px-1 pt-10 pb-20 max-[1280px]:px-2 max-[768px]:px-4 max-[768px]:pt-5 max-[768px]:pb-12">
        {/* Filters - Desktop */}
        <div className="flex items-center gap-2.5 mb-5 flex-wrap max-[768px]:hidden">
          <button 
            className="h-10 rounded-3xl px-3.5 text-sm outline-none transition-all cursor-pointer font-medium" 
            style={{ 
              background: 'var(--bg2)', 
              color: 'var(--black)', 
              border: 'none'
            }}
            onClick={() => setDateSearchType(dateSearchType === "접수일" ? "상차일" : "접수일")}
          >
            {dateSearchType}
          </button>
          
          <div className="flex items-center h-10 rounded-3xl px-3.5 gap-2" style={{ background: 'var(--bg2)' }}>
            <input
              type="date"
              className="h-full bg-transparent outline-none text-sm cursor-pointer"
              style={{ color: 'var(--black)', border: 'none', width: '105px' }}
              value={dateFrom}
              onChange={(e) => {
                const newFrom = e.target.value;
                setDateFrom(newFrom);
                // 시작일이 종료일보다 나중이면 종료일을 시작일과 동일하게 설정
                if (newFrom > dateTo) {
                  setDateTo(newFrom);
                }
              }}
            />
            <span className="text-sm" style={{ color: 'var(--gray)' }}>~</span>
            <input
              type="date"
              className="h-full bg-transparent outline-none text-sm cursor-pointer"
              style={{ color: 'var(--black)', border: 'none', width: '105px' }}
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <div className="flex items-center h-10 rounded-3xl px-4 gap-1.5" style={{ background: 'var(--bg2)' }}>
            <input
              className="border-none outline-none bg-transparent text-sm w-[100px] text-center"
              style={{ color: 'var(--black)' }}
              type="text"
              placeholder="출발지명"
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
            />
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M8 5l5 5-5 5" stroke="var(--gray)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <input
              className="border-none outline-none bg-transparent text-sm w-[100px] text-center"
              style={{ color: 'var(--black)' }}
              type="text"
              placeholder="도착지명"
              value={toName}
              onChange={(e) => setToName(e.target.value)}
            />
          </div>

          <button className="w-10 h-10 rounded-3xl flex items-center justify-center flex-shrink-0 transition-colors" style={{ background: 'var(--bg2)' }}>
            <Search size={16} style={{ stroke: 'var(--gray)' }} />
          </button>
        </div>

        {/* Filters - Mobile */}
        <div className="hidden max-[768px]:block space-y-2.5 mb-4">
          <button 
            className="w-full h-11 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors active:opacity-80"
            style={{ background: 'var(--bg2)', color: 'var(--black)' }}
            onClick={() => {
              setTempDateFrom(dateFrom);
              setTempDateTo(dateTo);
              setTempDateSearchType(dateSearchType);
              setTempFromName(fromName);
              setTempToName(toName);
              setTempActiveTab(activeTab);
              setShowMobileFilter(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M6 10h8M8 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>필터</span>
            {(fromName || toName || activeTab !== "전체") && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: 'var(--blue)' }}>
                {[fromName, toName, activeTab !== "전체"].filter(Boolean).length}
              </span>
            )}
          </button>
          <div className="text-right text-sm" style={{ color: 'var(--gray)' }}>
            총 {filteredHistory.length}건
          </div>
        </div>

        {/* Tab Bar */}
        <div className="flex items-end gap-0 mb-5 flex-wrap max-[768px]:hidden">
          <div className="flex flex-1 overflow-x-auto">
            {Object.entries(statusCounts).map(([status, count]) => {
              const isActive = activeTab === status;
              const borderColor = isActive ? '#0075ff' : '#d9d9d9';
              
              return (
                <button
                  key={status}
                  onClick={() => setActiveTab(status)}
                  className={`h-10 whitespace-nowrap text-sm bg-white flex-shrink-0 min-w-[150px] relative ${ 
                    isActive ? 'font-bold' : ''
                  }`}
                  style={{
                    borderWidth: '1px',
                    borderStyle: 'solid',
                    borderColor: borderColor,
                    color: isActive ? '#0075ff' : '#000000',
                    zIndex: isActive ? 2 : 1,
                    marginLeft: status === '전체' ? '0' : '-1px',
                  }}
                >
                  <div className="flex items-center justify-between w-full px-[19px]">
                    <span>{status}</span>
                    <span>{count}건</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 h-10 pb-px ml-2.5">
            <select className="h-10 rounded-[2px] bg-white text-sm px-4 pr-8 appearance-none cursor-pointer outline-none min-w-[140px]" style={{ border: '1px solid var(--border3)', color: 'var(--black)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23767676' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
              <option>100개씩 보기</option>
              <option>50개씩 보기</option>
              <option>전체 보기</option>
            </select>

            <button className="w-10 h-10 rounded-[2px] flex items-center justify-center bg-white flex-shrink-0 transition-colors" style={{ border: '1px solid var(--border3)' }} title="엑셀">
              <FileSpreadsheet size={20} style={{ stroke: '#107c41' }} />
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="relative z-0 -mt-px max-[768px]:hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '108px' }}>접수일시</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '150px' }}>접수자</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '230px' }}>출발지</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '230px' }}>도착지</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '70px' }}>차량</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '100px' }}>운임</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '100px' }}>배차정보</th>
                  <th className="h-10 text-sm font-bold text-center px-2 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '110px' }}>기타</th>
                </tr>
              </thead>
              <tbody>
                {sortedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="bg-white text-center p-20" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--gray)' }}>
                      해당 기간에 요청하신 배차가 없습니다.
                    </td>
                  </tr>
                ) : (
                  sortedHistory.map((item, index) => {
                  const driverInfo = item.driver ? item.driver.split('\\n') : [];
                  const driverName = driverInfo[0] || '';
                  const driverPhone = driverInfo[1] || '';
                  const carNumber = driverInfo[2] || '';
                  const carDetails = driverInfo[3] || '';
                  
                  const truncateName = (name: string) => {
                    if (name.length > 15) {
                      return name.substring(0, 14) + '...';
                    }
                    return name;
                  };

                  const badges = getSpecialPaymentBadges(item);
                  
                  return (
                    <tr 
                      key={index}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => {
                        // 고객 권한: 배차상세 카드 표시
                        // 배차/영업/관리 권한: 배차상세 모달
                        setSelectedItem(item);
                      }}
                    >
                      <td className="bg-white text-[13px] text-center p-2.5" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                        <p className="leading-relaxed m-0 font-bold">{item.orderNumber}</p>
                        <p className="leading-relaxed m-0">{item.date}<br />{item.time}</p>
                      </td>
                      <td className="bg-white text-[13px] text-center p-2.5 overflow-hidden" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                        <p className="leading-relaxed m-0 whitespace-nowrap overflow-hidden text-ellipsis" title={item.company}>{item.company}</p>
                        <p className="leading-relaxed m-0 whitespace-nowrap overflow-hidden text-ellipsis" title={item.rep}>{item.rep}</p>
                        <p className="leading-relaxed m-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: 'var(--blue)' }}>{item.assignee}</p>
                      </td>
                      <td className="bg-white text-[13px] text-left p-2.5 pl-3.5" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                        {item.pickupTime && (
                          <div className="mb-1">
                            <span className="text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded inline-block" style={{ color: 'var(--blue)', background: 'rgba(0, 117, 255, 0.1)' }}>
                              {item.pickupTime}
                            </span>
                          </div>
                        )}
                        <p className="leading-relaxed m-0">
                          {getPlaceNote(item.fN) ? (
                            <span 
                              className="relative inline-block cursor-help group"
                              style={{ 
                                background: 'linear-gradient(to top, rgba(255, 255, 0, 0.4) 0%, rgba(255, 255, 0, 0.4) 50%, transparent 50%)',
                                backgroundPosition: '0 -2px'
                              }}
                              title={getPlaceNote(item.fN)}
                            >
                              {truncateName(item.fN)}
                              <span 
                                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                                style={{ minWidth: 'max-content', maxWidth: '300px', whiteSpace: 'normal' }}
                              >
                                {getPlaceNote(item.fN)}
                                <span 
                                  className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"
                                />
                              </span>
                            </span>
                          ) : (
                            <span title={item.fN}>{truncateName(item.fN)}</span>
                          )}
                          <br />{item.fT}<br />{item.fA}
                        </p>
                      </td>
                      <td className="bg-white text-[13px] text-left p-2.5 pl-3.5" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                        {item.deliveryTime && (
                          <div className="mb-1">
                            <span className="text-xs font-medium whitespace-nowrap px-2 py-0.5 rounded inline-block" style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)' }}>
                              {item.deliveryTime}
                            </span>
                          </div>
                        )}
                        <p className="leading-relaxed m-0">
                          {getPlaceNote(item.tN) ? (
                            <span 
                              className="relative inline-block cursor-help group"
                              style={{ 
                                background: 'linear-gradient(to top, rgba(255, 255, 0, 0.4) 0%, rgba(255, 255, 0, 0.4) 50%, transparent 50%)',
                                backgroundPosition: '0 -2px'
                              }}
                              title={getPlaceNote(item.tN)}
                            >
                              {truncateName(item.tN)}
                              <span 
                                className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                                style={{ minWidth: 'max-content', maxWidth: '300px', whiteSpace: 'normal' }}
                              >
                                {getPlaceNote(item.tN)}
                                <span 
                                  className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"
                                />
                              </span>
                            </span>
                          ) : (
                            <span title={item.tN}>{truncateName(item.tN)}</span>
                          )}
                          <br />{item.tT}<br />{item.tA}
                        </p>
                      </td>
                      <td className="bg-white text-[13px] text-center p-2.5" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                        <p className="leading-relaxed m-0">
                          {item.car}<br />
                          {item.ctype}
                          {badges.length > 0 && (
                            <>
                              <br />
                              <span className="text-xs font-medium whitespace-nowrap" style={{ color: 'var(--blue)' }}>
                                {badges.join(' · ')}
                              </span>
                            </>
                          )}
                        </p>
                      </td>
                      <td 
                        className="bg-white text-[13px] text-center p-2.5" 
                        style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}
                      >
                        <p className="leading-relaxed m-0">
                          {/* 고객 권한은 원가를 표시하지 않음 */}
                          {userRole !== '고객' && item.actualFare && (
                            <>
                              <span className="text-xs" style={{ color: '#666' }}>원가 : </span>
                              <span style={{ color: 'var(--black)' }}>{formatNumber(item.actualFare)}원</span>
                              <br />
                            </>
                          )}
                          {item.billingFare && (
                            <>
                              {userRole !== '고객' && <span className="text-xs" style={{ color: '#666' }}>청구 : </span>}
                              <span style={{ color: 'var(--blue)' }}>{formatNumber(item.billingFare)}원</span>
                              <br />
                            </>
                          )}
                          {item.additionalFare && item.additionalFare !== '0' && (
                            <>
                              <span style={{ color: '#ff6b6b', whiteSpace: 'nowrap' }}>+{formatNumber(item.additionalFare)}원</span>
                            </>
                          )}
                          {!item.actualFare && !item.billingFare && '-'}
                        </p>
                      </td>
                      <td 
                        className="bg-white text-[13px] text-center p-2.5 cursor-pointer hover:bg-gray-50 transition-colors" 
                        style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (userRole === '고객') {
                            // 고객 권한: 상태에 따라 다른 모달 표시
                            if (item.status === '배차완료') {
                              if (item.arrivalImages && item.arrivalImages.length > 0) {
                                // 운행완료 (도착보고 이미지 있음)
                                setStatusModalItem(item);
                                setStatusModalOpen(true);
                              } else {
                                // 배차완료이고 운행중 (도착보고 이미지 없음) - 기사위치 표시
                                setDriverLocationItem(item);
                                setDriverLocationModalOpen(true);
                              }
                            } else {
                              // 그 외 상태 (접수중, 배차중, 취소) - 운행중이 아닙니다
                              setStatusModalItem(item);
                              setStatusModalOpen(true);
                            }
                          } else {
                            // 배차/영업/관리 권한: 배차정보 입력 모달
                            setDispatchInfoItem(item);
                            setDispatchInfoOpen(true);
                          }
                        }}
                        title="클릭하여 배차정보 입력"
                      >
                        {item.driver ? (
                          <p className="leading-relaxed m-0">
                            {driverName}<br />
                            <span className="whitespace-nowrap">{driverPhone}</span><br />
                            <span className="whitespace-nowrap">{carNumber}</span><br />
                            {carDetails}
                          </p>
                        ) : (
                          <p className="leading-relaxed m-0">-</p>
                        )}
                      </td>
                      <td 
                        className="bg-white text-center p-2.5" 
                        style={{ borderBottom: '1px solid var(--border3)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex flex-col items-center gap-1.5">
                          <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                          <div className="flex items-center gap-1.5">
                            <button 
                              className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100"
                              style={{ border: '1px solid var(--border3)' }}
                              title="이미지"
                              onClick={() => {
                                // 고객 권한인 경우
                                if (userRole === '고객') {
                                  if (item.arrivalImages && item.arrivalImages.length > 0) {
                                    // 이미지가 있으면 보기만 가능
                                    setArrivalReportItem(item);
                                    setArrivalReportOpen(true);
                                  } else {
                                    // 이미지 없을 때: 운행중 or 도착보고사진 없음 안내
                                    if (item.status === '배차완료') {
                                      setAlertMessage('아직 도착보고 사진이 없습니다.');
                                    } else {
                                      setAlertMessage('아직 운행중입니다.');
                                    }
                                  }
                                } else {
                                  // 배차/영업/관리 권한
                                  if (userType === '우리회사') {
                                    setArrivalReportItem(item);
                                    setArrivalReportOpen(true);
                                  } else {
                                    if (item.arrivalImages && item.arrivalImages.length > 0) {
                                      setArrivalReportItem(item);
                                      setArrivalReportOpen(true);
                                    } else {
                                      setArrivalRequestConfirmOpen(true);
                                    }
                                  }
                                }
                              }}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect x="2" y="2" width="12" height="12" rx="1" stroke={item.arrivalImages && item.arrivalImages.length > 0 ? "var(--blue)" : "var(--gray)"} strokeWidth="1.2"/>
                                <circle cx="5.5" cy="5.5" r="1.5" fill={item.arrivalImages && item.arrivalImages.length > 0 ? "var(--blue)" : "var(--gray)"}/>
                                <path d="M2 11l3-3 2 2 3-3 3 3v2H2v-1z" fill={item.arrivalImages && item.arrivalImages.length > 0 ? "var(--blue)" : "var(--gray)"}/>
                              </svg>
                            </button>
                            <button 
                              className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100"
                              style={{ border: '1px solid var(--border3)' }}
                              title="복사"
                              onClick={() => handleCopyToDispatch(item)}
                            >
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <rect x="5" y="5" width="9" height="9" rx="1" stroke="var(--gray)" strokeWidth="1.2"/>
                                <path d="M3 11V3a1 1 0 011-1h8" stroke="var(--gray)" strokeWidth="1.2"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="mobile-history-cards space-y-3" style={{ display: 'none' }}>
          <style>{`
            @media (max-width: 768px) {
              .mobile-history-cards {
                display: block !important;
              }
            }
          `}</style>
          {sortedHistory.length === 0 ? (
            <div className="bg-white rounded-lg p-12 text-center" style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}>
              해당 기간에 요청하신 배차가 없습니다.
            </div>
          ) : (
            sortedHistory.map((item, index) => (
              <DispatchHistoryMobileCard
                key={index}
                item={item}
                index={index}
                onCardClick={(item) => {
                  if (userRole === '고객') {
                    // 고객 권한: 상태에 따라 다른 모달 표시
                    if (item.status === '배차완료' && !item.arrivalImages) {
                      // 배차완료이고 운행중 (도착보고 이미지 없음)
                      setDriverLocationItem(item);
                      setDriverLocationModalOpen(true);
                    } else {
                      // 그 외 상태 (접수중, 배차중, 취소, 운행완료)
                      setStatusModalItem(item);
                      setStatusModalOpen(true);
                    }
                  } else {
                    // 배차/영업/관리 권한: 배차상세 모달
                    setSelectedItem(item);
                  }
                }}
                onCopyClick={handleCopyToDispatch}
                getStatusBadgeClass={getStatusBadgeClass}
                getPlaceNote={getPlaceNote}
              />
            ))
          )}
        </div>

        {/* Mobile Filter Modal */}
        {showMobileFilter && (
          <div 
            className="fixed inset-0 z-50 flex items-end p-0"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
            onClick={() => setShowMobileFilter(false)}
          >
            <div 
              className="bg-white rounded-t-2xl p-6 w-full max-h-[85vh] overflow-y-auto animate-slide-up" 
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="text-lg font-bold" style={{ color: 'var(--black)' }}>필터</h3>
                <button onClick={() => setShowMobileFilter(false)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5l10 10" stroke="var(--gray)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {/* 날짜 검색 기준 */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>날짜 검색 기준</div>
                  <select 
                    value={tempDateSearchType} 
                    onChange={(e) => setTempDateSearchType(e.target.value as "접수일" | "상차일")}
                    className="w-full h-11 rounded px-3 text-sm cursor-pointer appearance-none" 
                    style={{ 
                      border: 'none', 
                      color: 'var(--black)', 
                      background: 'var(--bg2)',
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23767676' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 12px center',
                      paddingRight: '36px'
                    }}
                  >
                    <option value="접수일">접수일</option>
                    <option value="상차일">상차일</option>
                  </select>
                </div>
                
                {/* 기간 */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>기간</div>
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={tempDateFrom} 
                      onChange={(e) => {
                        const newFrom = e.target.value;
                        setTempDateFrom(newFrom);
                        // 시작일이 종료일보다 나중이면 종료일을 시작일과 동일하게 설정
                        if (newFrom > tempDateTo) {
                          setTempDateTo(newFrom);
                        }
                      }} 
                      className="flex-1 h-11 rounded px-3 text-sm" 
                      style={{ border: 'none', color: 'var(--black)', background: 'var(--bg2)' }} 
                    />
                    <span className="text-sm" style={{ color: 'var(--gray)' }}>~</span>
                    <input type="date" value={tempDateTo} onChange={(e) => setTempDateTo(e.target.value)} className="flex-1 h-11 rounded px-3 text-sm" style={{ border: 'none', color: 'var(--black)', background: 'var(--bg2)' }} />
                  </div>
                </div>
                
                {/* 출발지명 */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>출발지명</div>
                  <input type="text" placeholder="출발지명 입력" value={tempFromName} onChange={(e) => setTempFromName(e.target.value)} className="w-full h-11 rounded px-3 text-sm" style={{ border: 'none', color: 'var(--black)', background: 'var(--bg2)' }} />
                </div>
                
                {/* 도착지명 */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>도착지명</div>
                  <input type="text" placeholder="도착지명 입력" value={tempToName} onChange={(e) => setTempToName(e.target.value)} className="w-full h-11 rounded px-3 text-sm" style={{ border: 'none', color: 'var(--black)', background: 'var(--bg2)' }} />
                </div>
                
                {/* 상태 */}
                <div>
                  <div className="text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>상태</div>
                  <div className="flex items-center gap-2">
                    {["전체", "접수중", "배차중", "배차완료", "취소"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setTempActiveTab(status)}
                        className="h-9 px-3.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                        style={{
                          background: tempActiveTab === status ? 'var(--blue)' : 'var(--bg2)',
                          color: tempActiveTab === status ? '#ffffff' : 'var(--gray2)',
                        }}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* 버튼들 */}
                <div className="flex items-center gap-2 pt-2">
                  <button 
                    onClick={() => {
                      setTempDateFrom(dateFrom);
                      setTempDateTo(dateTo);
                      setTempDateSearchType(dateSearchType);
                      setTempFromName("");
                      setTempToName("");
                      setTempActiveTab("전체");
                    }} 
                    className="h-12 px-6 rounded-lg font-medium text-sm transition-colors" 
                    style={{ background: 'var(--bg2)', color: 'var(--gray)' }}
                  >
                    초기화
                  </button>
                  <button 
                    onClick={() => { 
                      setDateFrom(tempDateFrom); 
                      setDateTo(tempDateTo); 
                      setDateSearchType(tempDateSearchType);
                      setFromName(tempFromName); 
                      setToName(tempToName); 
                      setActiveTab(tempActiveTab); 
                      setShowMobileFilter(false); 
                    }} 
                    className="flex-1 h-12 rounded-lg font-bold text-sm text-white transition-colors flex items-center justify-center gap-2" 
                    style={{ background: 'var(--blue)' }}
                  >
                    <Search size={18} />
                    적용
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Detail Modal - WITH NULL CHECK */}
        {selectedItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4 max-[768px]:items-end max-[768px]:p-0" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
            onClick={() => setSelectedItem(null)}
          >
            <div 
              className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-xl max-[768px]:rounded-b-none max-[768px]:rounded-t-2xl max-[768px]:max-h-[85vh] max-[768px]:animate-slide-up" 
              style={{ border: '1px solid var(--border3)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <style>{`
                @keyframes slide-up {
                  from {
                    transform: translateY(100%);
                  }
                  to {
                    transform: translateY(0);
                  }
                }
                .animate-slide-up {
                  animation: slide-up 0.3s ease-out;
                }
              `}</style>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold" style={{ color: 'var(--black)' }}>배차 상세</h3>
                <button onClick={() => setSelectedItem(null)} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-gray-100">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M15 5L5 15M5 5l10 10" stroke="var(--gray)" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Status & Buttons & Info - Desktop: single line, Mobile: stacked */}
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-2 max-[768px]:flex-col max-[768px]:items-start max-[768px]:gap-3 max-[768px]:w-full">
                    <div className="flex items-center gap-2">
                      <span className={getStatusBadgeClass(selectedItem.status)}>{selectedItem.status}</span>
                      <button 
                        className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100" 
                        style={{ 
                          border: '1px solid var(--border3)', 
                          color: selectedItem.arrivalImages && selectedItem.arrivalImages.length > 0 ? 'var(--blue)' : 'var(--gray)' 
                        }} 
                        title="이미지"
                        onClick={() => {
                          if (userType === '우���회사') {
                            // 우리회사는 항상 이미지 모달 열기
                            setArrivalReportItem(selectedItem);
                            setArrivalReportOpen(true);
                          } else {
                            // 고객사는 이미지가 있으면 보기, 없으면 요청
                            if (selectedItem.arrivalImages && selectedItem.arrivalImages.length > 0) {
                              setArrivalReportItem(selectedItem);
                              setArrivalReportOpen(true);
                            } else {
                              setArrivalRequestConfirmOpen(true);
                            }
                          }
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                          <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                          <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor"/>
                          <path d="M2 11l3-3 2 2 3-3 3 3v2H2v-1z" fill="currentColor"/>
                        </svg>
                      </button>
                      <button className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100" style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }} onClick={() => { handleCopyToDispatch(selectedItem); setSelectedItem(null); }} title="배차접수로 복사">
                        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                          <rect x="5" y="5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                          <path d="M3 11V3a1 1 0 011-1h8" stroke="currentColor" strokeWidth="1.2"/>
                        </svg>
                      </button>
                      {/* H(History) 버튼 - 관리 권한만 표시 */}
                      {userRole === '관리' && (
                        <button 
                          className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100 text-sm font-bold" 
                          style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }} 
                          onClick={() => {
                            // Mock 변경이력 데이터
                            const mockHistories = [
                              {
                                user: '김배차',
                                timestamp: '2025.12.01 15:30:25',
                                action: '상태 변경',
                                field: '배차상태',
                                oldValue: '접수중',
                                newValue: '배차중'
                              },
                              {
                                user: '이배차',
                                timestamp: '2025.12.01 14:52:20',
                                action: '배차정보 입력',
                                field: '기사정보',
                                oldValue: '-',
                                newValue: '김철수 / 010-0000-0000'
                              },
                              {
                                user: '박배차',
                                timestamp: '2025.12.01 14:50:10',
                                action: '생성',
                                field: '',
                                oldValue: '',
                                newValue: ''
                              }
                            ];
                            setHistoryModalTitle(`배차번호 ${selectedItem.orderNumber}`);
                            setHistoryModalData(mockHistories);
                            setHistoryModalOpen(true);
                          }}
                          title="변경이력 확인"
                        >
                          H
                        </button>
                      )}
                      {/* 화물24, 인성 버튼 - 배차중일 때 우리회사 직원에게만, 고객 권한은 제외 */}
                      {selectedItem.status === "배차중" && userType === "우리회사" && userRole !== "고객" && (
                        <>
                          <button 
                            className="h-8 px-3 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100 text-xs font-bold" 
                            style={{ border: '1px solid var(--border3)', color: 'var(--black)' }} 
                            onClick={() => {
                              setAlertMessage('화물24에 등록되었습니다.');
                            }}
                            title="화물24 등록"
                          >
                            화물24
                          </button>
                          <button 
                            className="h-8 px-3 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100 text-xs font-bold" 
                            style={{ border: '1px solid var(--border3)', color: 'var(--black)' }} 
                            onClick={() => {
                              setAlertMessage('인성에 등록되었습니다.');
                            }}
                            title="인성 등록"
                          >
                            인성
                          </button>
                        </>
                      )}
                      {selectedItem.status === "접수중" && (
                        <>
                          <button className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100" style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }} onClick={() => { 
                            const itemId = `${selectedItem.date}_${selectedItem.time}`;
                            setEditingItemId(itemId);
                            handleCopyToDispatch(selectedItem); 
                            setSelectedItem(null); 
                          }} title="수정">
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                              <path d="M11.333 2a1.886 1.886 0 0 1 2.667 2.667L4.667 14H2v-2.667L11.333 2z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <button className="w-8 h-8 rounded flex items-center justify-center bg-white transition-colors hover:bg-gray-100" style={{ border: '1px solid var(--border3)', color: '#ff6b6b' }} onClick={() => { 
                            // 실시간으로 상태 재확인 (배차중으로 변경되었을 수 있음)
                            const currentItem = historyData.find(h => h.date === selectedItem.date && h.time === selectedItem.time);
                            if (currentItem && currentItem.status !== '접수중') {
                              setAlertMessage('배차 진행중입니다. 따로 취소요청 부탁드려요!');
                              setSelectedItem(null);
                              return;
                            }
                            setItemToDelete(selectedItem);
                            setDeleteConfirmOpen(true);
                          }} title="삭제">
                            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                              <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 0 1 1.334-1.334h2.666a1.333 1.333 0 0 1 1.334 1.334V4m2 0v9.333a1.333 1.333 0 0 1-1.334 1.334H4.667a1.333 1.333 0 0 1-1.334-1.334V4h9.334z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                    {/* Mobile only: Date & Company stacked */}
                    <div className="hidden max-[768px]:flex max-[768px]:flex-col max-[768px]:w-full max-[768px]:gap-2">
                      <div className="text-sm" style={{ color: 'var(--gray)' }}>{selectedItem.date} {selectedItem.time}</div>
                      <div>
                        <div className="text-xs font-bold mb-1" style={{ color: 'var(--gray)' }}>접수자</div>
                        <div className="text-sm" style={{ color: 'var(--black)' }}>{selectedItem.company} · {selectedItem.rep}</div>
                      </div>
                    </div>
                  </div>
                  {/* Desktop only: Date & Company on the right */}
                  <div className="flex items-center gap-6 max-[768px]:hidden">
                    <div className="text-sm" style={{ color: 'var(--gray)' }}>{selectedItem.date} {selectedItem.time}</div>
                    <div className="text-sm" style={{ color: 'var(--black)' }}>{selectedItem.company} · {selectedItem.rep}</div>
                  </div>
                </div>

                {/* From & To - side by side on desktop, stacked on mobile */}
                <div className="pb-4 flex items-start gap-6 max-[768px]:flex-col max-[768px]:gap-4" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1 max-[768px]:pb-4 max-[768px]:border-b max-[768px]:border-[var(--border)]">
                    {selectedItem.pickupTime && (
                      <div className="mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded inline-block" style={{ color: 'var(--blue)', background: 'rgba(0, 117, 255, 0.1)' }}>
                          {selectedItem.pickupTime}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: 'var(--blue)' }}></div>
                      <div className="text-sm font-bold break-words" style={{ color: 'var(--black)' }}>{selectedItem.fN}</div>
                    </div>
                    <div className="text-sm mb-1 break-words" style={{ color: 'var(--gray)' }}>{selectedItem.fT}</div>
                    <div className="text-sm break-words" style={{ color: 'var(--gray)' }}>{selectedItem.fA}</div>
                  </div>
                  <div className="flex-1">
                    {selectedItem.deliveryTime && (
                      <div className="mb-2">
                        <span className="text-xs font-medium px-2 py-0.5 rounded inline-block" style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)' }}>
                          {selectedItem.deliveryTime}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#ff6b6b' }}></div>
                      <div className="text-sm font-bold break-words" style={{ color: 'var(--black)' }}>{selectedItem.tN}</div>
                    </div>
                    <div className="text-sm mb-1 break-words" style={{ color: 'var(--gray)' }}>{selectedItem.tT}</div>
                    <div className="text-sm break-words" style={{ color: 'var(--gray)' }}>{selectedItem.tA}</div>
                  </div>
                </div>

                {/* Vehicle & Fare - side by side */}
                <div className="pb-4 flex items-start gap-6" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex-1">
                    <div className="text-sm" style={{ color: 'var(--black)' }}>
                      <span className="text-xs font-bold mr-2" style={{ color: 'var(--gray)' }}>차량 정보</span>
                      {selectedItem.car} / {selectedItem.ctype}
                    </div>
                  </div>
                  {(selectedItem.actualFare || selectedItem.billingFare || selectedItem.additionalFare) && (
                    <div className="flex-1">
                      <div className="text-sm" style={{ color: 'var(--black)' }}>
                        <span className="text-xs font-bold mr-2" style={{ color: 'var(--gray)' }}>운임</span>
                        <div className="space-y-1">
                          {/* 고객 권한은 원가를 표시하지 않음 */}
                          {userRole !== '고객' && selectedItem.actualFare && (
                            <div>
                              <span className="text-xs" style={{ color: '#666' }}>원가 : </span>
                              <span>{formatNumber(selectedItem.actualFare)}원</span>
                            </div>
                          )}
                          {selectedItem.billingFare && (
                            <div>
                              <span className="text-xs" style={{ color: '#666' }}>청구 : </span>
                              <span style={{ color: 'var(--blue)' }}>{formatNumber(selectedItem.billingFare)}원</span>
                            </div>
                          )}
                          {selectedItem.additionalFare && selectedItem.additionalFare !== '0' && (
                            <div style={{ whiteSpace: 'nowrap' }}>
                              <span style={{ color: '#ff6b6b' }}>+{formatNumber(selectedItem.additionalFare)}원</span>
                            </div>
                          )}
                        </div>
                        {selectedItem.additionalFareReason && (
                          <div className="text-xs mt-1" style={{ color: 'var(--gray)' }}>({selectedItem.additionalFareReason})</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Note & Driver Request */}
                {(selectedItem.note || selectedItem.specialType || selectedItem.paymentMethod || selectedItem.bl) && (
                  <div className="pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <div className="text-sm" style={{ color: 'var(--black)' }}>
                      <span className="text-xs font-bold mr-2" style={{ color: 'var(--gray)' }}>특이사항</span>
                      {(() => {
                        const badges = getSpecialPaymentBadges(selectedItem);
                        const noteParts = selectedItem.note ? selectedItem.note.split(" / ") : [];
                        const cargo = noteParts[1] || "";
                        const parts = [];
                        
                        if (badges.length > 0) {
                          parts.push(<span key="badges" style={{ color: 'var(--blue)' }}>{badges.join(' · ')}</span>);
                        }
                        if (cargo) {
                          parts.push(<span key="cargo">{cargo}</span>);
                        }
                        if (selectedItem.bl) {
                          parts.push(<span key="bl">{selectedItem.bl}</span>);
                        }
                        
                        return parts.length > 0 ? parts.reduce((prev, curr, i) => [prev, ' ', curr] as any) : '-';
                      })()}
                    </div>
                    {/* 기사요청사항 - 같은 영역 안에 */}
                    <div className="text-sm mt-2" style={{ color: 'var(--black)' }}>
                      <span className="text-xs font-bold mr-2" style={{ color: 'var(--gray)' }}>기사요청사항</span>
                      -
                    </div>
                  </div>
                )}

                {/* Driver */}
                {selectedItem.driver && (
                  <div 
                    className="pb-4 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors" 
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => {
                      setDispatchInfoItem(selectedItem);
                      setDispatchInfoOpen(true);
                    }}
                    title="클릭하여 배차정보 입력"
                  >
                    <div className="text-sm" style={{ color: 'var(--black)' }}>
                      <span className="text-xs font-bold mr-2" style={{ color: 'var(--gray)' }}>배차정보</span>
                      <span className="max-[768px]:hidden">{selectedItem.driver.replace(/\\n/g, ' · ')}</span>
                      <div className="hidden max-[768px]:block">
                        {(() => {
                          const parts = selectedItem.driver.split('\\\\n');
                          if (parts.length >= 4) {
                            return (
                              <>
                                <div>{parts[0]} · {parts[1]}</div>
                                <div>{parts[2]} · {parts[3]}</div>
                              </>
                            );
                          }
                          return selectedItem.driver.replace(/\\n/g, ' · ');
                        })()}
                      </div>
                    </div>
                  </div>
                )}

                {/* 배차정보 없을 때 */}
                {!selectedItem.driver && (
                  <div 
                    className="pb-4 cursor-pointer hover:bg-gray-50 -mx-6 px-6 transition-colors" 
                    style={{ borderBottom: '1px solid var(--border)' }}
                    onClick={() => {
                      setDispatchInfoItem(selectedItem);
                      setDispatchInfoOpen(true);
                    }}
                    title="클릭하여 배차정보 입력"
                  >
                    <div className="text-sm" style={{ color: 'var(--black)' }}>
                      <span className="text-xs font-bold mr-2" style={{ color: 'var(--gray)' }}>배차정보</span>
                      <span style={{ color: 'var(--gray)' }}>클릭하여 입력</span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2">
                  {/* 배차진행 버튼 - 접수중일 때만, 우리회사 직원만 */}
                  {selectedItem.status === "접수중" && userType === "우리회사" && (
                    <button
                      onClick={() => {
                        // 상태를 배차중으로 변경하고 배차담당자 설정
                        setHistoryData(prevData =>
                          prevData.map(item =>
                            item.date === selectedItem.date && item.time === selectedItem.time
                              ? { ...item, status: "배차중" as const, assignee: currentUserName }
                              : item
                          )
                        );
                        setSelectedItem(null);
                        setAlertMessage('배차 진행되었습니다.');
                      }}
                      className="flex-1 h-8 rounded text-sm font-bold bg-white transition-colors hover:bg-gray-50"
                      style={{ border: '1px solid var(--border3)', color: 'var(--black)' }}
                    >
                      배차진행
                    </button>
                  )}

                  {/* 배차수정 버튼 - 접수중일 때만 */}
                  {selectedItem.status === "접수중" && (
                    <button
                      onClick={() => {
                        const itemId = `${selectedItem.date}_${selectedItem.time}`;
                        setEditingItemId(itemId);
                        handleCopyToDispatch(selectedItem);
                        setSelectedItem(null);
                      }}
                      className="flex-1 h-8 rounded text-sm font-bold bg-white transition-colors hover:bg-gray-50"
                      style={{ border: '1px solid var(--border3)', color: 'var(--black)' }}
                    >
                      배차수정
                    </button>
                  )}

                  {/* 배차취소 버튼 - 고객 권한은 접수중일 때만, 그 외에는 접수중이거나 우리회사만 */}
                  {((userRole === "고객" && selectedItem.status === "접수중") || (userRole !== "고객" && (selectedItem.status === "접수중" || userType === "우리회사"))) && (
                    <button
                      onClick={() => {
                        // 접수중 상태에서만 실시간 상태 확인
                        if (selectedItem.status === "접수중") {
                          const currentItem = historyData.find(h => h.date === selectedItem.date && h.time === selectedItem.time);
                          if (currentItem && currentItem.status !== '접수중') {
                            setAlertMessage('배차 진행중입니다. 따로 취소요청 부탁드려요!');
                            setSelectedItem(null);
                            return;
                          }
                        }
                        setItemToDelete(selectedItem);
                        setDeleteConfirmOpen(true);
                      }}
                      className="flex-1 h-8 rounded text-sm font-bold bg-white transition-colors hover:bg-red-50"
                      style={{ border: '1px solid #ff6b6b', color: '#ff6b6b' }}
                    >
                      배차취소
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert Modal */}
        {alertMessage && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
            onClick={() => setAlertMessage("")}
          >
            <div className="bg-white rounded-lg p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="text-center mb-4">
                <div className="text-base" style={{ color: 'var(--black)' }}>{alertMessage}</div>
              </div>
              <button 
                onClick={() => setAlertMessage("")} 
                className="w-full h-12 rounded-lg font-bold text-sm text-white transition-colors" 
                style={{ background: 'var(--blue)' }}
              >
                확인
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        <ConfirmModal
          isOpen={deleteConfirmOpen}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
          }}
          onConfirm={() => {
            // 상태를 "취소"로 변경
            if (itemToDelete) {
              setHistoryData(prevData => 
                prevData.map(item => 
                  item.date === itemToDelete.date && item.time === itemToDelete.time
                    ? { ...item, status: "취소" as const }
                    : item
                )
              );
            }
            setDeleteConfirmOpen(false);
            setItemToDelete(null);
            setSelectedItem(null);
          }}
          title="삭제 확인"
          message="정말 취소하시겠습니까?"
        />

        {/* 도착보고 요청 확인 모달 */}
        {arrivalRequestConfirmOpen && (
          <ConfirmModal
            isOpen={arrivalRequestConfirmOpen}
            onClose={() => setArrivalRequestConfirmOpen(false)}
            onConfirm={() => {
              setAlertMessage('도착 보고 요청이 전송되었습니다.');
              setArrivalRequestConfirmOpen(false);
            }}
            title="도착보고 요청"
            message="도착 보고를 요청하시겠습니까?"
          />
        )}

        {/* 도착보고 이미지 모달 */}
        {arrivalReportOpen && arrivalReportItem && (() => {
          const totalImages = arrivalReportItem.arrivalImages?.length || 0;
          const hasImages = totalImages > 0;
          const canNavigate = totalImages > 1;
          
          return (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4" 
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
              onClick={() => {
                setArrivalReportOpen(false);
                setCurrentImageIndex(0); // 닫을 때 인덱스 초기화
              }}
            >
              <div 
                className="bg-white rounded-lg w-full max-w-md" 
                onClick={(e) => e.stopPropagation()}
                style={{ maxHeight: '90vh', overflow: 'auto' }}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xl font-bold" style={{ color: 'var(--black)' }}>도착 보고</h2>
                    {hasImages && (
                      <span className="text-sm" style={{ color: 'var(--text2)' }}>
                        {currentImageIndex + 1} / {totalImages}
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-4" style={{ color: 'var(--text2)' }}>
                    {arrivalReportItem.fN} &gt; {arrivalReportItem.tN}
                  </p>
                  
                  {/* 이미지 슬라이더 */}
                  {hasImages ? (
                    <div className="relative mb-4">
                      {/* 현재 이미지 */}
                      <div className="relative">
                        <img 
                          src={arrivalReportItem.arrivalImages![currentImageIndex]} 
                          alt={`도착보고 ${currentImageIndex + 1}`} 
                          className="w-full rounded" 
                        />
                        {/* 삭제 버튼 - 고객이 아니고 우리회사인 경우만 */}
                        {userRole !== '고객' && userType === '우리회사' && (
                          <button
                            onClick={() => {
                              const newImages = arrivalReportItem.arrivalImages?.filter((_, i) => i !== currentImageIndex) || [];
                              const updated = { ...arrivalReportItem, arrivalImages: newImages };
                              setHistoryData(prev =>
                                prev.map(h =>
                                  h.date === arrivalReportItem.date && h.time === arrivalReportItem.time
                                    ? updated
                                    : h
                                )
                              );
                              setArrivalReportItem(updated);
                              // 삭제 후 인덱스 조정
                              if (currentImageIndex >= newImages.length && newImages.length > 0) {
                                setCurrentImageIndex(newImages.length - 1);
                              } else if (newImages.length === 0) {
                                setCurrentImageIndex(0);
                              }
                            }}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                          >
                            ×
                          </button>
                        )}
                      </div>
                      
                      {/* 이전/다음 버튼 - 이미지가 2장 이상일 때만 */}
                      {canNavigate && (
                        <>
                          {/* 이전 버튼 */}
                          <button
                            onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : totalImages - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-md"
                            style={{ color: 'var(--black)' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          
                          {/* 다음 버튼 */}
                          <button
                            onClick={() => setCurrentImageIndex(prev => prev < totalImages - 1 ? prev + 1 : 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-md"
                            style={{ color: 'var(--black)' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                              <path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </>
                      )}
                      
                      {/* 이미지 인디케이터 - 이미지가 2장 이상일 때만 */}
                      {canNavigate && (
                        <div className="flex items-center justify-center gap-1.5 mt-3">
                          {arrivalReportItem.arrivalImages!.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setCurrentImageIndex(idx)}
                              className="w-2 h-2 rounded-full transition-all"
                              style={{ 
                                background: idx === currentImageIndex ? 'var(--blue)' : 'var(--border3)',
                                width: idx === currentImageIndex ? '8px' : '6px',
                                height: idx === currentImageIndex ? '8px' : '6px'
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-center py-8 mb-4" style={{ color: 'var(--text2)' }}>첨부된 이미지가 없습니다.</p>
                  )}

                  {/* 고객이 아닌 경우만 이미지 추가 가능 */}
                  {userRole !== '고객' && userType === '우리회사' && (!arrivalReportItem.arrivalImages || arrivalReportItem.arrivalImages.length < 5) && (
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const currentCount = arrivalReportItem.arrivalImages?.length || 0;
                        const availableSlots = 5 - currentCount;
                        
                        if (files.length > availableSlots) {
                          setAlertMessage(`최대 ${availableSlots}장까지 추가할 수 있습니다.`);
                          return;
                        }

                        // Mock: 실제로는 파일 업로드 처리
                        const newImages = files.map(f => URL.createObjectURL(f));
                        const updated = {
                          ...arrivalReportItem,
                          arrivalImages: [...(arrivalReportItem.arrivalImages || []), ...newImages]
                        };
                        
                        setHistoryData(prev =>
                          prev.map(h =>
                            h.date === arrivalReportItem.date && h.time === arrivalReportItem.time
                              ? updated
                              : h
                          )
                        );
                        setArrivalReportItem(updated);
                        // 새로 추가된 첫 번째 이미지로 이동
                        setCurrentImageIndex(currentCount);
                      }}
                      className="w-full p-2 border rounded"
                      style={{ borderColor: 'var(--border3)' }}
                    />
                  )}

                <button
                  onClick={() => {
                    setArrivalReportOpen(false);
                    setCurrentImageIndex(0); // 닫을 때 인덱스 초기화
                  }}
                  className="w-full h-12 rounded-lg font-bold text-sm text-white transition-colors mt-4"
                  style={{ background: 'var(--blue)' }}
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
          );
        })()}

        {/* 배차정보 모달 */}
        {dispatchInfoOpen && dispatchInfoItem && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.15)' }}
            onClick={() => setDispatchInfoOpen(false)}
          >
            <div 
              className="bg-white rounded-lg w-full max-[768px]:rounded-t-lg max-[768px]:rounded-b-none max-[768px]:fixed max-[768px]:bottom-0 max-[768px]:left-0 max-[768px]:right-0" 
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '850px' }}
            >
              <div className="p-8 max-[768px]:p-4 max-[768px]:max-h-[85vh] max-[768px]:overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold" style={{ color: 'var(--black)' }}>배차정보 입력</h2>
                  <span className="text-sm" style={{ color: 'var(--gray)' }}>{dispatchInfoItem.orderNumber}</span>
                </div>
                
                <div className="space-y-3">
                  {/* 오더번호 / 차주명 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>오더번호</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} placeholder="화물24, 인성 등" value={orderNumberInput} onChange={(e) => setOrderNumberInput(e.target.value)} />
                    </div>
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>차주명</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} placeholder="차주 이름" value={driverNameInput} onChange={(e) => setDriverNameInput(e.target.value)} />
                    </div>
                  </div>
                    
                  {/* 차주번호 / 차량번호 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>차주번호</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} placeholder="010-0000-0000" value={driverPhoneInput} onChange={(e) => setDriverPhoneInput(e.target.value)} />
                    </div>
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>차량번호</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} placeholder="123가4567" value={carNumberInput} onChange={(e) => setCarNumberInput(e.target.value)} />
                    </div>
                  </div>
                    
                  {/* 차량톤수 / 차량종류 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>차량톤수</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} value={carTonInput} onChange={(e) => setCarTonInput(e.target.value)} placeholder="1톤, 1.4톤 등" />
                    </div>
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>차량종류</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} value={carTypeInput} onChange={(e) => setCarTypeInput(e.target.value)} placeholder="윙바디, 카고 등" />
                    </div>
                  </div>
                    
                  {/* 실운임 / 청구가격 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex relative">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>실운임</div>
                      <input type="text" className="flex-1 h-9 px-3 pr-20 text-[13px] rounded-r focus:outline-none" style={{ background: 'rgba(255, 200, 200, 0.3)', border: 'none', color: 'var(--black)' }} value={actualFareInput} onChange={(e) => setActualFareInput(e.target.value)} placeholder="실제 배차 금액" />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-red-600 pointer-events-none">대외비*</div>
                    </div>
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>청구가격</div>
                      <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} value={billingFareInput} onChange={(e) => setBillingFareInput(e.target.value)} placeholder="화주에게 청구할 금액" />
                    </div>
                  </div>
                    
                  {/* 추가요금 / 추가사유 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>추가요금</div>
                      <input 
                        type="text" 
                        className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" 
                        style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} 
                        value={additionalFareInput} 
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, '');
                          if (value === '' || /^\d+$/.test(value)) {
                            setAdditionalFareInput(value ? Number(value).toLocaleString() : '');
                          }
                        }} 
                        placeholder="추가 요금" 
                      />
                    </div>
                    <div className="flex">
                      <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>추가사유</div>
                      <div className="flex-1 h-9 px-3 rounded-r flex items-center justify-between" style={{ background: 'var(--bg2)', border: 'none' }}>
                        <input 
                          type="text" 
                          className="flex-1 text-[13px] bg-transparent focus:outline-none overflow-hidden text-ellipsis whitespace-nowrap" 
                          style={{ color: 'var(--black)' }} 
                          value={[...pickupReasons, ...deliveryReasons].join(', ')} 
                          readOnly 
                          placeholder="추가 사유를 선택 하세요" 
                        />
                        <button
                          onClick={() => {
                            setTempPickupReasons([...pickupReasons]);
                            setTempDeliveryReasons([...deliveryReasons]);
                            setSpecialReasonsOpen(true);
                          }}
                          className="text-[13px] hover:underline ml-2 whitespace-nowrap"
                          style={{ color: 'var(--blue)' }}
                        >
                          CLICK!
                        </button>
                      </div>
                    </div>
                  </div>
                    
                  {/* 착불수익 */}
                  <div className="flex relative">
                    <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>착불수익</div>
                    <input type="text" className="flex-1 h-9 px-3 pr-20 text-[13px] rounded-r focus:outline-none" style={{ background: 'rgba(255, 200, 200, 0.3)', border: 'none', color: 'var(--black)' }} placeholder="착불로 받은 수익 금액" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-red-600 pointer-events-none">대외비*</div>
                  </div>
                    
                  {/* 업무메모 (화주에게 노출되는 내용) */}
                  <div className="flex">
                    <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>업무메모</div>
                    <input type="text" className="flex-1 h-9 px-3 text-[13px] rounded-r focus:outline-none" style={{ background: 'var(--bg2)', border: 'none', color: 'var(--black)' }} placeholder="화주에게 노출되는 메모" />
                  </div>

                  {/* 업무메모 (대외비) */}
                  <div className="flex relative">
                    <div className="w-28 h-9 flex items-center justify-center text-[13px] text-white rounded-l" style={{ background: 'var(--dark)' }}>업무메모</div>
                    <input type="text" className="flex-1 h-9 px-3 pr-20 text-[13px] rounded-r focus:outline-none" style={{ background: 'rgba(255, 200, 200, 0.3)', border: 'none', color: 'var(--black)' }} placeholder="내부용 메모" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-red-600 pointer-events-none">대외비*</div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      // 필수 입력 검증
                      if (!orderNumberInput.trim()) {
                        setAlertMessage('오더번호를 입력해주세요.');
                        return;
                      }
                      if (!driverNameInput.trim()) {
                        setAlertMessage('차주명을 입력해주세요.');
                        return;
                      }
                      if (!driverPhoneInput.trim()) {
                        setAlertMessage('차주번호를 입력해주세요.');
                        return;
                      }
                      if (!carNumberInput.trim()) {
                        setAlertMessage('차량번호를 입력해주세요.');
                        return;
                      }
                      if (!carTonInput.trim()) {
                        setAlertMessage('차량톤수를 입력해주세요.');
                        return;
                      }
                      if (!carTypeInput.trim()) {
                        setAlertMessage('차량종류를 입력해주세요.');
                        return;
                      }

                      // 운임 정보 자동 처리 (빈 값이면 0)
                      const actualFare = actualFareInput.trim() || '0';
                      const billingFare = billingFareInput.trim() || '0';
                      const additionalFare = additionalFareInput.trim() || '0';
                      
                      // historyData 업데이트
                      if (dispatchInfoItem) {
                        const updatedHistory = historyData.map(item => {
                          if (item.orderNumber === dispatchInfoItem.orderNumber) {
                            return {
                              ...item,
                              orderNumber: orderNumberInput,
                              actualFare: actualFare,
                              billingFare: billingFare,
                              additionalFare: additionalFare,
                              additionalFareReason: [...pickupReasons, ...deliveryReasons].join(', '),
                              driver: `${driverNameInput}\\n${driverPhoneInput}\\n${carNumberInput}\\n${carTonInput}/${carTypeInput}`,
                            };
                          }
                          return item;
                        });
                        setHistoryData(updatedHistory);
                        
                        // selectedItem도 업데이트
                        if (selectedItem && selectedItem.orderNumber === dispatchInfoItem.orderNumber) {
                          setSelectedItem({
                            ...selectedItem,
                            orderNumber: orderNumberInput,
                            actualFare: actualFare,
                            billingFare: billingFare,
                            additionalFare: additionalFare,
                            additionalFareReason: [...pickupReasons, ...deliveryReasons].join(', '),
                            driver: `${driverNameInput}\\n${driverPhoneInput}\\n${carNumberInput}\\n${carTonInput}/${carTypeInput}`,
                          });
                        }
                      }
                      
                      setAlertMessage('배차정보가 저장되었습니다.');
                      setDispatchInfoOpen(false);
                    }}
                    className="flex-1 h-12 rounded-lg text-sm font-bold text-white transition-colors hover:opacity-90"
                    style={{ background: 'var(--blue)' }}
                  >
                    저장
                  </button>
                  <button
                    onClick={() => setDispatchInfoOpen(false)}
                    className="flex-1 h-12 rounded-lg text-sm font-bold transition-colors hover:opacity-80"
                    style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                  >
                    취소
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 추가사유 특이사항 선택 패널 */}
        {specialReasonsOpen && (
          <div 
            className="fixed inset-0 z-[60] flex items-center justify-center p-4" 
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
            onClick={() => setSpecialReasonsOpen(false)}
          >
            <div 
              className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" 
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-base font-bold mb-5" style={{ color: 'var(--black)' }}>중복 선택 가능합니다</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {/* 상차지 대기 */}
                <button
                  onClick={() => {
                    if (tempPickupReasons.includes('상차지 대기')) {
                      setTempPickupReasons(tempPickupReasons.filter(r => r !== '상차지 대기'));
                    } else {
                      setTempPickupReasons([...tempPickupReasons, '상차지 대기']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempPickupReasons.includes('상차지 대기') ? '#FFE5E5' : '#FFFFFF',
                    borderColor: tempPickupReasons.includes('상차지 대기') ? '#FFB8B8' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  상차지 대기
                </button>

                {/* 하차지 대기 */}
                <button
                  onClick={() => {
                    if (tempDeliveryReasons.includes('하차지 대기')) {
                      setTempDeliveryReasons(tempDeliveryReasons.filter(r => r !== '하차지 대기'));
                    } else {
                      setTempDeliveryReasons([...tempDeliveryReasons, '하차지 대기']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempDeliveryReasons.includes('하차지 대기') ? '#E5F2FF' : '#FFFFFF',
                    borderColor: tempDeliveryReasons.includes('하차지 대기') ? '#B8DAFF' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  하차지 대기
                </button>

                {/* 상차지 검수 */}
                <button
                  onClick={() => {
                    if (tempPickupReasons.includes('상차지 검수')) {
                      setTempPickupReasons(tempPickupReasons.filter(r => r !== '상차지 검수'));
                    } else {
                      setTempPickupReasons([...tempPickupReasons, '상차지 검수']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempPickupReasons.includes('상차지 검수') ? '#FFE5E5' : '#FFFFFF',
                    borderColor: tempPickupReasons.includes('상차지 검수') ? '#FFB8B8' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  상차지 검수
                </button>

                {/* 하차지 검수 */}
                <button
                  onClick={() => {
                    if (tempDeliveryReasons.includes('하차지 검수')) {
                      setTempDeliveryReasons(tempDeliveryReasons.filter(r => r !== '하차지 검수'));
                    } else {
                      setTempDeliveryReasons([...tempDeliveryReasons, '하차지 검수']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempDeliveryReasons.includes('하차지 검수') ? '#E5F2FF' : '#FFFFFF',
                    borderColor: tempDeliveryReasons.includes('하차지 검수') ? '#B8DAFF' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  하차지 검수
                </button>

                {/* 상차지 수작업 */}
                <button
                  onClick={() => {
                    if (tempPickupReasons.includes('상차지 수작업')) {
                      setTempPickupReasons(tempPickupReasons.filter(r => r !== '상차지 수작업'));
                    } else {
                      setTempPickupReasons([...tempPickupReasons, '상차지 수작업']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempPickupReasons.includes('상차지 수작업') ? '#FFE5E5' : '#FFFFFF',
                    borderColor: tempPickupReasons.includes('상차지 수작업') ? '#FFB8B8' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  상차지 수작업
                </button>

                {/* 하차지 수작업 */}
                <button
                  onClick={() => {
                    if (tempDeliveryReasons.includes('하차지 수작업')) {
                      setTempDeliveryReasons(tempDeliveryReasons.filter(r => r !== '하차지 수작업'));
                    } else {
                      setTempDeliveryReasons([...tempDeliveryReasons, '하차지 수작업']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempDeliveryReasons.includes('하차지 수작업') ? '#E5F2FF' : '#FFFFFF',
                    borderColor: tempDeliveryReasons.includes('하차지 수작업') ? '#B8DAFF' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  하차지 수작업
                </button>

                {/* 상차지 랩핑작업 */}
                <button
                  onClick={() => {
                    if (tempPickupReasons.includes('상차지 랩핑작업')) {
                      setTempPickupReasons(tempPickupReasons.filter(r => r !== '상차지 랩핑작업'));
                    } else {
                      setTempPickupReasons([...tempPickupReasons, '상차지 랩핑작업']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempPickupReasons.includes('상차지 랩핑작업') ? '#FFE5E5' : '#FFFFFF',
                    borderColor: tempPickupReasons.includes('상차지 랩핑작업') ? '#FFB8B8' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  상차지 랩핑작업
                </button>

                {/* 하차지 랩핑작업 */}
                <button
                  onClick={() => {
                    if (tempDeliveryReasons.includes('하차지 랩핑작업')) {
                      setTempDeliveryReasons(tempDeliveryReasons.filter(r => r !== '하차지 랩핑작업'));
                    } else {
                      setTempDeliveryReasons([...tempDeliveryReasons, '하차지 랩핑작업']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempDeliveryReasons.includes('하차지 랩핑작업') ? '#E5F2FF' : '#FFFFFF',
                    borderColor: tempDeliveryReasons.includes('하차지 랩핑작업') ? '#B8DAFF' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  하차지 랩핑작업
                </button>

                {/* 상차지 라벨작업 */}
                <button
                  onClick={() => {
                    if (tempPickupReasons.includes('상차지 라벨작업')) {
                      setTempPickupReasons(tempPickupReasons.filter(r => r !== '상차지 라벨작업'));
                    } else {
                      setTempPickupReasons([...tempPickupReasons, '상차지 라벨작업']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempPickupReasons.includes('상차지 라벨작업') ? '#FFE5E5' : '#FFFFFF',
                    borderColor: tempPickupReasons.includes('상차지 라벨작업') ? '#FFB8B8' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  상차지 라벨작업
                </button>

                {/* 하차지 라벨작업 */}
                <button
                  onClick={() => {
                    if (tempDeliveryReasons.includes('하차지 라벨작업')) {
                      setTempDeliveryReasons(tempDeliveryReasons.filter(r => r !== '하차지 라벨작업'));
                    } else {
                      setTempDeliveryReasons([...tempDeliveryReasons, '하차지 라벨작업']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempDeliveryReasons.includes('하차지 라벨작업') ? '#E5F2FF' : '#FFFFFF',
                    borderColor: tempDeliveryReasons.includes('하차지 라벨작업') ? '#B8DAFF' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  하차지 라벨작업
                </button>

                {/* 상차지 까대기 */}
                <button
                  onClick={() => {
                    if (tempPickupReasons.includes('상차지 까대기')) {
                      setTempPickupReasons(tempPickupReasons.filter(r => r !== '상차지 까대기'));
                    } else {
                      setTempPickupReasons([...tempPickupReasons, '상차지 까대기']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempPickupReasons.includes('상차지 까대기') ? '#FFE5E5' : '#FFFFFF',
                    borderColor: tempPickupReasons.includes('상차지 까대기') ? '#FFB8B8' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  상차지 까대기
                </button>

                {/* 하차지 까대기 */}
                <button
                  onClick={() => {
                    if (tempDeliveryReasons.includes('하차지 까대기')) {
                      setTempDeliveryReasons(tempDeliveryReasons.filter(r => r !== '하차지 까대기'));
                    } else {
                      setTempDeliveryReasons([...tempDeliveryReasons, '하차지 까대기']);
                    }
                  }}
                  className="h-11 rounded-lg text-sm font-medium transition-colors border"
                  style={{
                    background: tempDeliveryReasons.includes('하차지 까대기') ? '#E5F2FF' : '#FFFFFF',
                    borderColor: tempDeliveryReasons.includes('하차지 까대기') ? '#B8DAFF' : '#E0E0E0',
                    color: 'var(--black)',
                  }}
                >
                  하차지 까대기
                </button>
              </div>

              <button
                onClick={() => {
                  setPickupReasons([...tempPickupReasons]);
                  setDeliveryReasons([...tempDeliveryReasons]);
                  setSpecialReasonsOpen(false);
                }}
                className="w-full h-12 rounded-lg font-bold text-sm text-white transition-colors hover:opacity-90 mt-6"
                style={{ background: 'var(--blue)' }}
              >
                확인
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />

      {/* 기사 위치 확인 모달 (고객 권한용 - 배차완료 운행중) */}
      {driverLocationModalOpen && driverLocationItem && (
        <DriverLocationModal
          isOpen={driverLocationModalOpen}
          onClose={() => {
            setDriverLocationModalOpen(false);
            setDriverLocationItem(null);
          }}
          fromAddress={driverLocationItem.fA}
          toAddress={driverLocationItem.tA}
        />
      )}

      {/* 배차 상태 안내 모달 (고객 권한용 - 접수중/배차중/취소/운행완료) */}
      {statusModalOpen && statusModalItem && (
        <DispatchStatusModal
          isOpen={statusModalOpen}
          onClose={() => {
            setStatusModalOpen(false);
            setStatusModalItem(null);
          }}
          status={statusModalItem.status}
          isCompleted={!!statusModalItem.arrivalImages}
        />
      )}

      {/* 변경이력 모달 (관리 권한용) */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={historyModalTitle}
        histories={historyModalData}
      />
    </>
  );
}