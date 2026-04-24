import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { AddressCard } from "../components/dispatch/AddressCard";
import { RecentCard } from "../components/dispatch/RecentCard";
import { VehicleCard } from "../components/dispatch/VehicleCard";
import { BottomSection } from "../components/dispatch/BottomSection";
import { Footer } from "../components/Footer";
import { CompanySelector } from "../components/CompanySelector";
import svgPaths from "../../imports/svg-690k2ri1iu";
import { useAuth } from "../contexts/AuthContext";

export function DispatchPage() {
  const location = useLocation();
  const copiedData = location.state?.copiedData;
  const { userRole, company } = useAuth();
  const [selectedCompany, setSelectedCompany] = useState("");
  
  // 알림톡 일괄 비활성화 상태
  const [disableAllNotifications, setDisableAllNotifications] = useState(false);
  
  // 알림 상태 추가 (출발지/도착지 각각)
  const [fromNotificationEnabled, setFromNotificationEnabled] = useState(true);
  const [toNotificationEnabled, setToNotificationEnabled] = useState(true);

  // 에러 상태
  const [errors, setErrors] = useState({
    company: false,
    fromAddr: false,
    fromName: false,
    fromTel: false,
    fromMethod: false,
    toAddr: false,
    toName: false,
    toTel: false,
    toMethod: false,
  });

  // 디버깅: AuthContext 값 확인
  console.log('🔍 DispatchPage 디버깅:', {
    userRole,
    company,
    hasCompany: !!company,
    companyType: typeof company
  });

  const [fromData, setFromData] = useState({
    addr: copiedData?.from.addr || "",
    detail: copiedData?.from.detail || "",
    name: copiedData?.from.name || "",
    manager: copiedData?.from.manager || "",
    tel: copiedData?.from.tel || "",
    method: copiedData?.from.method || "",
    scheduleType: "now" as "now" | "reserved",
    scheduleDate: "",
    scheduleTime: "",
  });

  const [toData, setToData] = useState({
    addr: copiedData?.to.addr || "",
    detail: copiedData?.to.detail || "",
    name: copiedData?.to.name || "",
    manager: copiedData?.to.manager || "",
    tel: copiedData?.to.tel || "",
    method: copiedData?.to.method || "",
    scheduleType: "now" as "now" | "reserved",
    scheduleDate: "",
    scheduleTime: "",
  });

  const [vehicleData, setVehicleData] = useState({
    category: copiedData?.vehicle.category || "오토바이",
    ton: copiedData?.vehicle.ton || "일반",
    type: copiedData?.vehicle.type || "오토바이",
    specialType: copiedData?.vehicle.specialType || "기본",
    notes: copiedData?.vehicle.notes || "",
    cargo: copiedData?.vehicle.cargo || "",
    payment: copiedData?.vehicle.payment || "신용",
  });

  const handleSwap = () => {
    const temp = { ...fromData };
    setFromData({ ...toData });
    setToData(temp);
  };

  const handleAddressBookSelect = (item: any, selectedTarget: "from" | "to") => {
    const addressData = {
      addr: item.addr,
      detail: item.detail,
      name: item.name,
      manager: item.manager,
      tel: item.tel,
      method: item.method,
    };

    if (selectedTarget === "from") {
      setFromData({ ...fromData, ...addressData });
    } else {
      setToData({ ...toData, ...addressData });
    }
  };

  const handleSelectRecent = (data: {
    from: {
      addr: string;
      detail: string;
      name: string;
      manager: string;
      tel: string;
      method: string;
      schedule: string;
    };
    to: {
      addr: string;
      detail: string;
      name: string;
      manager: string;
      tel: string;
      method: string;
      schedule: string;
    };
    vehicle: {
      category: string;
      ton: string;
      type: string;
      specialType: string;
      notes: string;
      cargo: string;
      payment: string;
    };
  }) => {
    // Update from address
    setFromData({
      addr: data.from.addr,
      detail: data.from.detail,
      name: data.from.name,
      manager: data.from.manager,
      tel: data.from.tel,
      method: data.from.method,
      scheduleType: "now",
      scheduleDate: "",
      scheduleTime: "",
    });

    // Update to address
    setToData({
      addr: data.to.addr,
      detail: data.to.detail,
      name: data.to.name,
      manager: data.to.manager,
      tel: data.to.tel,
      method: data.to.method,
      scheduleType: "now",
      scheduleDate: "",
      scheduleTime: "",
    });

    // Update vehicle data
    setVehicleData(data.vehicle);
  };

  // 배차접수 완료 후 초기화
  const handleResetForm = () => {
    setSelectedCompany("");
    setFromData({
      addr: "",
      detail: "",
      name: "",
      manager: "",
      tel: "",
      method: "",
      scheduleType: "now",
      scheduleDate: "",
      scheduleTime: "",
    });
    setToData({
      addr: "",
      detail: "",
      name: "",
      manager: "",
      tel: "",
      method: "",
      scheduleType: "now",
      scheduleDate: "",
      scheduleTime: "",
    });
    setVehicleData({
      category: "오토바이",
      ton: "일반",
      type: "오토바이",
      specialType: "기본",
      notes: "",
      cargo: "",
      payment: "신용",
    });
    setErrors({
      company: false,
      fromAddr: false,
      fromName: false,
      fromTel: false,
      fromMethod: false,
      toAddr: false,
      toName: false,
      toTel: false,
      toMethod: false,
    });
    
    // 알림톡 설정은 일괄 비활성화가 안 되어있으면 다시 켜기
    if (!disableAllNotifications) {
      setFromNotificationEnabled(true);
      setToNotificationEnabled(true);
    }
  };

  // localStorage에서 사용자별 알림톡 설정 불러오기
  useEffect(() => {
    if (!userRole) return;
    
    const savedSetting = localStorage.getItem(`alimtalk_disabled_${userRole}`);
    if (savedSetting !== null) {
      const disabled = savedSetting === 'true';
      setDisableAllNotifications(disabled);
      
      // 일괄 비활성화된 경우 개별 알림도 OFF
      if (disabled) {
        setFromNotificationEnabled(false);
        setToNotificationEnabled(false);
      }
    }
  }, [userRole]);



  return (
    <>
      <div className="max-w-[1180px] mx-auto px-4 pt-[55px] pb-20 max-[1280px]:px-6 max-[1280px]:pt-10 max-[1280px]:pb-20 max-[768px]:px-4 max-[768px]:pt-6 max-[768px]:pb-12">
        
        <div className="rounded-md mb-5 p-7 lg:px-9 max-[768px]:p-5 max-[768px]:px-4" style={{ background: 'var(--bg)' }}>
          {/* 배차/영업/관리 권한일 때만 업체선택 표시 */}
          {(userRole === '배차' || userRole === '영업' || userRole === '관리') && (
            <div className="mb-6">
              <CompanySelector
                value={selectedCompany}
                onChange={(value) => {
                  setSelectedCompany(value);
                  if (errors.company) setErrors({ ...errors, company: false });
                }}
                hasError={errors.company}
              />
            </div>
          )}
          
          <div className="grid grid-cols-1 max-[1280px]:grid-cols-[1fr_70px_1fr] lg:grid-cols-[1fr_70px_1fr] max-[1280px]:gap-x-6 lg:gap-x-[49px] gap-y-6 lg:gap-y-6 items-stretch max-[768px]:grid-cols-1 max-[768px]:gap-y-0">
            <AddressCard
              type="from"
              data={fromData}
              onDataChange={(data) => {
                setFromData(data);
                // 각 필드가 변경되면 해당 에러 초기화
                const newErrors = { ...errors };
                if (data.addr !== fromData.addr && data.addr) newErrors.fromAddr = false;
                if (data.name !== fromData.name && data.name) newErrors.fromName = false;
                if (data.tel !== fromData.tel && data.tel) newErrors.fromTel = false;
                if (data.method !== fromData.method && data.method) newErrors.fromMethod = false;
                setErrors(newErrors);
              }}
              onAddressBookSelect={handleAddressBookSelect}
              userCompany={userRole === '고객' ? company : null}
              notificationEnabled={fromNotificationEnabled}
              onToggleNotification={() => setFromNotificationEnabled(!fromNotificationEnabled)}
              notificationDisabled={disableAllNotifications}
              hasError={errors.fromAddr}
              hasNameError={errors.fromName}
              hasTelError={errors.fromTel}
              hasMethodError={errors.fromMethod}
            />
            
            <div className="flex items-center justify-center lg:self-stretch self-auto py-3 lg:py-0 order-2 lg:order-none max-[768px]:py-3 max-[768px]:justify-center max-[768px]:self-auto max-[768px]:order-none">
              <button
                className="w-[70px] h-[70px] flex items-center justify-center cursor-pointer group"
                style={{ background: 'var(--bg)' }}
                onClick={handleSwap}
              >
                <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center">
                  <div className="-rotate-90 max-[768px]:rotate-0">
                    <div className="w-[30px] h-[30px] flex items-center justify-center">
                      <svg className="w-5 h-[25px] transition-colors" fill="none" preserveAspectRatio="none" viewBox="0 0 20 25">
                        <path d={svgPaths.p16142e00} className="group-hover:fill-[#78B6FF]" fill="var(--blue)" />
                      </svg>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <AddressCard
              type="to"
              data={toData}
              onDataChange={(data) => {
                setToData(data);
                // 각 필드가 변경되면 해당 에러 초기화
                const newErrors = { ...errors };
                if (data.addr !== toData.addr && data.addr) newErrors.toAddr = false;
                if (data.name !== toData.name && data.name) newErrors.toName = false;
                if (data.tel !== toData.tel && data.tel) newErrors.toTel = false;
                if (data.method !== toData.method && data.method) newErrors.toMethod = false;
                setErrors(newErrors);
              }}
              onAddressBookSelect={handleAddressBookSelect}
              userCompany={userRole === '고객' ? company : null}
              notificationEnabled={toNotificationEnabled}
              onToggleNotification={() => setToNotificationEnabled(!toNotificationEnabled)}
              notificationDisabled={disableAllNotifications}
              hasError={errors.toAddr}
              hasNameError={errors.toName}
              hasTelError={errors.toTel}
              hasMethodError={errors.toMethod}
            />
          </div>
        </div>

        <RecentCard 
          onSelectRecent={handleSelectRecent} 
          userCompany={userRole === '고객' ? company : null}
        />

        <VehicleCard
          data={vehicleData}
          onDataChange={setVehicleData}
        />

        <BottomSection
          specialType={vehicleData.specialType}
          fromAddr={fromData.addr}
          fromName={fromData.name}
          fromTel={fromData.tel}
          fromMethod={fromData.method}
          toAddr={toData.addr}
          toName={toData.name}
          toTel={toData.tel}
          toMethod={toData.method}
          selectedCompany={selectedCompany}
          userRole={userRole}
          errors={errors}
          setErrors={setErrors}
          onResetForm={handleResetForm}
        />
      </div>
      <Footer />
    </>
  );
}