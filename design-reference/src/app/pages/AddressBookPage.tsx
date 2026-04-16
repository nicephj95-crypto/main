import { useState, useEffect } from "react";
import { Search, FileSpreadsheet, Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { Footer } from "../components/Footer";
import { EditAddressModal } from "../components/modals/EditAddressModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { ImageManageModal } from "../components/modals/ImageManageModal";
import { HistoryModal } from "../components/modals/HistoryModal";
import { useAuth } from "../contexts/AuthContext";

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
  images: string[];
}

const mockAddressBook: AddressBookItem[] = [
  { name: "효진이네", addr: "인천시 서구 청라동 123-4", detail: "효진이네 물류센터", manager: "김효진", tel: "010-1234-5678", method: "지게차", group: "화장품공장A", lunch: "X", note: "", img: null, images: [] },
  { name: "현서네", addr: "인천시 남동구 용현동 56-7", detail: "현서네 창고", manager: "이현서", tel: "010-9876-5432", method: "수작업", group: "마루시공업체B", lunch: "X", note: "", img: null, images: [] },
  { name: "302호 렌지네", addr: "인천시 연수구 옥련동 302", detail: "302호", manager: "박렌지", tel: "010-2222-3333", method: "지게차", group: "화장품공장A", lunch: "12:00~13:00", note: "도착 전 반드시 하차지 통화", img: null, images: [] },
  { name: "301호 이자네", addr: "인천시 연수구 옥련동 301", detail: "301호", manager: "최이자", tel: "010-4444-5555", method: "수작업", group: "마루시공업체B", lunch: "X", note: "도착 전 반드시 하차지 통화", img: null, images: [] },
  { name: "청라 제로백PC방", addr: "인천시 서구 청라동 777", detail: "제로백PC방", manager: "홍길동", tel: "010-7777-8888", method: "컨베이어", group: "헬스가구제조C", lunch: "X", note: "검수 및 대기 (20~90분)", img: null, images: [] },
  { name: "용현동 잇츠PC", addr: "인천시 남동구 용현동 99", detail: "잇츠PC방", manager: "이순신", tel: "010-1111-2222", method: "컨베이어", group: "헬스가구제조C", lunch: "X", note: "도착 전 반드시 하차지 통화", img: null, images: [] },
  { name: "204호 비타네", addr: "인천시 연수구 옥련동 204", detail: "204호", manager: "정비타", tel: "010-3333-4444", method: "수작업", group: "화장품공장A", lunch: "X", note: "", img: null, images: [] },
  { name: "203호 민이네", addr: "인천시 연수구 옥련동 203", detail: "203호", manager: "강민이", tel: "010-5555-6666", method: "수작업", group: "마루시공업체B", lunch: "X", note: "", img: null, images: [] },
];

export function AddressBookPage() {
  const { userRole, company: userCompany } = useAuth();
  const [addressBook, setAddressBook] = useState<AddressBookItem[]>(mockAddressBook);
  const [placeName, setPlaceName] = useState("");
  const [groupName, setGroupName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AddressBookItem | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [imageManagingIndex, setImageManagingIndex] = useState<number | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  
  // 변경이력 모달 상태
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState('');
  const [historyModalData, setHistoryModalData] = useState<any[]>([]);
  
  // Auto-register setting
  const [autoRegister, setAutoRegister] = useState(() => {
    const saved = localStorage.getItem('addressAutoRegister');
    return saved !== null ? saved === 'true' : true; // Default: enabled
  });
  
  // Temporary filter states for mobile
  const [tempPlaceName, setTempPlaceName] = useState(placeName);
  const [tempGroupName, setTempGroupName] = useState(groupName);
  
  // Group name autocomplete states
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [showMobileGroupSuggestions, setShowMobileGroupSuggestions] = useState(false);

  // Save auto-register setting to localStorage
  const toggleAutoRegister = () => {
    const newValue = !autoRegister;
    setAutoRegister(newValue);
    localStorage.setItem('addressAutoRegister', String(newValue));
  };

  // Get unique group names from addressBook
  const uniqueGroupNames = Array.from(new Set(addressBook.map(item => item.group).filter(g => g)));

  // Filter group suggestions based on input
  const getGroupSuggestions = (input: string) => {
    if (!input) return [];
    return uniqueGroupNames.filter(group => 
      group.toLowerCase().includes(input.toLowerCase())
    );
  };

  // 고객 권한일 때 회사 필터링 먼저 적용
  const companyFilteredData = userRole === '고객' && userCompany
    ? addressBook.filter(item => item.group === userCompany)
    : addressBook;

  const filteredItems = companyFilteredData.filter((item) => {
    if (placeName && !item.name.toLowerCase().includes(placeName.toLowerCase())) return false;
    if (groupName && !item.group.toLowerCase().includes(groupName.toLowerCase())) return false;
    return true;
  });

  const handleEdit = (item: AddressBookItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const handleDelete = (index: number) => {
    setDeletingIndex(index);
    setConfirmModalOpen(true);
  };

  const handleImageManage = (index: number) => {
    setImageManagingIndex(index);
    setImageModalOpen(true);
  };

  const handleImageSave = (images: string[]) => {
    if (imageManagingIndex !== null) {
      const updatedAddressBook = [...addressBook];
      updatedAddressBook[imageManagingIndex].images = images;
      setAddressBook(updatedAddressBook);
    }
  };

  // Prevent body scroll when modals are open
  useEffect(() => {
    if (editModalOpen || confirmModalOpen || imageModalOpen || showMobileFilter) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editModalOpen, confirmModalOpen, imageModalOpen, showMobileFilter]);

  return (
    <>
      <div className="max-w-[1180px] mx-auto px-1 pt-10 pb-20 max-[1280px]:px-2 max-[768px]:px-4 max-[768px]:pt-5 max-[768px]:pb-12">
        {/* Auto-register Toggle - Desktop */}
        <div className="flex items-center justify-between mb-4 max-[768px]:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleAutoRegister}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none"
              style={{ background: autoRegister ? 'var(--blue)' : '#D1D5DB' }}
            >
              <span
                className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
                style={{ transform: autoRegister ? 'translateX(22px)' : 'translateX(2px)' }}
              />
            </button>
            <div>
              <div className="text-sm font-bold" style={{ color: 'var(--black)' }}>
                배차 접수 시 자동 주소록 등록
              </div>
              <div className="text-xs" style={{ color: 'var(--gray)' }}>
                새로운 출도착지 정보를 주소록에 자동으로 저장합니다
              </div>
            </div>
          </div>
          <div className="text-xs px-3 py-1.5 rounded-full" style={{ background: autoRegister ? 'rgba(0, 117, 255, 0.1)' : 'var(--bg2)', color: autoRegister ? 'var(--blue)' : 'var(--gray)' }}>
            {autoRegister ? 'ON' : 'OFF'}
          </div>
        </div>

        {/* Auto-register Toggle - Mobile */}
        <div className="hidden max-[768px]:flex items-center justify-between mb-4 p-3.5 rounded-lg bg-white" style={{ border: '1px solid var(--border3)' }}>
          <div className="flex-1 min-w-0 mr-3">
            <div className="text-sm font-bold mb-0.5" style={{ color: 'var(--black)' }}>
              자동 주소록 등록
            </div>
            <div className="text-xs" style={{ color: 'var(--gray)' }}>
              배차 접수 시 출도착지 자동 저장
            </div>
          </div>
          <button
            onClick={toggleAutoRegister}
            className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none"
            style={{ background: autoRegister ? 'var(--blue)' : '#D1D5DB' }}
          >
            <span
              className="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform"
              style={{ transform: autoRegister ? 'translateX(26px)' : 'translateX(3px)' }}
            />
          </button>
        </div>

        {/* Filters - Desktop */}
        <div className="flex items-center gap-2.5 mb-5 flex-wrap max-[768px]:hidden relative">
          <div className="relative">
            <input
              className="h-10 rounded-3xl px-4 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] w-[200px]"
              style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
              type="text"
              placeholder="그룹명"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onFocus={() => setShowGroupSuggestions(true)}
              onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
            />
            {showGroupSuggestions && getGroupSuggestions(groupName).length > 0 && (
              <div 
                className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                style={{ border: '1px solid var(--border)' }}
              >
                {getGroupSuggestions(groupName).map((group, index) => (
                  <div
                    key={index}
                    className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                    style={{ color: 'var(--black)' }}
                    onClick={() => {
                      setGroupName(group);
                      setShowGroupSuggestions(false);
                    }}
                  >
                    {group}
                  </div>
                ))}
              </div>
            )}
          </div>
          <input
            className="h-10 rounded-3xl px-4 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] w-[200px]"
            style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
            type="text"
            placeholder="장소명"
            value={placeName}
            onChange={(e) => setPlaceName(e.target.value)}
          />
          <button className="w-10 h-10 rounded-3xl flex items-center justify-center flex-shrink-0 transition-colors hover:bg-[#78B6FF]" style={{ background: 'var(--bg2)' }}>
            <Search size={16} style={{ stroke: 'var(--gray)' }} />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <select className="h-10 rounded-[2px] bg-white text-sm px-4 pr-8 appearance-none cursor-pointer outline-none min-w-[140px]" style={{ border: '1px solid var(--border3)', color: 'var(--black)', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M4 6l4 4 4-4' stroke='%23767676' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
              <option>100개씩 보기</option>
              <option>50개씩 보기</option>
              <option>전체 보기</option>
            </select>

            <button className="w-10 h-10 rounded-[2px] flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF]" style={{ border: '1px solid var(--border3)' }} title="엑셀">
              <FileSpreadsheet size={20} style={{ stroke: '#107c41' }} />
            </button>

            <button
              className="h-10 px-5 rounded flex items-center gap-1.5 whitespace-nowrap text-sm text-white transition-colors hover:bg-[#78B6FF]"
              style={{ background: 'var(--blue)' }}
              onClick={() => {
                setEditingItem(null);
                setEditModalOpen(true);
              }}
            >
              <Plus size={14} />
              주소록 추가
            </button>
          </div>
        </div>

        {/* Filters - Mobile */}
        <div className="hidden max-[768px]:block space-y-2.5 mb-4">
          <button 
            className="w-full h-11 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors active:opacity-80"
            style={{ background: 'var(--bg2)', color: 'var(--black)' }}
            onClick={() => {
              setTempPlaceName(placeName);
              setTempGroupName(groupName);
              setShowMobileFilter(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M6 10h8M8 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>필터</span>
            {(placeName || groupName) && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: 'var(--blue)' }}>
                {[placeName, groupName].filter(Boolean).length}
              </span>
            )}
          </button>
          <div className="text-right text-sm" style={{ color: 'var(--gray)' }}>
            총 {filteredItems.length}건
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto max-[768px]:hidden">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '11%' }}>그룹명</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '11%' }}>장소명</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '9%' }}>담당자명</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '11%' }}>연락처</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '17%' }}>주소</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '9%' }}>점심시간</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '17%' }}>특이사항</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white overflow-hidden" style={{ background: 'var(--dark)', width: '15%' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, index) => (
                <tr key={index}>
                  <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.group}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.name}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.manager}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.tel}</p>
                  </td>
                  <td className="bg-white text-[13px] text-left px-3.5 py-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.addr}</p>
                    <p className="leading-snug m-0">{item.detail}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.lunch === 'X' ? '-' : item.lunch}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{item.note}</p>
                  </td>
                  <td className="bg-white text-center p-2" style={{ borderBottom: '1px solid var(--border3)' }}>
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF]"
                        style={{ border: '1px solid var(--border3)' }}
                        onClick={() => handleEdit(item)}
                        title="수정"
                      >
                        <Pencil size={14} style={{ stroke: 'var(--gray)' }} />
                      </button>
                      <button
                        className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF]"
                        style={{ border: '1px solid var(--border3)' }}
                        onClick={() => handleDelete(index)}
                        title="삭제"
                      >
                        <Trash2 size={14} style={{ stroke: 'var(--gray)' }} />
                      </button>
                      <button
                        className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF]"
                        style={{ border: '1px solid var(--border3)' }}
                        onClick={() => handleImageManage(addressBook.indexOf(item))}
                        title="이미지"
                      >
                        <ImageIcon size={14} style={{ stroke: item.images.length > 0 ? '#0075FF' : 'var(--gray)' }} />
                      </button>
                      {/* H(History) 버튼 - 관리 권한만 표시 */}
                      {userRole === '관리' && (
                        <button
                          className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF] text-xs font-bold"
                          style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                          onClick={() => {
                            // Mock 변경이력 데이터
                            const mockHistories = [
                              {
                                user: '김배차',
                                timestamp: '2025.11.28 10:20:15',
                                action: '담당자 정보 수정',
                                field: '담당자명',
                                oldValue: '김철수',
                                newValue: item.manager
                              },
                              {
                                user: '이배차',
                                timestamp: '2025.11.25 14:30:00',
                                action: '생성',
                                field: '',
                                oldValue: '',
                                newValue: ''
                              }
                            ];
                            setHistoryModalTitle(`주소록 - ${item.name}`);
                            setHistoryModalData(mockHistories);
                            setHistoryModalOpen(true);
                          }}
                          title="변경이력 확인"
                        >
                          H
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="mobile-cards-container space-y-3" style={{ display: 'none' }}>
          <style>{`
            @media (max-width: 768px) {
              .mobile-cards-container {
                display: block !important;
              }
            }
          `}</style>
          {filteredItems.map((item, index) => (
            <div 
              key={index} 
              className="bg-white rounded-lg p-3.5 shadow-sm" 
              style={{ border: '1px solid var(--border3)' }}
            >
              {/* Header: Name & Group */}
              <div className="flex items-start justify-between mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0">
                  {item.group && (
                    <div className="inline-block px-2 py-0.5 rounded text-xs font-medium mb-1" style={{ background: 'rgba(0, 117, 255, 0.1)', color: 'var(--blue)' }}>
                      {item.group}
                    </div>
                  )}
                  <div className="text-base font-bold" style={{ color: 'var(--black)' }}>{item.name}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <button
                    className="w-9 h-9 rounded flex items-center justify-center bg-white transition-colors active:bg-gray-50"
                    style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                    onClick={() => handleEdit(item)}
                    title="수정"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="w-9 h-9 rounded flex items-center justify-center bg-white transition-colors active:bg-gray-50"
                    style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                    onClick={() => handleDelete(index)}
                    title="삭제"
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    className="w-9 h-9 rounded flex items-center justify-center bg-white transition-colors active:bg-gray-50"
                    style={{ border: '1px solid var(--border3)' }}
                    onClick={() => handleImageManage(index)}
                    title="이미지"
                  >
                    <ImageIcon size={16} style={{ stroke: item.images.length > 0 ? '#0075FF' : 'var(--gray)' }} />
                  </button>
                  {/* H(History) 버튼 - 관리 권한만 표시 */}
                  {userRole === '관리' && (
                    <button
                      className="w-9 h-9 rounded flex items-center justify-center bg-white transition-colors active:bg-gray-50 text-sm font-bold"
                      style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                      onClick={() => {
                        // Mock 변경이력 데이터
                        const mockHistories = [
                          {
                            user: '김배차',
                            timestamp: '2025.11.28 10:20:15',
                            action: '담당자 정보 수정',
                            field: '담당자명',
                            oldValue: '김철수',
                            newValue: item.manager
                          },
                          {
                            user: '이배차',
                            timestamp: '2025.11.25 14:30:00',
                            action: '생성',
                            field: '',
                            oldValue: '',
                            newValue: ''
                          }
                        ];
                        setHistoryModalTitle(`주소록 - ${item.name}`);
                        setHistoryModalData(mockHistories);
                        setHistoryModalOpen(true);
                      }}
                      title="변경이력 확인"
                    >
                      H
                    </button>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>담자</div>
                  <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>{item.manager} · {item.tel}</div>
                </div>

                <div className="flex items-start gap-2">
                  <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>주소</div>
                  <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>
                    {item.addr} {item.detail}
                  </div>
                </div>

                {item.lunch && item.lunch !== 'X' && (
                  <div className="flex items-start gap-2">
                    <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>점심시간</div>
                    <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>{item.lunch}</div>
                  </div>
                )}

                <div className="flex items-start gap-2">
                  <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>특이사항</div>
                  <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>{item.note || '-'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Floating Add Button */}
      <button
        className="hidden max-[768px]:flex fixed bottom-20 right-4 w-14 h-14 rounded-full shadow-lg items-center justify-center z-40 active:scale-95 transition-transform"
        style={{ background: 'var(--blue)' }}
        onClick={() => {
          setEditingItem(null);
          setEditModalOpen(true);
        }}
      >
        <Plus size={24} color="white" strokeWidth={2.5} />
      </button>

      {/* Mobile Filter Bottom Sheet */}
      {showMobileFilter && (
        <div 
          className="hidden max-[768px]:block fixed inset-0 bg-black/50 z-50"
          onClick={() => setShowMobileFilter(false)}
        >
          <div 
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-4 py-3.5 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-bold" style={{ color: 'var(--black)' }}>필터</h3>
              <button 
                className="w-8 h-8 flex items-center justify-center"
                onClick={() => setShowMobileFilter(false)}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M6 6l8 8m0-8l-8 8" stroke="var(--gray)" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            {/* Filter Content */}
            <div className="p-4 space-y-4">
              {/* Group Name */}
              <div className="relative">
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>그룹명</label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
                  type="text"
                  placeholder="그룹명 입력"
                  value={tempGroupName}
                  onChange={(e) => setTempGroupName(e.target.value)}
                  onFocus={() => setShowMobileGroupSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowMobileGroupSuggestions(false), 200)}
                />
                {showMobileGroupSuggestions && getGroupSuggestions(tempGroupName).length > 0 && (
                  <div 
                    className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {getGroupSuggestions(tempGroupName).map((group, index) => (
                      <div
                        key={index}
                        className="px-4 py-2.5 cursor-pointer text-sm transition-colors active:bg-[var(--bg2)]"
                        style={{ color: 'var(--black)' }}
                        onClick={() => {
                          setTempGroupName(group);
                          setShowMobileGroupSuggestions(false);
                        }}
                      >
                        {group}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Place Name */}
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>장소명</label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
                  type="text"
                  placeholder="장소명 입력"
                  value={tempPlaceName}
                  onChange={(e) => setTempPlaceName(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <button 
                className="h-12 px-6 rounded-lg flex items-center justify-center font-medium text-sm transition-colors"
                style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                onClick={() => {
                  setTempPlaceName("");
                  setTempGroupName("");
                }}
              >
                초기화
              </button>
              <button 
                className="flex-1 h-12 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-colors active:opacity-80"
                style={{ background: 'var(--blue)', color: 'white' }}
                onClick={() => {
                  setPlaceName(tempPlaceName);
                  setGroupName(tempGroupName);
                  setShowMobileFilter(false);
                }}
              >
                <Search size={18} />
                <span>적용</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <EditAddressModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        item={editingItem}
        allAddressData={addressBook}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => {
          console.log("Delete confirmed");
          setConfirmModalOpen(false);
        }}
        title="삭제 확인"
        message="정말로 이 주소를 삭제하시겠습니까?"
      />

      <ImageManageModal
        isOpen={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        item={imageManagingIndex !== null ? addressBook[imageManagingIndex] : null}
        onSave={handleImageSave}
      />

      {/* 변경이력 모달 (관리 권한용) */}
      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={historyModalTitle}
        histories={historyModalData}
      />

      <Footer />
    </>
  );
}