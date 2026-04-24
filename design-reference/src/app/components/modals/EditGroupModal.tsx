import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface GroupItem {
  company: string;
  department: string;
  employee: string;
  position: string;
  tel: string;
  email: string;
}

interface EditGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: GroupItem | null;
  mode?: 'add' | 'edit' | 'addDepartment' | 'addEmployee';
  prefilledData?: Partial<GroupItem>;
  allGroupData?: GroupItem[]; // For autocomplete
}

export function EditGroupModal({ isOpen, onClose, item, mode = 'add', prefilledData, allGroupData = [] }: EditGroupModalProps) {
  const [formData, setFormData] = useState<GroupItem>({
    company: "",
    department: "",
    employee: "",
    position: "",
    tel: "",
    email: "",
  });
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);
  const [departmentError, setDepartmentError] = useState('');
  const [errors, setErrors] = useState({
    company: false,
    department: false,
    employee: false,
    tel: false,
  });

  // Get unique department names from the same company
  const getDepartmentSuggestions = (input: string) => {
    if (!input || !formData.company) return [];
    const departmentsInCompany = allGroupData
      .filter(item => item.company === formData.company && item.department)
      .map(item => item.department);
    const uniqueDepartments = Array.from(new Set(departmentsInCompany));
    return uniqueDepartments.filter(dept => 
      dept.toLowerCase().includes(input.toLowerCase())
    );
  };

  useEffect(() => {
    if (item) {
      setFormData(item);
    } else if (prefilledData) {
      setFormData({ ...formData, ...prefilledData });
    } else {
      setFormData({
        company: "",
        department: "",
        employee: "",
        position: "",
        tel: "",
        email: "",
      });
    }
  }, [item, isOpen, prefilledData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 필수 입력 검증
    const newErrors = {
      company: !formData.company.trim(),
      department: mode !== 'add' && !formData.department.trim(),
      employee: mode !== 'add' && !formData.employee.trim(),
      tel: mode !== 'add' && !formData.tel.trim(),
    };
    setErrors(newErrors);

    const hasError = Object.values(newErrors).some(error => error);
    if (hasError) {
      return;
    }

    // 담당자 추가 모드일 때 부서명 검증
    if (mode === 'addEmployee' && formData.department) {
      const departmentExists = allGroupData.some(
        item => item.company === formData.company && item.department === formData.department
      );

      if (!departmentExists) {
        setDepartmentError('존재하지 않는 부서명입니다. 부서명을 확인해 주세요.');
        toast.error("존재하지 않는 부서명입니다.");
        return;
      }
    }

    setDepartmentError('');
    console.log("Form submitted:", formData);
    toast.success(mode === 'edit' ? "그룹이 수정되었습니다." : "그룹이 추가되었습니다.");
    onClose();
  };

  const handleChange = (field: keyof GroupItem, value: string) => {
    setFormData({ ...formData, [field]: value });
    if (field === 'department') {
      setDepartmentError('');
    }
  };

  const handleDepartmentChange = (value: string) => {
    setFormData({ ...formData, department: value });
    setShowDepartmentSuggestions(false);
    setDepartmentError('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-lg font-bold" style={{ color: 'var(--black)' }}>
            {mode === 'edit' ? "그룹 수정" : "그룹 추가"}
          </h3>
          <button 
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            onClick={onClose}
          >
            <X size={20} style={{ stroke: 'var(--gray)' }} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>
                거래처명 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                style={{
                  background: errors.company ? '#FEE' : 'var(--bg2)',
                  border: errors.company ? '1px solid #FBB' : 'none',
                  color: 'var(--black)'
                }}
                type="text"
                placeholder="거래처명을 입력하세요"
                value={formData.company}
                onChange={(e) => {
                  handleChange("company", e.target.value);
                  if (errors.company) setErrors({ ...errors, company: false });
                }}
              />
            </div>

            {/* Department Name */}
            {mode !== 'add' && (
              <div className="relative">
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>
                  부서명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{
                    background: errors.department ? '#FEE' : 'var(--bg2)',
                    border: errors.department ? '1px solid #FBB' : 'none',
                    color: 'var(--black)'
                  }}
                  type="text"
                  placeholder="부서명을 입력하세요"
                  value={formData.department}
                  onChange={(e) => {
                    handleChange("department", e.target.value);
                    if (errors.department) setErrors({ ...errors, department: false });
                  }}
                  onFocus={() => {
                    if (mode === 'addEmployee') {
                      setShowDepartmentSuggestions(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowDepartmentSuggestions(false), 200)}
                  />
                {departmentError && (
                  <p className="mt-1.5 text-xs" style={{ color: '#ef4444' }}>
                    {departmentError}
                  </p>
                )}
                {showDepartmentSuggestions && mode === 'addEmployee' && getDepartmentSuggestions(formData.department).length > 0 && (
                  <div 
                    className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg max-h-40 overflow-y-auto"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    {getDepartmentSuggestions(formData.department).map((dept, index) => (
                      <div
                        key={index}
                        className="px-4 py-2.5 cursor-pointer text-sm transition-colors hover:bg-[var(--bg2)]"
                        style={{ color: 'var(--black)' }}
                        onClick={() => handleDepartmentChange(dept)}
                      >
                        {dept}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Employee Name */}
            {mode !== 'add' && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>
                  담당자명 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{
                    background: errors.employee ? '#FEE' : 'var(--bg2)',
                    border: errors.employee ? '1px solid #FBB' : 'none',
                    color: 'var(--black)'
                  }}
                  type="text"
                  placeholder="담당자명을 입력하세요"
                  value={formData.employee}
                  onChange={(e) => {
                    handleChange("employee", e.target.value);
                    if (errors.employee) setErrors({ ...errors, employee: false });
                  }}
                  />
              </div>
            )}

            {/* Position */}
            {mode !== 'add' && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>
                  직급
                </label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
                  type="text"
                  placeholder="직급을 입력하세요"
                  value={formData.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                />
              </div>
            )}

            {/* Phone */}
            {mode !== 'add' && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>
                  연락처 <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{
                    background: errors.tel ? '#FEE' : 'var(--bg2)',
                    border: errors.tel ? '1px solid #FBB' : 'none',
                    color: 'var(--black)'
                  }}
                  type="tel"
                  placeholder="연락처를 입력하세요"
                  value={formData.tel}
                  onChange={(e) => {
                    handleChange("tel", e.target.value);
                    if (errors.tel) setErrors({ ...errors, tel: false });
                  }}
                  />
              </div>
            )}

            {/* Email */}
            {mode !== 'add' && (
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: 'var(--black)' }}>
                  이메일
                </label>
                <input
                  className="w-full h-11 rounded-lg px-3.5 text-sm outline-none transition-shadow focus:shadow-[0_0_0_2px_var(--blue)]"
                  style={{ background: 'var(--bg2)', color: 'var(--black)', border: 'none' }}
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
            <button 
              type="button"
              className="h-10 px-6 rounded text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ background: 'var(--bg2)', color: 'var(--black)' }}
              onClick={onClose}
            >
              취소
            </button>
            <button 
              type="submit"
              className="h-10 px-6 rounded text-sm font-medium text-white transition-colors hover:bg-[#78B6FF]"
              style={{ background: 'var(--blue)' }}
            >
              {mode === 'edit' ? "수정" : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}