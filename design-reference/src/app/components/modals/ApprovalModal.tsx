import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { ConfirmModal } from "./ConfirmModal";

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

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onApprove: (userId: number, role: "고객" | "배차" | "영업" | "관리", group: string, department: string) => void;
  groupData: GroupItem[];
  users: User[];
}

export function ApprovalModal({ isOpen, onClose, userId, onApprove, groupData, users }: ApprovalModalProps) {
  const [role, setRole] = useState<"고객" | "배차" | "영업" | "관리" | "">("");
  const [group, setGroup] = useState("");
  const [department, setDepartment] = useState("");
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errors, setErrors] = useState({ role: false, group: false, department: false });

  useEffect(() => {
    if (isOpen) {
      setRole("");
      setGroup("");
      setDepartment("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentUser = users.find(u => u.id === userId);
  const userName = currentUser?.name || "";

  // Get unique groups (companies)
  const uniqueGroups = Array.from(new Set(groupData.map(item => item.company).filter(c => c)));

  // Get departments for selected group
  const getDepartmentsForGroup = (selectedGroup: string) => {
    if (!selectedGroup) return [];
    return Array.from(new Set(
      groupData
        .filter(item => item.company === selectedGroup)
        .map(item => item.department)
        .filter(d => d)
    ));
  };

  // Filter suggestions
  const getGroupSuggestions = (input: string) => {
    if (!input) return uniqueGroups;
    return uniqueGroups.filter(g => 
      g.toLowerCase().includes(input.toLowerCase())
    );
  };

  const getDepartmentSuggestions = (input: string) => {
    const availableDepartments = getDepartmentsForGroup(group);
    if (!input) return availableDepartments;
    return availableDepartments.filter(d => 
      d.toLowerCase().includes(input.toLowerCase())
    );
  };

  // When group changes, reset department if it's not valid for the new group
  const handleGroupChange = (newGroup: string) => {
    setGroup(newGroup);
    const availableDepartments = getDepartmentsForGroup(newGroup);
    if (department && !availableDepartments.includes(department)) {
      setDepartment("");
    }
  };

  const handleApproveClick = () => {
    const newErrors = {
      role: !role,
      group: role === "고객" && !group,
      department: role === "고객" && !department,
    };
    setErrors(newErrors);

    const hasError = Object.values(newErrors).some(error => error);
    if (hasError) {
      return;
    }

    // 권한에 따라 자동으로 group과 department 설정
    let finalGroup = group;
    let finalDepartment = department;

    if (role === "배차") {
      finalGroup = "오성";
      finalDepartment = "배차팀";
    } else if (role === "영업") {
      finalGroup = "오성";
      finalDepartment = "영업팀";
    } else if (role === "관리") {
      finalGroup = "오성";
      finalDepartment = "관리팀";
    }

    // 고객인 경우
    if (role === "고객") {
      onApprove(userId, role, group, department);
      toast.success("승인이 완료되었습니다.");
      onClose();
    } else {
      // 배차, 영업, 관리인 경우 확인
      setConfirmModalOpen(true);
    }
  };

  const handleConfirmApprove = () => {
    // 권한에 따라 자동으로 group과 department 설정
    let finalGroup = "오성";
    let finalDepartment = "";
    
    if (role === "배차") {
      finalDepartment = "배차팀";
    } else if (role === "영업") {
      finalDepartment = "영업팀";
    } else if (role === "관리") {
      finalDepartment = "관리팀";
    }
    
    onApprove(userId, role as "배차" | "영업" | "관리", finalGroup, finalDepartment);
    toast.success("승인이 완료되었습니다.");
    setConfirmModalOpen(false);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
        <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[440px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>
              승인{userName && ` - ${userName}`}
            </span>
            <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
              <X size={18} />
            </button>
          </div>

          <div className="flex flex-col gap-2.5 mt-1">
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>권한 *</p>
              <select
                className="h-10 w-full rounded px-3 text-sm outline-none transition-all cursor-pointer focus:bg-white"
                style={{
                  background: errors.role ? "#FEE" : (role === "고객" ? "#E3F2FD" : "var(--bg)"),
                  border: errors.role ? '1px solid #FBB' : '1px solid var(--border)',
                  color: 'var(--black)'
                }}
                value={role}
                onChange={(e) => {
                  setRole(e.target.value as "고객" | "배차" | "영업" | "관리" | "");
                  if (errors.role) setErrors({ ...errors, role: false });
                }}
              >
                <option value="">선택</option>
                <option value="고객">고객</option>
                <option value="배차">배차</option>
                <option value="영업">영업</option>
                <option value="관리">관리</option>
              </select>
            </div>

            {role === "고객" && (
              <>
                <div className="relative">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>거래처 *</p>
                  <input
                    className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
                    style={{
                      background: errors.group ? '#FEE' : 'var(--bg)',
                      border: errors.group ? '1px solid #FBB' : '1px solid var(--border)',
                      color: 'var(--black)'
                    }}
                    type="text"
                    placeholder="거래처"
                    value={group}
                    onChange={(e) => {
                      handleGroupChange(e.target.value);
                      if (errors.group) setErrors({ ...errors, group: false });
                    }}
                    onFocus={() => setShowGroupSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 200)}
                  />
                  {showGroupSuggestions && getGroupSuggestions(group).length > 0 && (
                    <div 
                      className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                      style={{ border: '1px solid var(--border)' }}
                    >
                      {getGroupSuggestions(group).map((g, index) => (
                        <div
                          key={index}
                          className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                          style={{ color: 'var(--black)' }}
                          onClick={() => {
                            handleGroupChange(g);
                            setShowGroupSuggestions(false);
                          }}
                        >
                          {g}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="relative">
                  <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>부서 *</p>
                  <input
                    className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
                    style={{
                      background: errors.department ? '#FEE' : 'var(--bg)',
                      border: errors.department ? '1px solid #FBB' : '1px solid var(--border)',
                      color: 'var(--black)'
                    }}
                    type="text"
                    placeholder="부서"
                    value={department}
                    onChange={(e) => {
                      setDepartment(e.target.value);
                      if (errors.department) setErrors({ ...errors, department: false });
                    }}
                    onFocus={() => setShowDepartmentSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowDepartmentSuggestions(false), 200)}
                  />
                  {showDepartmentSuggestions && getDepartmentSuggestions(department).length > 0 && (
                    <div 
                      className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                      style={{ border: '1px solid var(--border)' }}
                    >
                      {getDepartmentSuggestions(department).map((d, index) => (
                        <div
                          key={index}
                          className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                          style={{ color: 'var(--black)' }}
                          onClick={() => {
                            setDepartment(d);
                            setShowDepartmentSuggestions(false);
                          }}
                        >
                          {d}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2 justify-end mt-5">
            <button className="h-10 px-5 rounded text-sm transition-colors" style={{ background: 'var(--bg)', color: 'var(--gray)' }} onClick={onClose}>
              취소
            </button>
            <button className="h-10 px-5 rounded text-sm text-white transition-colors" style={{ background: 'var(--blue)' }} onClick={handleApproveClick}>
              승인
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

      <ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleConfirmApprove}
        message={`${role} 권한으로 승인하시겠습니까?`}
      />
    </>
  );
}