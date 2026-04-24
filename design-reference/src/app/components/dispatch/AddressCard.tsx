import { useState } from "react";
import { Search, Bell, BellOff } from "lucide-react";
import { KakaoAddressModal } from "../modals/KakaoAddressModal";
import { AddressBookModal } from "../modals/AddressBookModal";
import { TimeModal } from "../modals/TimeModal";

interface AddressData {
  addr: string;
  detail: string;
  name: string;
  manager: string;
  tel: string;
  method: string;
  scheduleType: "now" | "reserved";
  scheduleDate: string;
  scheduleTime: string;
}

interface AddressCardProps {
  type: "from" | "to";
  data: AddressData;
  onDataChange: (data: AddressData) => void;
  onAddressBookSelect?: (item: any, selectedTarget: "from" | "to") => void;
  userCompany?: string | null; // 고객 권한 시 회사 필터링용
  notificationEnabled?: boolean; // 알림 ON/OFF 상태
  onToggleNotification?: () => void; // 알림 토글 핸들러
  notificationDisabled?: boolean; // 알림 일괄 비활성화 상태
  hasError?: boolean; // 주소 입력 에러 상태
  hasNameError?: boolean; // 출도착지명 에러 상태
  hasTelError?: boolean; // 연락처 에러 상태
  hasMethodError?: boolean; // 상하차방법 에러 상태
}

export function AddressCard({
  type,
  data,
  onDataChange,
  onAddressBookSelect,
  userCompany,
  notificationEnabled = true,
  onToggleNotification,
  notificationDisabled = false,
  hasError = false,
  hasNameError = false,
  hasTelError = false,
  hasMethodError = false
}: AddressCardProps) {
  const [kakaoModalOpen, setKakaoModalOpen] = useState(false);
  const [addressBookOpen, setAddressBookOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);

  const isFrom = type === "from";
  const label = isFrom ? "출발지" : "도착지";
  const actionLabel = isFrom ? "상차" : "하차";

  const updateData = (updates: Partial<AddressData>) => {
    onDataChange({ ...data, ...updates });
  };

  const filterTel = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    updateData({ tel: cleaned });
  };

  const getScheduleLabel = () => {
    if (data.scheduleType === "now") {
      return `바로 ${actionLabel}`;
    }
    return `${data.scheduleDate} ${data.scheduleTime}`;
  };

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <div className="inline-flex items-center justify-center h-[30px] w-[77px] rounded-[2px] whitespace-nowrap flex-shrink-0 text-sm font-extrabold text-white" style={{ background: 'var(--black)' }}>
          {label}
        </div>

        <div className="relative h-10 bg-white rounded-[2px] flex items-center flex-shrink-0">
          <input
            className="block w-full h-full outline-none rounded-[2px] px-5 pr-[100px] text-sm transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)] cursor-pointer"
            style={{
              color: 'var(--black)',
              background: hasError ? '#FEE' : '#fafafa',
              border: hasError ? '1px solid #FBB' : 'none'
            }}
            type="text"
            placeholder="주소 검색*"
            value={data.addr}
            readOnly
            onClick={() => setKakaoModalOpen(true)}
          />
          <span className="absolute right-[104px] top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setKakaoModalOpen(true)}>
            <Search size={16} style={{ stroke: 'var(--ph)' }} />
          </span>
          <button
            className="absolute right-[7px] top-1/2 -translate-y-1/2 w-[77px] h-[26px] rounded-[2px] text-sm flex items-center justify-center text-white transition-colors hover:!bg-[#78B6FF]"
            style={{ background: 'var(--blue)' }}
            onClick={() => setAddressBookOpen(true)}
          >
            주소록
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 max-[480px]:grid-cols-1 max-[480px]:gap-2.5">
          <input
            className="block w-full h-10 bg-white border-none outline-none rounded-[2px] px-5 text-sm transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)]"
            style={{ color: 'var(--black)' }}
            type="text"
            placeholder="상세주소*"
            value={data.detail}
            onChange={(e) => updateData({ detail: e.target.value })}
          />
          <input
            className="block w-full h-10 outline-none rounded-[2px] px-5 text-sm transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)]"
            style={{
              backgroundColor: hasNameError ? '#FEE' : 'white',
              border: hasNameError ? '1px solid #FBB' : 'none',
              color: 'var(--black)'
            }}
            type="text"
            placeholder={`${label}명*`}
            value={data.name}
            onChange={(e) => updateData({ name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5 max-[480px]:grid-cols-1 max-[480px]:gap-2.5">
          <input
            className="block w-full h-10 bg-white border-none outline-none rounded-[2px] px-5 text-sm transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)]"
            style={{ color: 'var(--black)' }}
            type="text"
            placeholder="담당자명"
            value={data.manager}
            onChange={(e) => updateData({ manager: e.target.value })}
          />
          <input
            className="block w-full h-10 outline-none rounded-[2px] px-5 text-sm transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)]"
            style={{
              backgroundColor: hasTelError ? '#FEE' : 'white',
              border: hasTelError ? '1px solid #FBB' : 'none',
              color: 'var(--black)'
            }}
            type="text"
            placeholder="연락처*"
            value={data.tel}
            onChange={(e) => filterTel(e.target.value)}
          />
        </div>

        <select
          className="block w-full h-10 outline-none rounded-[2px] px-5 pr-9 text-sm appearance-none bg-no-repeat transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] cursor-pointer"
          style={{
            backgroundColor: hasMethodError ? '#FEE' : 'white',
            border: hasMethodError ? '1px solid #FBB' : 'none',
            color: 'var(--black)',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23767676' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
            backgroundPosition: 'right 12px center',
          }}
          value={data.method}
          onChange={(e) => updateData({ method: e.target.value })}
        >
          <option value="" hidden>{actionLabel}방법*</option>
          <option>지게차</option>
          <option>수작업</option>
          <option>수도움/수해줌</option>
          <option>호이스트</option>
          <option>크레인</option>
          <option>컨베이어</option>
        </select>

        <div className="grid grid-cols-[1fr_40px] gap-2.5">
          <div className="h-10 bg-white rounded-[2px] flex items-center gap-2.5 px-5 flex-shrink-0 justify-between">
            <span className="text-sm font-normal whitespace-nowrap" style={{ color: 'var(--black)' }}>
              {getScheduleLabel()}
            </span>
            <button
              className="text-sm cursor-pointer hover:underline whitespace-nowrap"
              style={{ color: 'var(--blue)' }}
              onClick={() => setTimeModalOpen(true)}
            >
              {actionLabel}시간 설정하기(예약)
            </button>
          </div>
          <button
            className="w-10 h-10 flex items-center justify-center flex-shrink-0 transition-colors rounded-[2px] bg-white"
            onClick={notificationDisabled ? undefined : onToggleNotification}
            disabled={notificationDisabled}
            title={
              notificationDisabled 
                ? "일괄 설정으로 비활성화됨" 
                : notificationEnabled 
                  ? "알림 켜짐 (클릭하여 끄기)" 
                  : "알림 꺼짐 (클릭하여 켜기)"
            }
            style={{
              cursor: notificationDisabled ? 'not-allowed' : 'pointer',
              opacity: notificationDisabled ? 0.4 : 1,
            }}
          >
            {notificationEnabled ? (
              <Bell size={18} style={{ stroke: notificationDisabled ? 'var(--border2)' : 'var(--blue)' }} />
            ) : (
              <BellOff size={18} style={{ stroke: 'var(--border2)' }} />
            )}
          </button>
        </div>
      </div>

      <KakaoAddressModal
        isOpen={kakaoModalOpen}
        onClose={() => setKakaoModalOpen(false)}
        onSelect={(addr, detail) => {
          updateData({ addr, detail });
          setKakaoModalOpen(false);
        }}
      />

      <AddressBookModal
        isOpen={addressBookOpen}
        onClose={() => setAddressBookOpen(false)}
        targetType={type}
        onSelect={(item, selectedTarget) => {
          if (onAddressBookSelect) {
            // 부모 컴포넌트에 위임
            onAddressBookSelect(item, selectedTarget);
          } else {
            // 기본 동작: 현재 카드 업데이트
            updateData({
              addr: item.addr,
              detail: item.detail,
              name: item.name,
              manager: item.manager,
              tel: item.tel,
              method: item.method,
            });
          }
          setAddressBookOpen(false);
        }}
        userCompany={userCompany}
      />

      <TimeModal
        isOpen={timeModalOpen}
        onClose={() => setTimeModalOpen(false)}
        title={`${actionLabel}시간 설정`}
        onConfirm={(type, date, time) => {
          updateData({
            scheduleType: type,
            scheduleDate: date,
            scheduleTime: time,
          });
          setTimeModalOpen(false);
        }}
      />
    </>
  );
}