import { useState, useEffect } from "react";
import { X, Search } from "lucide-react";

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
  company: string; // 회사 정보 추가
}

interface AddressBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "from" | "to";
  onSelect: (item: AddressBookItem, selectedTarget: "from" | "to") => void;
  userCompany?: string | null; // 고객 권한 시 회사 필터링용
}

const mockAddressBook: AddressBookItem[] = [
  { name: "효진이네", addr: "인천시 서구 청라동 123-4", detail: "효진이네 물류센터", manager: "김효진", tel: "010-1234-5678", method: "지게차", group: "거래처", lunch: "X", note: "", company: "마루시공업체B" },
  { name: "현서네", addr: "인천시 남동구 용현동 56-7", detail: "현서네 창고", manager: "이현서", tel: "010-9876-5432", method: "수작업", group: "거래처", lunch: "X", note: "", company: "마루시공업체B" },
  { name: "302호 렌지네", addr: "인천시 연수구 옥련동 302", detail: "302호", manager: "박렌지", tel: "010-2222-3333", method: "지게차", group: "", lunch: "12:00~13:00", note: "도착 전 반드시 하차지 통화", company: "화장품공장A" },
  { name: "301호 이자네", addr: "인천시 연수구 옥련동 301", detail: "301호", manager: "최이자", tel: "010-4444-5555", method: "수작업", group: "", lunch: "X", note: "도착 전 반드시 하차지 통화", company: "화장품공장A" },
  { name: "청라 제로백PC방", addr: "인천시 서구 청라동 777", detail: "제로백PC방", manager: "홍길동", tel: "010-7777-8888", method: "컨베이어", group: "여명의 성위 팩토리", lunch: "X", note: "검수 및 대기 (20~90분)", company: "마루시공업체B" },
];

export function AddressBookModal({ isOpen, onClose, targetType, onSelect, userCompany }: AddressBookModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTarget, setSelectedTarget] = useState<"from" | "to">(targetType);
  const [selectedItem, setSelectedItem] = useState<AddressBookItem | null>(null);

  useEffect(() => {
    setSelectedTarget(targetType);
  }, [targetType]);

  // 고객 권한인 경우 회사 필터링 먼저 적용
  const companyFilteredItems = userCompany 
    ? mockAddressBook.filter((item) => item.company === userCompany)
    : mockAddressBook;

  const filteredItems = companyFilteredItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.addr.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApply = () => {
    if (selectedItem) {
      onSelect(selectedItem, selectedTarget);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[520px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>주소록</span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <Search size={16} style={{ stroke: 'var(--ph)' }} />
          </span>
          <input
            className="h-10 w-full rounded px-3 pl-[34px] text-sm outline-none transition-all placeholder:text-[var(--ph)]"
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
            type="text"
            placeholder="이름 또는 주소 검색…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="max-h-80 overflow-y-auto flex flex-col gap-1.5">
          {filteredItems.map((item, index) => (
            <div
              key={index}
              onClick={() => setSelectedItem(item)}
              className={`rounded-md p-2.5 px-4 cursor-pointer transition-all ${
                selectedItem === item ? '' : ''
              }`}
              style={{
                background: selectedItem === item ? '#e6f0ff' : 'var(--bg)',
                border: `1px solid ${selectedItem === item ? 'var(--blue)' : 'var(--border)'}`,
              }}
            >
              <div className="text-sm font-bold mb-0.5" style={{ color: 'var(--black)' }}>
                {item.name}
              </div>
              <div className="text-xs" style={{ color: 'var(--gray)' }}>
                {item.addr} {item.detail}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs mt-3.5 mb-1.5" style={{ color: 'var(--gray)' }}>적용 위치</p>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedTarget("from")}
            className={`flex-1 h-9 rounded text-[13px] transition-all ${selectedTarget === "from" ? 'font-bold' : ''}`}
            style={{
              border: `1px solid ${selectedTarget === "from" ? 'var(--blue)' : 'var(--border)'}`,
              color: selectedTarget === "from" ? 'var(--blue)' : 'var(--black)',
              background: selectedTarget === "from" ? '#f0f6ff' : 'transparent',
            }}
          >
            출발지
          </button>
          <button
            onClick={() => setSelectedTarget("to")}
            className={`flex-1 h-9 rounded text-[13px] transition-all ${selectedTarget === "to" ? 'font-bold' : ''}`}
            style={{
              border: `1px solid ${selectedTarget === "to" ? 'var(--blue)' : 'var(--border)'}`,
              color: selectedTarget === "to" ? 'var(--blue)' : 'var(--black)',
              background: selectedTarget === "to" ? '#f0f6ff' : 'transparent',
            }}
          >
            도착지
          </button>
        </div>

        <div className="flex gap-2 justify-end mt-5">
          <button className="h-10 px-5 rounded text-sm transition-colors" style={{ background: 'var(--bg)', color: 'var(--gray)' }} onClick={onClose}>
            취소
          </button>
          <button className="h-10 px-5 rounded text-sm text-white transition-colors" style={{ background: 'var(--blue)' }} onClick={handleApply}>
            적용
          </button>
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