import { useState, useEffect } from "react";
import { X } from "lucide-react";

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

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (user: User) => void;
  groupData?: GroupItem[];
}

export function EditUserModal({ isOpen, onClose, user, onSave, groupData = [] }: EditUserModalProps) {
  const [formData, setFormData] = useState<User | null>(null);
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false);
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({ ...user });
    }
  }, [user, isOpen]);

  if (!isOpen || !formData) return null;

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
    return uniqueGroups.filter(group => 
      group.toLowerCase().includes(input.toLowerCase())
    );
  };

  const getDepartmentSuggestions = (input: string) => {
    const availableDepartments = getDepartmentsForGroup(formData.group);
    if (!input) return availableDepartments;
    return availableDepartments.filter(dept => 
      dept.toLowerCase().includes(input.toLowerCase())
    );
  };

  const updateFormData = (updates: Partial<User>) => {
    if (formData) {
      setFormData({ ...formData, ...updates });
    }
  };

  const handleGroupChange = (newGroup: string) => {
    const availableDepartments = getDepartmentsForGroup(newGroup);
    // Reset department if it's not valid for the new group
    if (formData.department && !availableDepartments.includes(formData.department)) {
      updateFormData({ group: newGroup, department: "" });
    } else {
      updateFormData({ group: newGroup });
    }
  };

  const handleRoleChange = (role: User["role"]) => {
    // When role changes to "고객", clear status
    // When role changes from "고객" to other, set status to "재직중"
    // When role is 배차/영업/관리, auto-set group and department
    if (role === "고객") {
      updateFormData({ role, status: "" });
    } else if (role === "배차") {
      updateFormData({ role, status: "재직중", group: "오성", department: "배차팀" });
    } else if (role === "영업") {
      updateFormData({ role, status: "재직중", group: "오성", department: "영업팀" });
    } else if (role === "관리") {
      updateFormData({ role, status: "재직중", group: "오성", department: "관리팀" });
    } else {
      updateFormData({ role });
    }
  };

  const handleSave = () => {
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const isCustomer = formData.role === "고객";

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center" style={{ background: 'rgba(0, 0, 0, 0.45)' }} onClick={onClose}>
      <div className="bg-white rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-7 pb-6 min-w-[360px] max-w-[96vw] w-[480px] max-[768px]:w-[92vw] max-[768px]:min-w-[92vw] animate-[mIn_0.18s_ease]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <span className="text-base font-extrabold" style={{ color: 'var(--black)' }}>
            유저 수정
          </span>
          <button className="w-7 h-7 rounded-md flex items-center justify-center text-lg transition-colors hover:bg-[var(--bg)]" style={{ color: 'var(--gray)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 mt-1">
          {/* Read-only fields */}
          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>담당자명</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--gray)' }}
              type="text"
              value={formData.name}
              readOnly
            />
          </div>

          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>아이디(이메일)</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--gray)' }}
              type="text"
              value={formData.email}
              readOnly
            />
          </div>

          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>연락처</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--gray)' }}
              type="text"
              value={formData.tel}
              readOnly
            />
          </div>

          {/* Editable fields */}
          <div className="relative">
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>거래처</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
              type="text"
              placeholder="거래처 (선택)"
              value={formData.group}
              onChange={(e) => handleGroupChange(e.target.value)}
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
                      handleGroupChange(group);
                      setShowGroupSuggestions(false);
                    }}
                  >
                    {group}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>부서</p>
            <input
              className="h-10 w-full rounded px-3 text-sm outline-none transition-all placeholder:text-[var(--ph)] focus:bg-white"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
              type="text"
              placeholder="부서 (선택)"
              value={formData.department}
              onChange={(e) => updateFormData({ department: e.target.value })}
              onFocus={() => setShowDepartmentSuggestions(true)}
              onBlur={() => setTimeout(() => setShowDepartmentSuggestions(false), 200)}
            />
            {showDepartmentSuggestions && getDepartmentSuggestions(formData.department).length > 0 && (
              <div 
                className="absolute z-20 mt-1 left-0 right-0 bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                style={{ border: '1px solid var(--border)' }}
              >
                {getDepartmentSuggestions(formData.department).map((dept, index) => (
                  <div
                    key={index}
                    className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                    style={{ color: 'var(--black)' }}
                    onClick={() => {
                      updateFormData({ department: dept });
                      setShowDepartmentSuggestions(false);
                    }}
                  >
                    {dept}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>권한 *</p>
            <select
              className="h-10 w-full rounded px-3 text-sm outline-none transition-all cursor-pointer focus:bg-white"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value as User["role"])}
            >
              <option value="">선택</option>
              <option value="고객">고객</option>
              <option value="배차">배차</option>
              <option value="영업">영업</option>
              <option value="관리">관리</option>
            </select>
          </div>

          {!isCustomer && (
            <div>
              <p className="text-xs mb-0.5" style={{ color: 'var(--gray)' }}>상태 *</p>
              <select
                className="h-10 w-full rounded px-3 text-sm outline-none transition-all cursor-pointer focus:bg-white"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--black)' }}
                value={formData.status}
                onChange={(e) => updateFormData({ status: e.target.value as User["status"] })}
              >
                <option value="">선택</option>
                <option value="재직중">재직중</option>
                <option value="퇴사">퇴사</option>
              </select>
            </div>
          )}
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