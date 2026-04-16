import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";
import { KakaoAddressModal } from "./KakaoAddressModal";

interface AddressBookItem {
  name: string;
  addr: string;
  detail: string;
  manager: string;
  tel: string;
  method: string;
  group: string;
  lunch: string;
  note: string;
  img: string | null;
}

interface EditAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: AddressBookItem | null;
  allAddressData?: AddressBookItem[];
}

export function EditAddressModal({ isOpen, onClose, item, allAddressData = [] }: EditAddressModalProps) {
  const [formData, setFormData] = useState<AddressBookItem>({
    name: "",
    addr: "",
    detail: "",
    manager: "",
    tel: "",
    method: "",
    group: "",
    lunch: "",
    note: "",
    img: null,
  });
  
  const [lunchStart, setLunchStart] = useState("");
  const [lunchEnd, setLunchEnd] = useState("");
  const [isKakaoOpen, setIsKakaoOpen] = useState(false);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);

  // Get unique group names from allAddressData
  const uniqueGroupNames = Array.from(new Set(allAddressData.map(item => item.group).filter(g => g)));

  // Filter group suggestions based on input
  const getGroupSuggestions = (input: string) => {
    if (!input) return [];
    return uniqueGroupNames.filter(group => 
      group.toLowerCase().includes(input.toLowerCase())
    );
  };

  useEffect(() => {
    if (item) {
      setFormData(item);
      // Parse lunch time if it exists
      if (item.lunch && item.lunch !== 'X' && item.lunch !== '') {
        const parts = item.lunch.split('~');
        if (parts.length === 2) {
          setLunchStart(parts[0]);
          setLunchEnd(parts[1]);
        }
      } else {
        setLunchStart("");
        setLunchEnd("");
      }
    } else {
      setFormData({
        name: "",
        addr: "",
        detail: "",
        manager: "",
        tel: "",
        method: "",
        group: "",
        lunch: "",
        note: "",
        img: null,
      });
      setLunchStart("");
      setLunchEnd("");
    }
  }, [item, isOpen]);

  const updateFormData = (updates: Partial<AddressBookItem>) => {
    setFormData({ ...formData, ...updates });
  };

  const filterTel = (value: string) => {
    const cleaned = value.replace(/[^0-9]/g, '');
    updateFormData({ tel: cleaned });
  };

  const handleLunchTimeChange = (value: string, isStart: boolean) => {
    // Remove all non-digits
    let cleaned = value.replace(/[^0-9]/g, '');
    
    // Limit to 4 digits (HHMM)
    if (cleaned.length > 4) {
      cleaned = cleaned.slice(0, 4);
    }
    
    // Format as HH:MM
    let formatted = cleaned;
    if (cleaned.length >= 3) {
      formatted = cleaned.slice(0, 2) + ':' + cleaned.slice(2);
    }
    
    if (isStart) {
      setLunchStart(formatted);
    } else {
      setLunchEnd(formatted);
    }
  };

  const handleSave = () => {
    // Create lunch time string if both fields are filled
    const lunchTime = (lunchStart && lunchEnd) ? `${lunchStart}~${lunchEnd}` : 'X';
    
    const dataToSave = {
      ...formData,
      lunch: lunchTime,
    };
    
    console.log("Saving:", dataToSave);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[480px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>
            {item ? "주소록 수정" : "주소록 추가"}
          </span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mt-1">
          <div className="relative">
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>그룹명</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
              type="text"
              placeholder="그룹명 (선택)"
              value={formData.group}
              onChange={(e) => updateFormData({ group: e.target.value })}
              onFocus={() => setShowGroupSuggestions(true)}
              onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
            />
            {showGroupSuggestions && getGroupSuggestions(formData.group).length > 0 && (
              <div 
                className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                style={{ border: '1px solid var(--border)' }}
              >
                {getGroupSuggestions(formData.group).map((group, index) => (
                  <div
                    key={index}
                    className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                    style={{ color: 'var(--black)' }}
                    onClick={() => {
                      updateFormData({ group });
                      setShowGroupSuggestions(false);
                    }}
                  >
                    {group}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col lg:flex-row gap-2.5">
            <div className="flex-1">
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>장소명 *</p>
              <input
                className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                type="text"
                placeholder="장소명"
                value={formData.name}
                onChange={(e) => updateFormData({ name: e.target.value })}
              />
            </div>
            <div className="lg:w-auto flex lg:justify-end">
              <div className="flex flex-col">
                <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>점심시간</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    maxLength={5}
                    className="h-10 w-[70px] rounded px-3 text-sm text-center outline-none transition-all"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                    value={lunchStart}
                    onChange={(e) => handleLunchTimeChange(e.target.value, true)}
                    placeholder="12:00"
                  />
                  <span className="text-sm" style={{ color: 'var(--gray)' }}>~</span>
                  <input
                    type="text"
                    maxLength={5}
                    className="h-10 w-[70px] rounded px-3 text-sm text-center outline-none transition-all"
                    style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                    value={lunchEnd}
                    onChange={(e) => handleLunchTimeChange(e.target.value, false)}
                    placeholder="13:00"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-[480px]:grid-cols-1">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>담당자명</p>
              <input
                className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                type="text"
                placeholder="담당자명"
                value={formData.manager}
                onChange={(e) => updateFormData({ manager: e.target.value })}
              />
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>연락처</p>
              <input
                className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                type="text"
                placeholder="연락처"
                value={formData.tel}
                onChange={(e) => filterTel(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5 max-[480px]:grid-cols-1">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>주소</p>
              <div className="relative">
                <input
                  className="h-10 w-full rounded px-3 pr-10 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white cursor-pointer"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                  type="text"
                  placeholder="주소 검색"
                  value={formData.addr}
                  readOnly
                  onClick={() => setIsKakaoOpen(true)}
                />
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
                  style={{ color: 'var(--gray)' }}
                  onClick={() => setIsKakaoOpen(true)}
                >
                  <Search size={16} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>상세주소</p>
              <input
                className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                type="text"
                placeholder="상세주소"
                value={formData.detail}
                onChange={(e) => updateFormData({ detail: e.target.value })}
              />
            </div>
          </div>

          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>특이사항</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
              type="text"
              placeholder="특이사항"
              value={formData.note}
              onChange={(e) => updateFormData({ note: e.target.value })}
            />
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button className="h-10 px-5 rounded text-sm transition-colors" style={{ background: 'var(--bg)', color: 'var(--gray)' }} onClick={onClose}>
            취소
          </button>
          <button className="h-10 px-5 rounded text-sm text-white transition-colors" style={{ background: 'var(--blue)' }} onClick={handleSave}>
            저장
          </button>
        </div>
      </div>

      <KakaoAddressModal
        isOpen={isKakaoOpen}
        onClose={() => setIsKakaoOpen(false)}
        onSelect={(address) => {
          updateFormData({ addr: address });
          setIsKakaoOpen(false);
        }}
      />

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