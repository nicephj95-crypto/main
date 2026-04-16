import { useState } from "react";
import { Search, FileSpreadsheet, Plus, Pencil, Trash2 } from "lucide-react";
import { Footer } from "../components/Footer";
import { EditGroupModal } from "../components/modals/EditGroupModal";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { HistoryModal } from "../components/modals/HistoryModal";
import { useAuth } from "../contexts/AuthContext";

interface GroupItem {
  company: string;
  department: string;
  employee: string;
  position: string;
  tel: string;
  email: string;
}

const mockGroupData: GroupItem[] = [
  { company: "화장품공장A", department: "생산팀", employee: "김생산", position: "팀장", tel: "010-1111-2222", email: "production@company-a.com" },
  { company: "화장품공장A", department: "생산팀", employee: "이생산", position: "사원", tel: "010-1111-3333", email: "production2@company-a.com" },
  { company: "화장품공장A", department: "구매팀", employee: "박구매", position: "과장", tel: "010-1111-4444", email: "purchase@company-a.com" },
  { company: "화장품공장A", department: "구매팀", employee: "최구매", position: "대리", tel: "010-1111-5555", email: "purchase2@company-a.com" },
  { company: "마루시공업체B", department: "영업팀", employee: "정영업", position: "부장", tel: "010-2222-1111", email: "sales@company-b.com" },
  { company: "마루시공업체B", department: "영업팀", employee: "강영업", position: "사원", tel: "010-2222-2222", email: "sales2@company-b.com" },
  { company: "마루시공업체B", department: "물류팀", employee: "윤물류", position: "팀장", tel: "010-2222-3333", email: "logistics@company-b.com" },
  { company: "헬스가구제조C", department: "관리팀", employee: "송관리", position: "차장", tel: "010-3333-1111", email: "admin@company-c.com" },
];

export function GroupManagePage() {
  const { userRole, company: userCompany } = useAuth();
  const [groupData, setGroupData] = useState<GroupItem[]>(mockGroupData);
  const [companyName, setCompanyName] = useState("");
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<GroupItem | null>(null);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'addDepartment' | 'addEmployee'>('add');
  const [prefilledData, setPrefilledData] = useState<Partial<GroupItem>>({});
  
  // 변경이력 모달 상태
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState('');
  const [historyModalData, setHistoryModalData] = useState<any[]>([]);
  
  // Temporary filter states for mobile
  const [tempCompanyName, setTempCompanyName] = useState(companyName);
  
  // Autocomplete states
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [showMobileCompanySuggestions, setShowMobileCompanySuggestions] = useState(false);

  // Get unique company and department names
  const uniqueCompanyNames = Array.from(new Set(groupData.map(item => item.company).filter(c => c)));
  const uniqueDepartmentNames = Array.from(new Set(groupData.map(item => item.department).filter(d => d)));

  // Filter suggestions based on input
  const getCompanySuggestions = (input: string) => {
    if (!input) return [];
    return uniqueCompanyNames.filter(company => 
      company.toLowerCase().includes(input.toLowerCase())
    );
  };

  const getDepartmentSuggestions = (input: string) => {
    if (!input) return [];
    return uniqueDepartmentNames.filter(department => 
      department.toLowerCase().includes(input.toLowerCase())
    );
  };

  // 고객 권한일 때 회사 필터링 먼저 적용
  const companyFilteredData = userRole === '고객' && userCompany
    ? groupData.filter(item => item.company === userCompany)
    : groupData;

  const filteredItems = companyFilteredData.filter((item) => {
    if (companyName && !item.company.toLowerCase().includes(companyName.toLowerCase())) return false;
    return true;
  });

  // Group items by company
  const groupedByCompany = filteredItems.reduce((acc, item) => {
    if (!acc[item.company]) {
      acc[item.company] = [];
    }
    acc[item.company].push(item);
    return acc;
  }, {} as Record<string, GroupItem[]>);

  const companies = Object.keys(groupedByCompany).sort();

  const handleEdit = (item: GroupItem) => {
    setEditingItem(item);
    setModalMode('edit');
    setEditModalOpen(true);
  };

  const handleDelete = (index: number) => {
    setDeletingIndex(index);
    setConfirmModalOpen(true);
  };

  const handleAddDepartment = (company: string) => {
    setModalMode('addDepartment');
    setPrefilledData({ company });
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const handleAddEmployee = (company: string) => {
    setModalMode('addEmployee');
    setPrefilledData({ company });
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const toggleCompany = (company: string) => {
    setExpandedCompanies(prev => ({
      ...prev,
      [company]: !prev[company]
    }));
  };

  const isExpanded = (company: string) => {
    // 고객 권한은 항상 펼쳐진 상태
    if (userRole === '고객') return true;
    return expandedCompanies[company] === true; // Default to false (collapsed)
  };

  const confirmDelete = () => {
    if (deletingIndex !== null) {
      const newData = [...groupData];
      newData.splice(deletingIndex, 1);
      setGroupData(newData);
      setDeletingIndex(null);
    }
    setConfirmModalOpen(false);
  };

  return (
    <>
      <div className="max-w-[1180px] mx-auto px-1 pt-10 pb-20 max-[1280px]:px-2 max-[768px]:px-4 max-[768px]:pt-5 max-[768px]:pb-12">
        {/* Filters - Desktop */}
        <div className="flex items-center gap-2.5 mb-5 flex-wrap max-[768px]:hidden relative">
          <div className="relative">
            <input
              className="h-10 rounded-3xl px-4 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] w-[200px]"
              style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
              type="text"
              placeholder="거래처명"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              onFocus={() => setShowCompanySuggestions(true)}
              onBlur={() => setTimeout(() => setShowCompanySuggestions(false), 200)}
            />
            {showCompanySuggestions && getCompanySuggestions(companyName).length > 0 && (
              <div 
                className="absolute z-10 mt-1 w-full bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                style={{ border: '1px solid var(--border)' }}
              >
                {getCompanySuggestions(companyName).map((company, index) => (
                  <div
                    key={index}
                    className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                    style={{ color: 'var(--black)' }}
                    onClick={() => {
                      setCompanyName(company);
                      setShowCompanySuggestions(false);
                    }}
                  >
                    {company}
                  </div>
                ))}
              </div>
            )}
          </div>
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
                setModalMode('add');
                setPrefilledData({});
                setEditModalOpen(true);
              }}
            >
              <Plus size={14} />
              그룹 추가
            </button>
          </div>
        </div>

        {/* Filters - Mobile */}
        <div className="hidden max-[768px]:block space-y-2.5 mb-4">
          <button 
            className="w-full h-11 rounded-lg flex items-center justify-center gap-2 font-medium text-sm transition-colors active:opacity-80"
            style={{ background: 'var(--bg2)', color: 'var(--black)' }}
            onClick={() => {
              setTempCompanyName(companyName);
              setShowMobileFilter(true);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 6h14M6 10h8M8 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>필터</span>
            {(companyName) && (
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs text-white" style={{ background: 'var(--blue)' }}>
                {[companyName].filter(Boolean).length}
              </span>
            )}
          </button>
          <div className="text-right text-sm" style={{ color: 'var(--gray)' }}>
            총 {filteredItems.length}건
          </div>
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto max-[768px]:hidden">
          {companies.map((company, companyIndex) => (
            <div key={company} className="mb-4">
              {/* Company Header */}
              <div 
                className="h-12 flex items-center justify-between px-4 cursor-pointer rounded-t"
                style={{ 
                  background: 'var(--bg2)',
                  borderBottom: '1px solid var(--border3)'
                }}
                onClick={() => toggleCompany(company)}
              >
                <div className="flex items-center">
                  <h3 className="text-base font-bold" style={{ color: 'var(--black)' }}>{company}</h3>
                  <span className="ml-2 text-sm" style={{ color: 'var(--gray)' }}>({groupedByCompany[company].length}명)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="h-8 px-3 rounded flex items-center gap-1.5 text-xs font-medium transition-colors hover:bg-[#78B6FF]"
                    style={{ background: 'white', border: '1px solid var(--border3)', color: 'var(--black)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddDepartment(company);
                    }}
                  >
                    <Plus size={12} />
                    부서추가
                  </button>
                  <button
                    className="h-8 px-3 rounded flex items-center gap-1.5 text-xs font-medium transition-colors hover:bg-[#78B6FF]"
                    style={{ background: 'white', border: '1px solid var(--border3)', color: 'var(--black)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddEmployee(company);
                    }}
                  >
                    <Plus size={12} />
                    담당자추가
                  </button>
                  {/* H(History) 버튼 - 관리 권한만 표시 */}
                  {userRole === '관리' && (
                    <button
                      className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF] text-sm font-bold"
                      style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Mock 변경이력 데이터
                        const mockHistories = [
                          {
                            user: '김배차',
                            timestamp: '2025.11.30 16:45:30',
                            action: '담당자 추가',
                            field: '',
                            oldValue: '',
                            newValue: `${groupedByCompany[company][0]?.employee}`
                          },
                          {
                            user: '이배차',
                            timestamp: '2025.11.28 09:20:10',
                            action: '부서 추가',
                            field: '부서명',
                            oldValue: '',
                            newValue: `${groupedByCompany[company][0]?.department}`
                          }
                        ];
                        setHistoryModalTitle(`그룹 - ${company}`);
                        setHistoryModalData(mockHistories);
                        setHistoryModalOpen(true);
                      }}
                      title="변경이력 확인"
                    >
                      H
                    </button>
                  )}
                  {/* 펼치기/닫기 버튼 - 고객 권한은 숨김 */}
                  {userRole !== '고객' && (
                    <button
                      className="w-8 h-8 rounded flex items-center justify-center hover:bg-black/5 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompany(company);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ transform: isExpanded(company) ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                        <path d="M4 10l4-4 4 4" stroke="var(--black)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Company Table */}
              {isExpanded(company) && (
                <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                  <thead>
                    <tr>
                      <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap overflow-hidden text-white" style={{ background: 'var(--dark)', width: '20%' }}>부서명</th>
                      <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap overflow-hidden text-white" style={{ background: 'var(--dark)', width: '15%' }}>담당자명</th>
                      <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap overflow-hidden text-white" style={{ background: 'var(--dark)', width: '12%' }}>직급</th>
                      <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap overflow-hidden text-white" style={{ background: 'var(--dark)', width: '18%' }}>연락처</th>
                      <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap overflow-hidden text-white" style={{ background: 'var(--dark)', width: '25%' }}>이메일</th>
                      <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap overflow-hidden text-white" style={{ background: 'var(--dark)', width: '10%' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupedByCompany[company].map((item, index) => (
                      <tr key={index}>
                        <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)', color: 'var(--black)' }}>
                          <p className="leading-snug m-0">{item.department}</p>
                        </td>
                        <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)', color: 'var(--black)' }}>
                          <p className="leading-snug m-0">{item.employee}</p>
                        </td>
                        <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)', color: 'var(--black)' }}>
                          <p className="leading-snug m-0">{item.position}</p>
                        </td>
                        <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)', color: 'var(--black)' }}>
                          <p className="leading-snug m-0">{item.tel}</p>
                        </td>
                        <td className="bg-white text-[13px] text-center p-2 break-words" style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)', color: 'var(--black)' }}>
                          <p className="leading-snug m-0">{item.email}</p>
                        </td>
                        <td className="bg-white text-center p-2" style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)' }}>
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
                              onClick={() => handleDelete(filteredItems.indexOf(item))}
                              title="삭제"
                            >
                              <Trash2 size={14} style={{ stroke: 'var(--gray)' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}
        </div>

        {/* Mobile Cards */}
        <div className="hidden max-[768px]:block">
          {companies.map((company, companyIndex) => (
            <div key={company} className="mb-4">
              {/* Company Header */}
              <div 
                className="flex items-center justify-between px-4 cursor-pointer rounded-t"
                style={{ 
                  background: 'var(--bg2)', 
                  minHeight: '44px', 
                  paddingTop: '8px', 
                  paddingBottom: '8px',
                  borderBottom: '1px solid var(--border3)'
                }}
                onClick={() => toggleCompany(company)}
              >
                <div className="flex items-center min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold truncate" style={{ color: 'var(--black)' }}>{company}</h3>
                  <span className="ml-2 text-xs flex-shrink-0" style={{ color: 'var(--gray)' }}>({groupedByCompany[company].length}명)</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  <button
                    className="h-7 px-2 rounded flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap active:bg-gray-100"
                    style={{ background: 'white', border: '1px solid var(--border3)', color: 'var(--black)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddDepartment(company);
                    }}
                  >
                    <Plus size={10} />
                    부서
                  </button>
                  <button
                    className="h-7 px-2 rounded flex items-center gap-1 text-[11px] font-medium transition-colors whitespace-nowrap active:bg-gray-100"
                    style={{ background: 'white', border: '1px solid var(--border3)', color: 'var(--black)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddEmployee(company);
                    }}
                  >
                    <Plus size={10} />
                    담당자
                  </button>
                  {/* H(History) 버튼 - 관리 권한만 표시 */}
                  {userRole === '관리' && (
                    <button
                      className="w-7 h-7 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[#78B6FF] text-sm font-bold"
                      style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Mock 변경이력 데이터
                        const mockHistories = [
                          {
                            user: '김배차',
                            timestamp: '2025.11.30 16:45:30',
                            action: '담당자 추가',
                            field: '',
                            oldValue: '',
                            newValue: `${groupedByCompany[company][0]?.employee}`
                          },
                          {
                            user: '이배차',
                            timestamp: '2025.11.28 09:20:10',
                            action: '부서 추가',
                            field: '부서명',
                            oldValue: '',
                            newValue: `${groupedByCompany[company][0]?.department}`
                          }
                        ];
                        setHistoryModalTitle(`그룹 - ${company}`);
                        setHistoryModalData(mockHistories);
                        setHistoryModalOpen(true);
                      }}
                      title="변경이력 확인"
                    >
                      H
                    </button>
                  )}
                  {/* 펼치기/닫기 버튼 - 고객 권한은 숨김 */}
                  {userRole !== '고객' && (
                    <button
                      className="w-7 h-7 rounded flex items-center justify-center active:bg-black/5 transition-colors flex-shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCompany(company);
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ transform: isExpanded(company) ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
                        <path d="M3.5 8.75l3.5-3.5 3.5 3.5" stroke="var(--black)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Company Cards */}
              {isExpanded(company) && (
                <div className="bg-white" style={{ border: '1px solid var(--border3)', borderTop: 'none' }}>
                  {groupedByCompany[company].map((item, index) => (
                    <div 
                      key={index} 
                      className="p-3.5" 
                      style={{ borderBottom: index === groupedByCompany[company].length - 1 ? 'none' : '1px solid var(--border3)' }}
                    >
                      {/* Header: Department */}
                      <div className="flex items-start justify-between mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold" style={{ color: 'var(--black)' }}>{item.department}</div>
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
                            onClick={() => handleDelete(filteredItems.indexOf(item))}
                            title="삭제"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>담당자</div>
                          <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>{item.employee} · {item.position}</div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>연락처</div>
                          <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>{item.tel}</div>
                        </div>

                        <div className="flex items-start gap-2">
                          <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '56px' }}>이메일</div>
                          <div className="text-sm flex-1" style={{ color: 'var(--black)' }}>{item.email}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
          setModalMode('add');
          setPrefilledData({});
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
              {/* Company Name */}
              <div className="relative">
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>거래처명</label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
                  type="text"
                  placeholder="거래처명 입력"
                  value={tempCompanyName}
                  onChange={(e) => setTempCompanyName(e.target.value)}
                  onFocus={() => setShowMobileCompanySuggestions(true)}
                  onBlur={() => setTimeout(() => setShowMobileCompanySuggestions(false), 200)}
                />
                {showMobileCompanySuggestions && getCompanySuggestions(tempCompanyName).length > 0 && (
                  <div 
                    className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {getCompanySuggestions(tempCompanyName).map((company, index) => (
                      <div
                        key={index}
                        className="px-4 py-2.5 cursor-pointer text-sm transition-colors active:bg-[var(--bg2)]"
                        style={{ color: 'var(--black)' }}
                        onClick={() => {
                          setTempCompanyName(company);
                          setShowMobileCompanySuggestions(false);
                        }}
                      >
                        {company}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="sticky bottom-0 bg-white border-t p-4 flex items-center gap-2" style={{ borderColor: 'var(--border)' }}>
              <button 
                className="h-12 px-6 rounded-lg flex items-center justify-center font-medium text-sm transition-colors"
                style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                onClick={() => {
                  setTempCompanyName("");
                }}
              >
                초기화
              </button>
              <button 
                className="flex-1 h-12 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-colors active:opacity-80"
                style={{ background: 'var(--blue)', color: 'white' }}
                onClick={() => {
                  setCompanyName(tempCompanyName);
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

      <EditGroupModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        item={editingItem}
        mode={modalMode}
        prefilledData={prefilledData}
        allGroupData={groupData}
      />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmDelete}
        title="삭제 확인"
        message="정말로 이 그룹을 삭제하시겠습니까?"
      />

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