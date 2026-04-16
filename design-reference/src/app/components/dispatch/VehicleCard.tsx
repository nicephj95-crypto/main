import { MotorcycleIcon } from '../icons/MotorcycleIcon';
import { VanIcon } from '../icons/VanIcon';
import { PickupIcon } from '../icons/PickupIcon';
import { TruckIcon } from '../icons/TruckIcon';

interface VehicleData {
  category: string;
  ton: string;
  type: string;
  specialType: string;
  notes: string;
  cargo: string;
  payment: string;
}

interface VehicleCardProps {
  data: VehicleData;
  onDataChange: (data: VehicleData) => void;
}

const vehicleInfo: Record<string, { ton: string[]; type: string[]; info: string; tonDisabled?: boolean; typeDisabled?: boolean; typeDetails?: Record<string, string> }> = {
  "오토바이": {
    ton: ["일반", "짐바리"],
    type: ["오토바이"],
    info: "30×30×40cm / 20kg 이하",
    tonDisabled: false,
    typeDisabled: true
  },
  "다마스": {
    ton: ["0.3톤"],
    type: ["다마스"],
    info: "1100×1700×700mm / 300kg 이하",
    tonDisabled: true,
    typeDisabled: true
  },
  "라보": {
    ton: ["0.5톤"],
    type: ["라보"],
    info: "1300×2190×700mm / 500kg 이하 / 1파렛트",
    tonDisabled: true,
    typeDisabled: true
  },
  "1톤이상": {
    ton: ["1톤", "1.4톤", "2.5톤", "3.5톤", "5톤", "11톤", "25톤"],
    type: ["차종무관", "카고", "윙바디", "초장축카", "초장축윙", "리프트", "냉동", "냉장"],
    info: "1600×2865×1700mm / 1.1t / 2plt",
    tonDisabled: false,
    typeDisabled: false,
    typeDetails: {
      "차종무관": "",
      "카고": " / 지붕 없는 차량",
      "윙바디": " / 양쪽 개방 지붕 있는 차량",
      "초장축카": "",
      "초장축윙": "",
      "리프트": "",
      "냉동": "",
      "냉장": ""
    }
  },
};

export function VehicleCard({ data, onDataChange }: VehicleCardProps) {
  const updateData = (updates: Partial<VehicleData>) => {
    onDataChange({ ...data, ...updates });
  };

  const selectVehicle = (category: string) => {
    const info = vehicleInfo[category];
    updateData({
      category,
      ton: info.ton[0] || "",
      type: info.type[0] || "",
    });
  };

  const toggleSpecialType = (type: string) => {
    updateData({ specialType: type });
  };

  const togglePayment = (payment: string) => {
    updateData({ payment });
  };

  const currentInfo = vehicleInfo[data.category] || vehicleInfo["오토바이"];

  return (
    <div className="rounded-md mb-5 px-4 lg:px-9 py-7" style={{ background: 'var(--bg)' }}>
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Left Section */}
        <div className="flex-1 lg:flex-[0_0_590px] flex flex-col w-full">
          <div className="inline-flex items-center justify-center h-[30px] w-[77px] rounded-[2px] whitespace-nowrap flex-shrink-0 text-sm font-extrabold text-white" style={{ background: 'var(--black)' }}>
            차량선택
          </div>

          <div className="flex gap-2.5 mt-2.5 mb-2.5 flex-wrap">
            {[
              { name: "오토바이", icon: MotorcycleIcon },
              { name: "다마스", icon: VanIcon },
              { name: "라보", icon: PickupIcon },
              { name: "1톤이상", icon: TruckIcon }
            ].map((vehicle) => {
              const IconComponent = vehicle.icon;
              return (
                <div
                  key={vehicle.name}
                  onClick={() => selectVehicle(vehicle.name)}
                  className={`flex-[0_0_calc(25%-8px)] lg:flex-[0_0_140px] h-[140px] lg:h-[140px] md:h-[120px] max-[480px]:flex-[0_0_calc(50%-5px)] max-[480px]:aspect-square bg-white rounded-[2px] p-3.5 cursor-pointer flex flex-col transition-all overflow-hidden ${
                    data.category === vehicle.name ? '' : 'hover:!border-[#0075FF]'
                  }`}
                  style={{ border: `1px solid ${data.category === vehicle.name ? 'var(--blue)' : 'var(--border)'}` }}
                >
                  <div
                    className={`rounded-[2px] h-[30px] w-[72px] flex items-center justify-center text-sm whitespace-nowrap flex-shrink-0 transition-all ${
                      data.category === vehicle.name
                        ? 'text-white border-[var(--blue)]'
                        : ''
                    }`}
                    style={{
                      background: data.category === vehicle.name ? 'var(--blue)' : 'var(--bg)',
                      border: `1px solid ${data.category === vehicle.name ? 'var(--blue)' : 'var(--border)'}`,
                    }}
                  >
                    {vehicle.name}
                  </div>
                  <div className="flex-1 flex items-center justify-center p-2 max-[480px]:p-1">
                    <IconComponent />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2.5 mb-2.5 max-[480px]:flex-col">
            <select
              className="flex-1 block border-none outline-none rounded-[2px] px-5 pr-9 text-sm appearance-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
              style={{
                height: '40px',
                minHeight: '40px',
                color: 'var(--black)',
                backgroundColor: currentInfo.tonDisabled ? 'var(--sel-fixed)' : '#fff',
                cursor: currentInfo.tonDisabled ? 'default' : 'pointer',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23767676' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
              value={data.ton}
              onChange={(e) => updateData({ ton: e.target.value })}
              disabled={currentInfo.tonDisabled}
            >
              {currentInfo.ton.map((ton) => (
                <option key={ton} value={ton}>{ton}</option>
              ))}
            </select>

            <select
              className="flex-1 block border-none outline-none rounded-[2px] px-5 pr-9 text-sm appearance-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
              style={{
                height: '40px',
                minHeight: '40px',
                color: 'var(--black)',
                backgroundColor: currentInfo.typeDisabled ? 'var(--sel-fixed)' : '#fff',
                cursor: currentInfo.typeDisabled ? 'default' : 'pointer',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23767676' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
              }}
              value={data.type}
              onChange={(e) => updateData({ type: e.target.value })}
              disabled={currentInfo.typeDisabled}
            >
              {currentInfo.type.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div className="min-h-[40px] rounded-[2px] px-5 flex items-center text-sm mb-5 font-medium max-[768px]:py-2.5" style={{ background: 'var(--info-bg)', color: data.ton ? 'var(--black)' : 'var(--ph)' }}>
            {data.ton ? currentInfo.info + (currentInfo.typeDetails?.[data.type] || '') : '차량을 선택하면 차량재원을 알려드려요'}
          </div>

          <div className="inline-flex items-center justify-center h-[30px] w-[77px] rounded-[2px] whitespace-nowrap flex-shrink-0 text-sm font-extrabold text-white" style={{ background: 'var(--black)' }}>
            특이사항
          </div>

          <div className="flex gap-2.5 mt-2.5 mb-2.5 flex-wrap max-[480px]:gap-2">
            {[
              { name: "기본" },
              { name: "긴급" },
              { name: "혼적" },
              { name: "왕복" }
            ].map((type) => (
              <button
                key={type.name}
                onClick={() => toggleSpecialType(type.name)}
                className={`flex-[0_0_140px] max-[768px]:flex-[0_0_calc(50%-5px)] max-[480px]:flex-[0_0_calc(50%-4px)] h-10 bg-white rounded-[2px] text-sm flex items-center justify-center cursor-pointer transition-colors ${
                  data.specialType === type.name ? 'font-extrabold' : 'hover:bg-[#F5F5F5]'
                }`}
                style={{
                  border: `1px solid ${data.specialType === type.name ? 'var(--blue)' : 'var(--border)'}`,
                  color: data.specialType === type.name ? 'var(--blue)' : 'var(--black)',
                }}
              >
                {type.name}
              </button>
            ))}
          </div>

          <input
            className="block w-full h-10 bg-white border-none outline-none rounded-[2px] px-5 text-sm transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)]"
            style={{ color: 'var(--black)' }}
            type="text"
            placeholder="기사요청사항 (ex: 도착 전 전화 주세요)"
            value={data.notes}
            onChange={(e) => updateData({ notes: e.target.value })}
          />
        </div>

        {/* Right Section */}
        <div className="flex-1 lg:flex-[0_0_498px] flex flex-col w-full lg:pr-9">
          <div className="inline-flex items-center justify-center h-[30px] w-[77px] rounded-[2px] whitespace-nowrap flex-shrink-0 text-sm font-extrabold text-white" style={{ background: 'var(--black)' }}>
            화물내용
          </div>

          <textarea
            className="h-60 w-full bg-white border-none outline-none rounded-[2px] p-3 px-5 text-sm resize-none mt-2.5 transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] placeholder:text-[var(--ph)] max-[768px]:h-40"
            style={{ color: 'var(--black)' }}
            placeholder="화물내용 (ex: 3렛트, 2박스 등)"
            value={data.cargo}
            onChange={(e) => updateData({ cargo: e.target.value })}
          />

          <div className="inline-flex items-center justify-center h-[30px] w-[77px] rounded-[2px] whitespace-nowrap flex-shrink-0 text-sm font-extrabold text-white mt-5" style={{ background: 'var(--black)' }}>
            결제방법
          </div>

          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            {[
              { name: "신용" },
              { name: "카드" },
              { name: "선불" },
              { name: "착불" }
            ].map((payment) => (
              <button
                key={payment.name}
                onClick={() => togglePayment(payment.name)}
                className={`h-10 bg-white rounded-[2px] text-sm flex items-center justify-center cursor-pointer transition-colors ${
                  data.payment === payment.name ? 'font-bold' : 'hover:bg-[#F5F5F5]'
                }`}
                style={{
                  border: `1px solid ${data.payment === payment.name ? 'var(--blue)' : 'var(--border)'}`,
                  color: data.payment === payment.name ? 'var(--blue)' : 'var(--black)',
                }}
              >
                {payment.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}