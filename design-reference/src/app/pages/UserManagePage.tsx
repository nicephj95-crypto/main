import { useState } from "react";
import { X as XIcon, Pencil } from "lucide-react";
import { Footer } from "../components/Footer";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { EditUserModal } from "../components/modals/EditUserModal";
import { ApprovalModal } from "../components/modals/ApprovalModal";
import { HistoryModal } from "../components/modals/HistoryModal";
import { useAuth } from "../contexts/AuthContext";

interface User {
  id: number;
  name: string;
  email: string;
  tel: string;
  group: string;
  department: string;
  role: "고객" | "배차" | "영업" | "관리" | "";
  status: "재직중" | "퇴사" | "";
  approvalStatus: "대기중" | "승인됨" | "거절됨";
  registeredAt: string;
}

interface GroupItem {
  company: string;
  department: string;
  employee: string;
  position: string;
  tel: string;
  email: string;
}

const mockUsers: User[] = [
  // User list with proper roles
  {
    id: 1,
    name: "김효진",
    email: "hyojin@example.com",
    tel: "010-1234-5678",
    group: "",
    department: "",
    role: "",
    status: "",
    approvalStatus: "대기중",
    registeredAt: "2024-03-10 14:30"
  },
  {
    id: 2,
    name: "이현서",
    email: "hyunseo@example.com",
    tel: "010-9876-5432",
    group: "화장품공장A",
    department: "영업팀",
    role: "고객",
    status: "",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-09 10:15"
  },
  {
    id: 3,
    name: "박렌지",
    email: "renji@example.com",
    tel: "010-2222-3333",
    group: "오성",
    department: "배차팀",
    role: "배차",
    status: "재직중",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-08 16:20"
  },
  {
    id: 4,
    name: "최이자",
    email: "ija@example.com",
    tel: "010-4444-5555",
    group: "",
    department: "",
    role: "",
    status: "",
    approvalStatus: "대기중",
    registeredAt: "2024-03-11 09:45"
  },
  {
    id: 5,
    name: "홍길동",
    email: "hong@example.com",
    tel: "010-7777-8888",
    group: "오성",
    department: "영업팀",
    role: "영업",
    status: "퇴사",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-05 11:00"
  },
  {
    id: 6,
    name: "김관리",
    email: "admin@example.com",
    tel: "010-1111-1111",
    group: "오성",
    department: "관리팀",
    role: "관리",
    status: "재직중",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-01 09:00"
  },
  {
    id: 7,
    name: "정영업",
    email: "sales@example.com",
    tel: "010-2222-2222",
    group: "오성",
    department: "영업팀",
    role: "영업",
    status: "재직중",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-02 10:00"
  },
  {
    id: 8,
    name: "최고객",
    email: "customer1@example.com",
    tel: "010-3333-3333",
    group: "마루시공업체B",
    department: "물류팀",
    role: "고객",
    status: "",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-12 11:00"
  },
  {
    id: 9,
    name: "박고객",
    email: "customer2@example.com",
    tel: "010-4444-4444",
    group: "화장품공장A",
    department: "구매팀",
    role: "고객",
    status: "",
    approvalStatus: "승인됨",
    registeredAt: "2024-03-13 12:00"
  },
  {
    id: 10,
    name: "이배차",
    email: "dispatch@example.com",
    tel: "010-5555-5555",
    group: "오성",
    department: "배차팀",
    role: "배차",
    status: "퇴사",
    approvalStatus: "승인됨",
    registeredAt: "2024-02-28 08:00"
  },
];

const mockGroupData: GroupItem[] = [
  { company: "화장품공장A", department: "생산팀", employee: "김생산", position: "팀장", tel: "010-1111-2222", email: "production@company-a.com" },
  { company: "화장품공장A", department: "생산팀", employee: "이생산", position: "사원", tel: "010-1111-3333", email: "production2@company-a.com" },
  { company: "화장품공장A", department: "구매팀", employee: "박구매", position: "과장", tel: "010-1111-4444", email: "purchase@company-a.com" },
  { company: "화장품공장A", department: "구매팀", employee: "최구매", position: "대리", tel: "010-1111-5555", email: "purchase2@company-a.com" },
  { company: "마루시공업체B", department: "영업팀", employee: "정영업", position: "부장", tel: "010-2222-1111", email: "sales@company-b.com" },
  { company: "마루시공업체B", department: "영업팀", employee: "강업", position: "사원", tel: "010-2222-2222", email: "sales2@company-b.com" },
  { company: "마루시공업체B", department: "물류팀", employee: "윤물류", position: "팀장", tel: "010-2222-3333", email: "logistics@company-b.com" },
  { company: "거래처C", department: "관리팀", employee: "송관리", position: "차장", tel: "010-3333-1111", email: "admin@company-c.com" },
];

export function UserManagePage() {
  const { userRole } = useAuth();
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [searchText, setSearchText] = useState("");
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // 변경이력 모달 상태
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTitle, setHistoryModalTitle] = useState('');
  const [historyModalData, setHistoryModalData] = useState<any[]>([]);

  const filteredUsers = users.filter((user) => {
    // Search filter (name or email)
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      const matchesSearch = 
        user.name.toLowerCase().includes(searchLower) || 
        user.email.toLowerCase().includes(searchLower);
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  // Sort users according to specified order
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    // 1. 미승인
    if (a.approvalStatus === "대기중" && b.approvalStatus !== "대기중") return -1;
    if (a.approvalStatus !== "대기중" && b.approvalStatus === "대기중") return 1;

    // 2. 재직중 (관리자 > 영업 > 배차)
    if (a.status === "재직중" && b.status !== "재직중") return -1;
    if (a.status !== "재직중" && b.status === "재직중") return 1;
    
    if (a.status === "재직중" && b.status === "재직중") {
      const roleOrder = { "관리": 1, "영업": 2, "배차": 3 };
      const aOrder = roleOrder[a.role as keyof typeof roleOrder] || 999;
      const bOrder = roleOrder[b.role as keyof typeof roleOrder] || 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
    }

    // 3. 고객 (업체명 > 부서명 > 가입일 최신순)
    if (a.role === "고객" && b.role !== "고객") return -1;
    if (a.role !== "고객" && b.role === "고객") return 1;
    
    if (a.role === "고객" && b.role === "고객") {
      // Compare company
      if (a.group !== b.group) {
        return a.group.localeCompare(b.group, ['ko', 'en']);
      }
      // Compare department
      if (a.department !== b.department) {
        return a.department.localeCompare(b.department, ['ko', 'en']);
      }
      // Compare registration date (newest first)
      return b.registeredAt.localeCompare(a.registeredAt);
    }

    // 4. 퇴사 (관리자 > 영업 > 배차)
    if (a.status === "퇴사" && b.status !== "퇴사") return -1;
    if (a.status !== "퇴사" && b.status === "퇴사") return 1;
    
    if (a.status === "퇴사" && b.status === "퇴사") {
      const roleOrder = { "관리": 1, "영업": 2, "배차": 3 };
      const aOrder = roleOrder[a.role as keyof typeof roleOrder] || 999;
      const bOrder = roleOrder[b.role as keyof typeof roleOrder] || 999;
      if (aOrder !== bOrder) return aOrder - bOrder;
    }

    return 0;
  });

  const pendingCount = users.filter(u => u.approvalStatus === "대기중").length;

  const handleApproveClick = (userId: number) => {
    setSelectedUserId(userId);
    setApprovalModalOpen(true);
  };

  const handleApprove = (userId: number, role: "고객" | "배차" | "영업" | "관리", group: string, department: string) => {
    setUsers(users.map(user => 
      user.id === userId 
        ? { 
            ...user, 
            approvalStatus: "승인됨" as const, 
            role,
            group,
            department,
            status: role !== "고객" ? "재직중" as const : "" as const
          } 
        : user
    ));
  };

  const handleReject = (userId: number) => {
    setSelectedUserId(userId);
    setConfirmModalOpen(true);
  };

  const confirmReject = () => {
    if (selectedUserId !== null) {
      setUsers(users.map(user => 
        user.id === selectedUserId 
          ? { ...user, approvalStatus: "거절됨" as const } 
          : user
      ));
    }
    setConfirmModalOpen(false);
    setSelectedUserId(null);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setEditModalOpen(true);
  };

  const handleSaveUser = (updatedUser: User) => {
    setUsers(users.map(user => 
      user.id === updatedUser.id ? updatedUser : user
    ));
  };

  const handleHistoryClick = (userId: number) => {
    setHistoryUserId(userId);
    setHistoryModalOpen(true);
  };

  return (
    <>
      <div className="max-w-[1180px] mx-auto px-1 pt-10 pb-20 max-[1280px]:px-2 max-[768px]:px-4 max-[768px]:pt-5 max-[768px]:pb-12">
        {/* Filters */}
        <div className="flex items-center gap-2.5 mb-5 flex-wrap">
          <input
            className="h-10 rounded-3xl px-4 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)] w-[200px] max-[768px]:flex-1"
            style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
            type="text"
            placeholder="유저,메일 검색"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        <div className="overflow-x-auto max-[768px]:hidden">
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '10%' }}>그룹명</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '8%' }}>부서명</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '8%' }}>유저이름</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '13%' }}>메일주소</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '10%' }}>연락처</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '10%' }}>가입일</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '7%' }}>권한</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '7%' }}>상태</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '8%' }}>승인상태</th>
                <th className="h-10 text-sm font-bold text-center px-1.5 whitespace-nowrap text-white" style={{ background: 'var(--dark)', width: '19%' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => (
                <tr key={user.id}>
                  <td className="bg-white text-[13px] text-center p-2" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.group || "-"}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.department || "-"}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.name}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2 break-all" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.email}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.tel}</p>
                  </td>
                  <td className="bg-white text-[13px] text-center p-2" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.registeredAt}</p>
                  </td>
                  <td className="bg-white text-center p-2" style={{ borderBottom: '1px solid var(--border3)' }}>
                    {user.role ? (
                      <span 
                        className="inline-block px-2.5 py-1 rounded-full text-[12px] font-bold"
                        style={{
                          background: user.role === "고객" ? "#E3F2FD" : user.role === "관리" ? "#424242" : "#FFF3E0",
                          color: user.role === "고객" ? "#1976D2" : user.role === "관리" ? "#FFFFFF" : "#E65100"
                        }}
                      >
                        {user.role}
                      </span>
                    ) : (
                      <p className="leading-snug m-0 text-[13px]" style={{ color: 'var(--black)' }}>-</p>
                    )}
                  </td>
                  <td className="bg-white text-center p-2" style={{ borderBottom: '1px solid var(--border3)' }}>
                    {user.status ? (
                      <span 
                        className="inline-block px-2.5 py-1 rounded-full text-[12px] font-bold"
                        style={{
                          background: user.status === "재직중" ? "#E8F5E9" : "#F5F5F5",
                          color: user.status === "재직중" ? "#2E7D32" : "#9E9E9E"
                        }}
                      >
                        {user.status}
                      </span>
                    ) : (
                      <p className="leading-snug m-0 text-[13px]" style={{ color: 'var(--black)' }}>-</p>
                    )}
                  </td>
                  <td className="bg-white text-[13px] text-center p-2" style={{ borderBottom: '1px solid var(--border3)', color: 'var(--black)' }}>
                    <p className="leading-snug m-0">{user.approvalStatus}</p>
                  </td>
                  <td className="bg-white text-center p-2" style={{ borderBottom: '1px solid var(--border3)' }}>
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {/* 배차/영업 권한은 버튼 없이 공란 */}
                      {(userRole === '배차' || userRole === '영업') ? (
                        <span className="text-[13px]" style={{ color: 'var(--gray)' }}>-</span>
                      ) : (
                        <>
                          {user.approvalStatus === "대기중" && (
                            <>
                              <button
                                className="h-8 px-3 rounded text-[12px] font-bold transition-colors"
                                style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                                onClick={() => handleApproveClick(user.id)}
                              >
                                승인
                              </button>
                              <button
                                className="h-8 px-3 rounded text-[12px] font-bold transition-colors"
                                style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                                onClick={() => handleReject(user.id)}
                              >
                                거절
                              </button>
                            </>
                          )}
                          {user.approvalStatus === "승인됨" && (
                            <>
                              <button
                                className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[var(--bg2)]"
                                style={{ border: '1px solid var(--border3)' }}
                                onClick={() => handleEdit(user)}
                                title="수정"
                              >
                                <Pencil size={14} style={{ stroke: 'var(--gray)' }} />
                              </button>
                              {/* H(History) 버튼 - 관리 권한만 표시 */}
                              {userRole === '관리' && (
                                <button
                                  className="w-8 h-8 rounded flex items-center justify-center bg-white flex-shrink-0 transition-colors hover:bg-[var(--bg2)] text-sm font-bold"
                                  style={{ border: '1px solid var(--border3)', color: 'var(--gray)' }}
                                  onClick={() => {
                                    // Mock 변경이력 데이터
                                    const mockHistories = [
                                      {
                                        user: '김관리',
                                        timestamp: '2025.12.05 14:20:10',
                                        action: '권한 변경',
                                        field: '권한',
                                        oldValue: '배차',
                                        newValue: user.role
                                      },
                                      {
                                        user: '이배차',
                                        timestamp: '2025.12.01 10:00:00',
                                        action: '가입 승인',
                                        field: '',
                                        oldValue: '',
                                        newValue: ''
                                      }
                                    ];
                                    setHistoryModalTitle(`유저 - ${user.name}`);
                                    setHistoryModalData(mockHistories);
                                    setHistoryModalOpen(true);
                                  }}
                                  title="변경이력 확인"
                                >
                                  H
                                </button>
                              )}
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="hidden max-[768px]:block">
          <div className="space-y-3">
            {sortedUsers.map((user) => (
              <div 
                key={user.id}
                className="bg-white rounded-lg p-3.5 shadow-sm"
                style={{ border: '1px solid var(--border3)' }}
              >
                <div className="flex items-start justify-between mb-2.5">
                  <div>
                    <div className="text-base font-bold mb-1" style={{ color: 'var(--black)' }}>{user.name}</div>
                    <div className="text-xs" style={{ color: 'var(--gray)' }}>{user.registeredAt}</div>
                  </div>
                  <div className="text-xs flex-shrink-0" style={{ color: 'var(--black)' }}>{user.approvalStatus}</div>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-start gap-2">
                    <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '64px' }}>이메일</div>
                    <div className="text-sm break-all" style={{ color: 'var(--black)' }}>{user.email}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '64px' }}>연락처</div>
                    <div className="text-sm" style={{ color: 'var(--black)' }}>{user.tel}</div>
                  </div>
                  {user.group && (
                    <div className="flex items-start gap-2">
                      <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '64px' }}>거래처</div>
                      <div className="text-sm" style={{ color: 'var(--black)' }}>{user.group}</div>
                    </div>
                  )}
                  {user.department && (
                    <div className="flex items-start gap-2">
                      <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '64px' }}>부서</div>
                      <div className="text-sm" style={{ color: 'var(--black)' }}>{user.department}</div>
                    </div>
                  )}
                  {user.role && (
                    <div className="flex items-start gap-2">
                      <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '64px' }}>권한</div>
                      <span 
                        className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          background: user.role === "고객" ? "#E3F2FD" : user.role === "관리" ? "#424242" : "#FFF3E0",
                          color: user.role === "고객" ? "#1976D2" : user.role === "관리" ? "#FFFFFF" : "#E65100"
                        }}
                      >
                        {user.role}
                      </span>
                    </div>
                  )}
                  {user.status && (
                    <div className="flex items-start gap-2">
                      <div className="text-xs font-bold whitespace-nowrap flex-shrink-0" style={{ color: 'var(--gray)', width: '64px' }}>상태</div>
                      <span 
                        className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold"
                        style={{
                          background: user.status === "재직중" ? "#E8F5E9" : "#F5F5F5",
                          color: user.status === "재직중" ? "#2E7D32" : "#9E9E9E"
                        }}
                      >
                        {user.status}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2.5" style={{ borderTop: '1px solid var(--border3)' }}>
                  {/* 배차/영업 권한은 버튼 없음 */}
                  {(userRole === '배차' || userRole === '영업') ? null : (
                    <>
                      {user.approvalStatus === "대기중" && (
                        <>
                          <button
                            className="flex-1 h-9 rounded text-sm font-bold transition-colors"
                            style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                            onClick={() => handleApproveClick(user.id)}
                          >
                            승인
                          </button>
                          <button
                            className="flex-1 h-9 rounded text-sm font-bold transition-colors"
                            style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                            onClick={() => handleReject(user.id)}
                          >
                            거절
                          </button>
                        </>
                      )}
                      {user.approvalStatus === "승인됨" && (
                        <button
                          className="flex-1 h-9 rounded text-sm font-bold transition-colors"
                          style={{ background: 'var(--bg2)', color: 'var(--black)' }}
                          onClick={() => handleEdit(user)}
                        >
                          수정
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-20 text-sm" style={{ color: 'var(--gray)' }}>
            검색 결과가 없습니다.
          </div>
        )}
      </div>

      <Footer />

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedUserId(null);
        }}
        onConfirm={confirmReject}
        message="정말 거절하시겠습니까?"
      />

      <ApprovalModal
        isOpen={approvalModalOpen}
        onClose={() => {
          setApprovalModalOpen(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId || 0}
        onApprove={handleApprove}
        groupData={mockGroupData}
        users={users}
      />

      <EditUserModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        user={editingUser}
        onSave={handleSaveUser}
        groupData={mockGroupData}
      />

      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={historyModalTitle}
        histories={historyModalData}
      />
    </>
  );
}