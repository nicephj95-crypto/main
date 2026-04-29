// src/AdminUsersPage.tsx  — 유저관리
import { useEffect, useRef, useState } from "react";
import {
  listUsers,
  listSignupRequests,
  reviewSignupRequest,
  listCompanyNames,
  updateUserDetails,
  listGroups,
} from "./api/client";
import type {
  CompanyName,
  GroupManagementGroup,
  ReviewSignupRequestBody,
  SignupRequest,
  SignupRequestStatus,
  User,
  UserRole,
} from "./api/types";
import { Pencil } from "lucide-react";
import { HistoryModal } from "./components/HistoryModal";
import type { AuthUser } from "./LoginPanel";
import { formatPhoneNumber } from "./utils/phoneFormat";

// ── helpers ──────────────────────────────────────────────
function roleLabel(role: UserRole | ""): string {
  switch (role) {
    case "ADMIN": return "관리";
    case "DISPATCHER": return "배차";
    case "SALES": return "영업";
    case "CLIENT": return "고객";
    default: return "-";
  }
}

function roleBadgeClass(role: UserRole | ""): string {
  switch (role) {
    case "ADMIN": return "um-badge um-badge-admin";
    case "DISPATCHER": return "um-badge um-badge-dispatcher";
    case "SALES": return "um-badge um-badge-sales";
    case "CLIENT": return "um-badge um-badge-client";
    default: return "";
  }
}

function statusLabel(isActive?: boolean): string {
  if (isActive === undefined) return "-";
  return isActive ? "재직중" : "퇴사";
}

function statusBadgeClass(isActive?: boolean): string {
  if (isActive === undefined) return "";
  return isActive ? "um-badge um-badge-active" : "um-badge um-badge-resigned";
}

function approvalLabel(status: SignupRequestStatus): string {
  switch (status) {
    case "PENDING": return "대기중";
    case "APPROVED": return "승인됨";
    case "REJECTED": return "거절됨";
  }
}

function approvalBadgeClass(status: SignupRequestStatus): string {
  switch (status) {
    case "PENDING": return "um-badge um-badge-pending";
    case "APPROVED": return "um-badge um-badge-approved";
    case "REJECTED": return "um-badge um-badge-rejected";
  }
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return {
    date: `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

// 직원 권한 자동 설정값 (프론트/서버 동일하게 유지)
const STAFF_ROLE_CONFIG = {
  SALES:      { company: "우리회사", department: "영업" },
  DISPATCHER: { company: "우리회사", department: "배차" },
  ADMIN:      { company: "우리회사", department: "관리" },
} as const;

type StaffRole = keyof typeof STAFF_ROLE_CONFIG;

function isStaffRole(role: UserRole | ""): role is StaffRole {
  return role === "SALES" || role === "DISPATCHER" || role === "ADMIN";
}

// ── 권한 선택 확인 모달 ────────────────────────────────────
function RoleConfirmModal({
  role,
  step,
  onConfirm,
  onCancel,
}: {
  role: UserRole;
  step: 1 | 2;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isAdmin2 = step === 2;
  const title = isAdmin2 ? "관리자 권한 부여" : `${roleLabel(role)} 권한 부여`;
  const msg = isAdmin2
    ? "관리자는 시스템 전체를 관리할 수 있습니다.\n정말 부여하시겠습니까?"
    : "해당 사용자가 직원임을 확인하셨나요?";

  return (
    <div
      className="rdm-confirm-backdrop"
      style={{ zIndex: 1800 }}
      onClick={onCancel}
    >
      <div className="rdm-confirm-panel" onClick={(e) => e.stopPropagation()}>
        <div className={`rdm-confirm-icon ${isAdmin2 ? "rdm-confirm-icon--danger" : "rdm-confirm-icon--info"}`}>
          {isAdmin2 ? "⚠️" : "👤"}
        </div>
        <p className="rdm-confirm-title">{title}</p>
        <p className="rdm-confirm-msg">{msg}</p>
        <div className="rdm-confirm-btns">
          <button
            type="button"
            className="rdm-confirm-btn rdm-confirm-btn-ok"
            onClick={onConfirm}
          >
            확인
          </button>
          <button
            type="button"
            className="rdm-confirm-btn rdm-confirm-btn-cancel"
            onClick={onCancel}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Approval modal ────────────────────────────────────────
function ApprovalModal({
  request,
  companyNames,
  groups,
  onClose,
  onApprove,
}: {
  request: SignupRequest;
  companyNames: CompanyName[];
  groups: GroupManagementGroup[];
  onClose: () => void;
  onApprove: (requestId: number, payload: ReviewSignupRequestBody) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole | "">("");
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 권한 확인 모달 상태
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);

  const isClient = role === "CLIENT";

  // 선택된 회사의 부서 목록
  const selectedGroupDepts = groups.find((g) => g.name === company)?.departments ?? [];

  const handleRoleSelect = (newRole: UserRole | "") => {
    if (!newRole) {
      setRole("");
      setCompany("");
      setDepartment("");
      return;
    }
    if (newRole === "CLIENT") {
      setRole("CLIENT");
      setCompany("");
      setDepartment("");
      return;
    }
    // 직원 권한: 확인 모달 트리거
    setPendingRole(newRole as UserRole);
    setConfirmStep(1);
  };

  const handleRoleConfirmed = () => {
    if (!pendingRole) return;
    if (pendingRole === "ADMIN" && confirmStep === 1) {
      setConfirmStep(2);
      return;
    }
    setRole(pendingRole);
    setCompany(STAFF_ROLE_CONFIG[pendingRole as StaffRole].company);
    setDepartment(STAFF_ROLE_CONFIG[pendingRole as StaffRole].department);
    setPendingRole(null);
  };

  const handleRoleCancelled = () => {
    setPendingRole(null);
  };

  const handleApprove = async () => {
    if (!role) { setError("권한을 선택해주세요."); return; }
    if (isClient && !company) { setError("고객 권한은 거래처 선택이 필요합니다."); return; }
    setSaving(true);
    setError(null);
    try {
      await onApprove(request.id, {
        action: "APPROVE",
        role: role as UserRole,
        companyName: company || null,
        department: department || null,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "승인 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="um-modal-backdrop" onClick={onClose}>
        <div className="um-modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="um-modal-header">
            <span className="um-modal-title">승인 — {request.name}</span>
          </div>
          <div className="um-modal-form">
            <div className="um-field">
              <label className="um-field-label">이름</label>
              <input className="um-field-input" value={request.name} readOnly disabled />
            </div>
            <div className="um-field">
              <label className="um-field-label">이메일</label>
              <input className="um-field-input" value={request.email} readOnly disabled />
            </div>
            <div className="um-field">
              <label className="um-field-label">권한 *</label>
              <select
                className="um-field-input"
                value={role}
                onChange={(e) => { handleRoleSelect(e.target.value as UserRole | ""); setError(null); }}
                disabled={saving}
              >
                <option value="">선택</option>
                <option value="CLIENT">고객</option>
                <option value="DISPATCHER">배차</option>
                <option value="SALES">영업</option>
                <option value="ADMIN">관리</option>
              </select>
            </div>

            {/* 직원 권한: 회사/부서 자동 설정, 읽기 전용 */}
            {isStaffRole(role) && (
              <>
                <div className="um-field">
                  <label className="um-field-label">거래처</label>
                  <input className="um-field-input" value={company} readOnly disabled />
                </div>
                <div className="um-field">
                  <label className="um-field-label">부서</label>
                  <input className="um-field-input" value={department} readOnly disabled />
                </div>
              </>
            )}

            {/* 고객 권한: 회사 필수 선택, 부서는 해당 회사 소속만 */}
            {isClient && (
              <>
                <div className="um-field">
                  <label className="um-field-label">거래처 *</label>
                  <select
                    className="um-field-input"
                    value={company}
                    onChange={(e) => { setCompany(e.target.value); setDepartment(""); setError(null); }}
                    disabled={saving}
                  >
                    <option value="">거래처 선택</option>
                    {companyNames.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="um-field">
                  <label className="um-field-label">부서</label>
                  <select
                    className="um-field-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={saving || !company}
                  >
                    <option value="">부서 선택 (선택)</option>
                    {selectedGroupDepts.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && <p className="um-field-error">{error}</p>}
          </div>
          <div className="um-modal-footer">
            <button type="button" className="um-btn-save" onClick={handleApprove} disabled={saving || !role}>
              {saving ? "처리 중..." : "승인"}
            </button>
            <button type="button" className="um-btn-cancel" onClick={onClose} disabled={saving}>취소</button>
          </div>
        </div>
      </div>

      {pendingRole && (
        <RoleConfirmModal
          role={pendingRole}
          step={confirmStep}
          onConfirm={handleRoleConfirmed}
          onCancel={handleRoleCancelled}
        />
      )}
    </>
  );
}

// ── Edit user modal ───────────────────────────────────────
function EditUserModal({
  user,
  companyNames,
  groups,
  onClose,
  onSave,
}: {
  user: User;
  companyNames: CompanyName[];
  groups: GroupManagementGroup[];
  onClose: () => void;
  onSave: (userId: number, data: { role: UserRole; companyName: string | null; department: string | null; phone: string | null; isActive: boolean }) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [company, setCompany] = useState(user.companyName ?? "");
  const [department, setDepartment] = useState(user.department ?? "");
  const [phone, setPhone] = useState(formatPhoneNumber(user.phone ?? ""));
  const [isActive, setIsActive] = useState(user.isActive !== false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 권한 확인 모달 상태
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [confirmStep, setConfirmStep] = useState<1 | 2>(1);

  const isClient = role === "CLIENT";

  // 선택된 회사의 부서 목록
  const selectedGroupDepts = groups.find((g) => g.name === company)?.departments ?? [];

  const handleRoleSelect = (newRole: UserRole) => {
    if (newRole === "CLIENT") {
      setRole("CLIENT");
      setCompany("");
      setDepartment("");
      return;
    }
    // 직원 권한으로 변경 시 확인 모달
    if (newRole !== user.role) {
      setPendingRole(newRole);
      setConfirmStep(1);
    } else {
      setRole(newRole);
    }
  };

  const handleRoleConfirmed = () => {
    if (!pendingRole) return;
    if (pendingRole === "ADMIN" && confirmStep === 1) {
      setConfirmStep(2);
      return;
    }
    setRole(pendingRole);
    setCompany(STAFF_ROLE_CONFIG[pendingRole as StaffRole].company);
    setDepartment(STAFF_ROLE_CONFIG[pendingRole as StaffRole].department);
    setPendingRole(null);
  };

  const handleRoleCancelled = () => {
    setPendingRole(null);
  };

  const handleSave = async () => {
    if (isClient && !company) { setError("고객 권한은 거래처 선택이 필요합니다."); return; }
    setSaving(true);
    setError(null);
    try {
      await onSave(user.id, {
        role,
        companyName: company || null,
        department: department || null,
        phone: phone || null,
        isActive,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="um-modal-backdrop" onClick={onClose}>
        <div className="um-modal-box" onClick={(e) => e.stopPropagation()}>
          <div className="um-modal-header">
            <span className="um-modal-title">유저 수정</span>
          </div>
          <div className="um-modal-form">
            <div className="um-field">
              <label className="um-field-label">이름</label>
              <input className="um-field-input" value={user.name} readOnly disabled />
            </div>
            <div className="um-field">
              <label className="um-field-label">이메일</label>
              <input className="um-field-input" value={user.email} readOnly disabled />
            </div>
            <div className="um-field">
              <label className="um-field-label">연락처</label>
              <input
                className="um-field-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                placeholder="010-0000-0000"
                disabled={saving}
              />
            </div>
            <div className="um-field">
              <label className="um-field-label">권한 *</label>
              <select
                className="um-field-input"
                value={role}
                onChange={(e) => handleRoleSelect(e.target.value as UserRole)}
                disabled={saving}
              >
                <option value="CLIENT">고객</option>
                <option value="DISPATCHER">배차</option>
                <option value="SALES">영업</option>
                <option value="ADMIN">관리</option>
              </select>
            </div>

            {/* 직원 권한: 자동 설정, 읽기 전용 */}
            {isStaffRole(role) && (
              <>
                <div className="um-field">
                  <label className="um-field-label">거래처</label>
                  <input className="um-field-input" value={company} readOnly disabled />
                </div>
                <div className="um-field">
                  <label className="um-field-label">부서</label>
                  <input className="um-field-input" value={department} readOnly disabled />
                </div>
              </>
            )}

            {/* 고객 권한: 회사 필수, 부서는 그룹 소속만 선택 */}
            {isClient && (
              <>
                <div className="um-field">
                  <label className="um-field-label">거래처 *</label>
                  <select
                    className="um-field-input"
                    value={company}
                    onChange={(e) => { setCompany(e.target.value); setDepartment(""); setError(null); }}
                    disabled={saving}
                  >
                    <option value="">거래처 선택</option>
                    {companyNames.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="um-field">
                  <label className="um-field-label">부서</label>
                  <select
                    className="um-field-input"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={saving || !company}
                  >
                    <option value="">부서 선택 (선택)</option>
                    {selectedGroupDepts.map((d) => (
                      <option key={d.id} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {!isClient && (
              <div className="um-field">
                <label className="um-field-label">재직 상태</label>
                <select
                  className="um-field-input"
                  value={isActive ? "true" : "false"}
                  onChange={(e) => setIsActive(e.target.value === "true")}
                  disabled={saving}
                >
                  <option value="true">재직중</option>
                  <option value="false">퇴사</option>
                </select>
              </div>
            )}
            {error && <p className="um-field-error">{error}</p>}
          </div>
          <div className="um-modal-footer">
            <button type="button" className="um-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </button>
            <button type="button" className="um-btn-cancel" onClick={onClose} disabled={saving}>취소</button>
          </div>
        </div>
      </div>

      {pendingRole && (
        <RoleConfirmModal
          role={pendingRole}
          step={confirmStep}
          onConfirm={handleRoleConfirmed}
          onCancel={handleRoleCancelled}
        />
      )}
    </>
  );
}

// ── Main page ─────────────────────────────────────────────
type AdminUsersPageProps = {
  currentUser?: AuthUser | null;
};

export function AdminUsersPage({ currentUser }: AdminUsersPageProps) {
  const isAdmin = currentUser?.role === "ADMIN";
  const [users, setUsers] = useState<User[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [signupTotal, setSignupTotal] = useState(0);
  const [companyNames, setCompanyNames] = useState<CompanyName[]>([]);
  const [groups, setGroups] = useState<GroupManagementGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const hasInitialized = useRef(false);
  const isInitialMount = useRef(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [companyFilterOpen, setCompanyFilterOpen] = useState(false);
  const [companyFilterSearch, setCompanyFilterSearch] = useState("");
  const [page, setPage] = useState(1);
  const [signupPage, setSignupPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [approvalTarget, setApprovalTarget] = useState<SignupRequest | null>(null);
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [historyUserId, setHistoryUserId] = useState<number | null>(null);
  const [historyUserName, setHistoryUserName] = useState<string>("");


  const totalPages = Math.max(1, Math.ceil(usersTotal / pageSize));
  const signupTotalPages = Math.max(1, Math.ceil(signupTotal / pageSize));

  const getPaginationNumbers = (): (number | "...")[] => {
    const PAGE_WINDOW_SIZE = 8;
    if (totalPages <= PAGE_WINDOW_SIZE + 1) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const visibleCore = Math.max(1, PAGE_WINDOW_SIZE - 1);
    const coreEnd = Math.min(totalPages - 1, Math.max(visibleCore, page + (visibleCore - 3)));
    const coreStart = Math.max(1, coreEnd - visibleCore + 1);
    const nums: (number | "...")[] = [];
    for (let p = coreStart; p <= coreEnd; p++) nums.push(p);
    if (coreEnd < totalPages - 1) nums.push("...");
    nums.push(totalPages);
    return nums;
  };

  const fetchUsersPage = async (targetPage: number = page, targetSize: number = pageSize) => {
    const userRows = await listUsers({
      q: searchText.trim() || undefined,
      companyName: companyFilter.trim() || undefined,
      page: targetPage,
      size: targetSize,
    });
    setUsers(userRows.items);
    setUsersTotal(userRows.total);
    setPage(userRows.page);
  };

  const fetchUsersData = async (
    targetUserPage: number = page,
    targetSignupPage: number = signupPage,
    targetSize: number = pageSize
  ) => {
    setLoading(true);
    setError(null);
    try {
      const [userRows, signupRows] = await Promise.all([
        listUsers({
          q: searchText.trim() || undefined,
          companyName: companyFilter.trim() || undefined,
          page: targetUserPage,
          size: targetSize,
        }),
        listSignupRequests({
          status: "PENDING",
          q: searchText.trim() || undefined,
          page: targetSignupPage,
          size: targetSize,
        }),
      ]);
      setUsers(userRows.items);
      setUsersTotal(userRows.total);
      setPage(userRows.page);
      setSignupRequests(signupRows.items);
      setSignupTotal(signupRows.total);
      setSignupPage(signupRows.page);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setInitialized(true);
      }
    } catch (err: any) {
      setError(err?.message || "데이터 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchMeta = async () => {
    try {
      const [cn, groupRows] = await Promise.all([
        listCompanyNames(),
        listGroups({ size: 500 }),
      ]);
      setCompanyNames(cn);
      setGroups(groupRows.items);
    } catch (err: any) {
      setError(err?.message || "메타 데이터 조회 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    void fetchMeta();
  }, []);

  useEffect(() => {
    void fetchUsersData(page, signupPage, pageSize);
  }, [page, signupPage, pageSize]);

  // 검색어 변경 시 0.6초 debounce 자동검색 (초기 마운트에서는 실행하지 않음 — [page, signupPage, pageSize] effect가 초기 로드 담당)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      setSignupPage(1);
      void fetchUsersData(1, 1, pageSize);
    }, 600);
    return () => clearTimeout(timer);
  }, [searchText]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1);
    setSignupPage(1);
    void fetchUsersData(1, 1, pageSize);
  }, [companyFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!companyFilterOpen) return;
    const close = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest(".um-company-filter-wrap")) setCompanyFilterOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [companyFilterOpen]);

  const handleApprove = async (requestId: number, payload: ReviewSignupRequestBody) => {
    setSavingId(requestId);
    setError(null);
    try {
      await reviewSignupRequest(requestId, payload);
      await Promise.all([fetchMeta(), fetchUsersData(page, signupPage, pageSize)]);
    } catch (err: any) {
      setError(err?.message || "승인 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!window.confirm("가입 요청을 거절하시겠습니까?")) return;
    setSavingId(requestId);
    setError(null);
    try {
      await reviewSignupRequest(requestId, { action: "REJECT" });
      await fetchUsersData(page, signupPage, pageSize);
    } catch (err: any) {
      setError(err?.message || "거절 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveUser = async (
    userId: number,
    data: { role: UserRole; companyName: string | null; department: string | null; phone: string | null; isActive: boolean }
  ) => {
    setSavingId(userId);
    setError(null);
    try {
      await updateUserDetails(userId, data);
      await fetchUsersPage(page, pageSize);
    } catch (err: any) {
      setError(err?.message || "저장 중 오류가 발생했습니다.");
      throw err;
    } finally {
      setSavingId(null);
    }
  };

  const handleToggleShowQuotedPrice = async (userId: number, current: boolean) => {
    setSavingId(userId);
    setError(null);
    try {
      const updated = await updateUserDetails(userId, { showQuotedPrice: !current });
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, ...updated } : u));
      await fetchUsersPage(page, pageSize);
    } catch (err: any) {
      setError(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const pendingCount = signupTotal;

  return (
    <div className="table-page um-page">
      {/* Toolbar */}
      <div className="um-toolbar">
        <div className="um-toolbar-left">
          <div className="addressbook-pill" style={{ width: 240 }}>
            <input
              className="addressbook-pill-input"
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  setSignupPage(1);
                  void fetchUsersData(1, 1, pageSize);
                }
              }}
              placeholder="유저, 메일 검색"
            />
          </div>
          {/* 그룹명 필터 드롭다운 */}
          <div className="um-company-filter-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className="addressbook-reset-btn"
              style={{
                minWidth: 120,
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                paddingRight: 10,
                background: companyFilter ? "#e8f0ff" : undefined,
                color: companyFilter ? "#0075ff" : undefined,
                fontWeight: companyFilter ? 600 : undefined,
              }}
              onClick={() => {
                setCompanyFilterOpen((v) => !v);
                setCompanyFilterSearch("");
              }}
            >
              <span>{companyFilter || "그룹명 전체"}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {companyFilterOpen && (
              <div style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                zIndex: 200,
                background: "#fff",
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                minWidth: 180,
                maxHeight: 280,
                display: "flex",
                flexDirection: "column",
              }}>
                <div style={{ padding: "8px 10px", borderBottom: "1px solid #f0f0f0" }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder="그룹명 검색"
                    value={companyFilterSearch}
                    onChange={(e) => setCompanyFilterSearch(e.target.value)}
                    style={{ width: "100%", border: "1px solid #e0e0e0", borderRadius: 3, padding: "5px 8px", fontSize: 13, boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ overflowY: "auto", flex: 1 }}>
                  <button
                    type="button"
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: 13, background: !companyFilter ? "#f0f6ff" : "transparent", border: "none", cursor: "pointer", fontWeight: !companyFilter ? 600 : 400 }}
                    onClick={() => { setCompanyFilter(""); setCompanyFilterOpen(false); }}
                  >
                    전체 보기
                  </button>
                  {companyNames
                    .filter((c) => !companyFilterSearch.trim() || c.name.toLowerCase().includes(companyFilterSearch.trim().toLowerCase()))
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        style={{ display: "block", width: "100%", textAlign: "left", padding: "7px 12px", fontSize: 13, background: companyFilter === c.name ? "#f0f6ff" : "transparent", border: "none", cursor: "pointer", fontWeight: companyFilter === c.name ? 600 : 400 }}
                        onClick={() => { setCompanyFilter(c.name); setCompanyFilterOpen(false); }}
                      >
                        {c.name}
                      </button>
                    ))
                  }
                  {companyNames.filter((c) => !companyFilterSearch.trim() || c.name.toLowerCase().includes(companyFilterSearch.trim().toLowerCase())).length === 0 && (
                    <div style={{ padding: "10px 12px", fontSize: 13, color: "#999" }}>검색 결과 없음</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            className="addressbook-reset-btn"
            onClick={() => { setSearchText(""); setCompanyFilter(""); }}
          >
            초기화
          </button>
          {pendingCount > 0 && (
            <span className="um-pending-badge">대기 {pendingCount}건</span>
          )}
        </div>
        <div className="um-toolbar-right">
          <select
            className="addressbook-page-size"
            value={String(pageSize)}
            onChange={(e) => {
              const nextSize = Number(e.target.value);
              setPageSize(nextSize);
              setPage(1);
              setSignupPage(1);
            }}
            aria-label="페이지 크기"
          >
            <option value="10">10개씩 보기</option>
            <option value="20">20개씩 보기</option>
            <option value="50">50개씩 보기</option>
          </select>
        </div>
      </div>

      {error && <p className="um-error">{error}</p>}
      {!initialized && loading && <p className="um-loading">불러오는 중...</p>}

      {initialized && (
        <table className="grid-table um-table">
          <colgroup>
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "16%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "18%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>그룹명</th>
              <th>부서명</th>
              <th>유저이름</th>
              <th>메일주소</th>
              <th>연락처</th>
              <th>가입일</th>
              <th>권한</th>
              <th>상태</th>
              <th>승인상태</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {signupRequests.map((r) => (
              <tr key={`req-${r.id}`} className="um-row-pending">
                <td>-</td>
                <td>-</td>
                <td>{r.name}</td>
                <td className="um-email-cell">{r.email}</td>
                <td>-</td>
                <td className="um-date-cell">
                  <span>{formatDate(r.createdAt).date}</span>
                  <span>{formatDate(r.createdAt).time}</span>
                </td>
                <td>-</td>
                <td>-</td>
                <td>
                  <span className={approvalBadgeClass("PENDING")}>{approvalLabel("PENDING")}</span>
                </td>
                <td>
                  <div className="um-actions">
                    {isAdmin ? (
                      <>
                        <button
                          type="button"
                          className="um-approve-btn"
                          disabled={savingId === r.id}
                          onClick={() => setApprovalTarget(r)}
                        >
                          승인
                        </button>
                        <button
                          type="button"
                          className="um-reject-btn"
                          disabled={savingId === r.id}
                          onClick={() => void handleReject(r.id)}
                        >
                          거절
                        </button>
                      </>
                    ) : (
                      <span className="um-readonly-hint">읽기 전용</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {users.map((u) => (
              <tr key={`user-${u.id}`}>
                <td>{u.companyName || "-"}</td>
                <td>{u.department || "-"}</td>
                <td>{u.name}</td>
                <td className="um-email-cell">{u.email}</td>
                <td>{u.phone || "-"}</td>
                <td className="um-date-cell">
                  <span>{formatDate(u.createdAt).date}</span>
                  <span>{formatDate(u.createdAt).time}</span>
                </td>
                <td>
                  {u.role ? (
                    <span className={roleBadgeClass(u.role)}>{roleLabel(u.role)}</span>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>
                  {u.role !== "CLIENT" ? (
                    <span className={statusBadgeClass(u.isActive !== false)}>
                      {statusLabel(u.isActive !== false)}
                    </span>
                  ) : (
                    <span>-</span>
                  )}
                </td>
                <td>
                  <span className={approvalBadgeClass("APPROVED")}>{approvalLabel("APPROVED")}</span>
                </td>
                <td>
                  <div className="um-actions">
                    {isAdmin && (
                      <button
                        type="button"
                        className="addressbook-action-btn"
                        disabled={savingId === u.id}
                        onClick={() => setEditTarget(u)}
                        title="수정"
                      >
                        <Pencil size={14} />
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        className={`addressbook-action-btn um-quoted-toggle${u.showQuotedPrice === false ? " um-quoted-off" : ""}`}
                        disabled={savingId === u.id}
                        onClick={() => void handleToggleShowQuotedPrice(u.id, u.showQuotedPrice !== false)}
                        title={u.showQuotedPrice === false ? "예상요금 숨김 (클릭 시 표시)" : "예상요금 표시 (클릭 시 숨김)"}
                      >
                        ₩
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        className="addressbook-action-btn addressbook-history-btn"
                        onClick={() => {
                          setHistoryUserId(u.id);
                          setHistoryUserName(u.name);
                        }}
                        title="변경이력"
                      >
                        H
                      </button>
                    )}
                    {!isAdmin && (
                      <span className="um-readonly-hint">읽기 전용</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}

            {signupRequests.length === 0 && users.length === 0 && (
              <tr>
                <td colSpan={10} className="um-empty-row">
                  {searchText ? "검색 결과가 없습니다." : "등록된 유저가 없습니다."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {initialized && usersTotal > 0 && (
        <div className="pagination-line">
          <button
            type="button"
            className="pager-nav-btn"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            &lt; 이전
          </button>
          <span className="page-ellipsis">총 {usersTotal}건</span>
          <div className="pager-numbers">
            {getPaginationNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`um-ellipsis-${idx}`} className="page-ellipsis">...</span>
              ) : (
                <button
                  key={`um-page-${p}`}
                  type="button"
                  onClick={() => setPage(p)}
                  disabled={p === page}
                  className={`page-number-btn${p === page ? " active" : ""}`}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button
            type="button"
            className="pager-nav-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          >
            다음 &gt;
          </button>
        </div>
      )}

      {initialized && signupTotal > 0 && (
        <div className="pagination-line">
          <button
            type="button"
            className="pager-nav-btn"
            disabled={signupPage <= 1}
            onClick={() => setSignupPage((prev) => Math.max(1, prev - 1))}
          >
            대기 이전
          </button>
          <span className="page-ellipsis">대기 총 {signupTotal}건</span>
          <span className="page-ellipsis">{signupPage} / {signupTotalPages}</span>
          <button
            type="button"
            className="pager-nav-btn"
            disabled={signupPage >= signupTotalPages}
            onClick={() => setSignupPage((prev) => Math.min(signupTotalPages, prev + 1))}
          >
            대기 다음
          </button>
        </div>
      )}

      {/* Modals */}
      {approvalTarget && (
        <ApprovalModal
          request={approvalTarget}
          companyNames={companyNames}
          groups={groups}
          onClose={() => setApprovalTarget(null)}
          onApprove={handleApprove}
        />
      )}

      {editTarget && (
        <EditUserModal
          user={editTarget}
          companyNames={companyNames}
          groups={groups}
          onClose={() => setEditTarget(null)}
          onSave={handleSaveUser}
        />
      )}

      <HistoryModal
        open={historyUserId !== null}
        resource="USER"
        resourceId={historyUserId}
        title={historyUserName}
        onClose={() => { setHistoryUserId(null); setHistoryUserName(""); }}
      />
    </div>
  );
}
