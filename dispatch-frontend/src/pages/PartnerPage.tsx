// src/pages/PartnerPage.tsx  — 그룹관리
import { useEffect, useState } from "react";
import {
  listCompanyNames,
  createCompanyName,
  updateCompanyName,
  deleteCompanyName,
  listUsers,
  changeUserCompany,
  listGroups,
  createGroupDepartment,
  updateGroupDepartment,
  deleteGroupDepartment,
  createGroupContact,
  updateGroupContact,
  deleteGroupContact,
} from "../api/client";
import { ExcelIcon } from "../ui/icons";
import type {
  CompanyName,
  GroupContact,
  GroupDepartment,
  GroupManagementGroup,
  User,
} from "../api/types";
import { Plus, Pencil, Trash2, ChevronDown } from "lucide-react";
import { HistoryModal } from "../components/HistoryModal";
import { openConfirm } from "../components/ConfirmDialog";
import type { AuthUser } from "../LoginPanel";
import { formatPhoneNumber } from "../utils/phoneFormat";

function AddGroupModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "그룹 추가 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal-header">
          <span className="gm-modal-title">그룹 추가</span>
        </div>
        <form onSubmit={handleSubmit} className="gm-modal-form">
          <div className="gm-field">
            <label className="gm-field-label">거래처명 *</label>
            <input
              className="gm-field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="거래처명을 입력하세요"
              disabled={saving}
              autoFocus
            />
          </div>
          {error && <p className="gm-field-error">{error}</p>}
          <div className="gm-modal-footer">
            <button type="button" className="gm-btn-cancel" onClick={onClose} disabled={saving}>취소</button>
            <button type="submit" className="gm-btn-save" disabled={saving || !name.trim()}>
              {saving ? "추가 중..." : "추가"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditGroupModal({
  company,
  onClose,
  onSave,
}: {
  company: CompanyName;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(company.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === company.name) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "업체명 수정 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal-header">
          <span className="gm-modal-title">업체명 수정</span>
        </div>
        <form onSubmit={handleSubmit} className="gm-modal-form">
          <div className="gm-field">
            <label className="gm-field-label">업체명 *</label>
            <input
              className="gm-field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="업체명을 입력하세요"
              disabled={saving}
              autoFocus
            />
          </div>
          {error && <p className="gm-field-error">{error}</p>}
          <div className="gm-modal-footer">
            <button type="button" className="gm-btn-cancel" onClick={onClose} disabled={saving}>취소</button>
            <button type="submit" className="gm-btn-save" disabled={saving || !name.trim() || name.trim() === company.name}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DepartmentListModal({
  group,
  isAdmin,
  onClose,
  onAdd,
  onEdit,
  onDelete,
  onHistory,
}: {
  group: GroupManagementGroup;
  isAdmin: boolean;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (department: GroupDepartment) => void;
  onDelete: (department: GroupDepartment) => void;
  onHistory: (department: GroupDepartment) => void;
}) {
  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal-box gm-dept-list-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal-header">
          <span className="gm-modal-title">부서목록 — {group.name}</span>
        </div>
        <div className="gm-dept-list-body">
          {group.departments.length === 0 ? (
            <div className="gm-department-empty">등록된 부서가 없습니다.</div>
          ) : (
            <div className="gm-department-list">
              {group.departments.map((department) => (
                <div key={department.id} className="gm-department-chip">
                  <div className="gm-department-chip-text">
                    <span className="gm-department-name">{department.name}</span>
                    <span className="gm-department-meta">{department.contactCount}명</span>
                  </div>
                  <div className="gm-department-chip-actions">
                    <button
                      type="button"
                      className="addressbook-action-btn"
                      onClick={() => onEdit(department)}
                      title="부서 수정"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      type="button"
                      className="addressbook-action-btn"
                      onClick={() => onDelete(department)}
                      title="부서 삭제"
                    >
                      <Trash2 size={12} />
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        className="addressbook-action-btn addressbook-history-btn"
                        onClick={() => onHistory(department)}
                        title="변경이력"
                      >
                        H
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="gm-modal-footer">
          <button type="button" className="gm-btn-cancel" onClick={onClose}>닫기</button>
          <button type="button" className="gm-btn-save" onClick={onAdd}>
            <Plus size={13} style={{ marginRight: 4 }} />
            부서 추가
          </button>
        </div>
      </div>
    </div>
  );
}

function DepartmentModal({
  groupName,
  department,
  onClose,
  onSave,
}: {
  groupName: string;
  department?: GroupDepartment | null;
  onClose: () => void;
  onSave: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState(department?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      setError(err?.message || "부서 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal-header">
          <span className="gm-modal-title">{department ? "부서 수정" : "부서 추가"} — {groupName}</span>
        </div>
        <form onSubmit={handleSubmit} className="gm-modal-form">
          <div className="gm-field">
            <label className="gm-field-label">부서명 *</label>
            <input
              className="gm-field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="부서명을 입력하세요"
              disabled={saving}
              autoFocus
            />
          </div>
          {error && <p className="gm-field-error">{error}</p>}
          <div className="gm-modal-footer">
            <button type="button" className="gm-btn-cancel" onClick={onClose} disabled={saving}>취소</button>
            <button type="submit" className="gm-btn-save" disabled={saving || !name.trim()}>
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ContactModal({
  group,
  contact,
  onClose,
  onSave,
}: {
  group: GroupManagementGroup;
  contact?: GroupContact | null;
  onClose: () => void;
  onSave: (payload: {
    departmentId: number;
    name: string;
    position: string;
    phone: string;
    email: string;
  }) => Promise<void>;
}) {
  const [departmentId, setDepartmentId] = useState<number | "">(
    contact?.departmentId ?? group.departments[0]?.id ?? ""
  );
  const [name, setName] = useState(contact?.name ?? "");
  const [position, setPosition] = useState(contact?.position ?? "");
  const [phone, setPhone] = useState(formatPhoneNumber(contact?.phone ?? ""));
  const [email, setEmail] = useState(contact?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasDepartments = group.departments.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!departmentId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        departmentId: Number(departmentId),
        name: name.trim(),
        position: position.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "인원 저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gm-modal-backdrop" onClick={onClose}>
      <div className="gm-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="gm-modal-header">
          <span className="gm-modal-title">{contact ? "인원 수정" : "인원 추가"} — {group.name}</span>
        </div>
        <form onSubmit={handleSubmit} className="gm-modal-form">
          <div className="gm-field">
            <label className="gm-field-label">부서명 *</label>
            <select
              className="gm-field-input"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value === "" ? "" : Number(e.target.value))}
              disabled={saving || !hasDepartments}
            >
              <option value="">부서를 선택하세요</option>
              {group.departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            {!hasDepartments && (
              <p className="gm-field-help">먼저 이 그룹에 부서를 추가해야 인원을 등록할 수 있습니다.</p>
            )}
          </div>
          <div className="gm-field">
            <label className="gm-field-label">담당자명 *</label>
            <input
              className="gm-field-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="담당자명을 입력하세요"
              disabled={saving}
            />
          </div>
          <div className="gm-field">
            <label className="gm-field-label">직급</label>
            <input
              className="gm-field-input"
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="직급"
              disabled={saving}
            />
          </div>
          <div className="gm-field">
            <label className="gm-field-label">연락처</label>
            <input
              className="gm-field-input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
              placeholder="010-0000-0000"
              disabled={saving}
            />
          </div>
          <div className="gm-field">
            <label className="gm-field-label">이메일</label>
            <input
              className="gm-field-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              disabled={saving}
            />
          </div>
          {error && <p className="gm-field-error">{error}</p>}
          <div className="gm-modal-footer">
            <button type="button" className="gm-btn-cancel" onClick={onClose} disabled={saving}>취소</button>
            <button
              type="submit"
              className="gm-btn-save"
              disabled={saving || !hasDepartments || !departmentId || !name.trim()}
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

type PartnerPageProps = {
  currentUser?: AuthUser | null;
};

export function PartnerPage({ currentUser }: PartnerPageProps) {
  const isAdmin = currentUser?.role === "ADMIN";
  const [companies, setCompanies] = useState<CompanyName[]>([]);
  const [groups, setGroups] = useState<GroupManagementGroup[]>([]);
  const [totalGroups, setTotalGroups] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [pageSize, setPageSize] = useState<number>(20);

  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [editGroupTarget, setEditGroupTarget] = useState<CompanyName | null>(null);
  const [departmentListGroup, setDepartmentListGroup] = useState<GroupManagementGroup | null>(null);
  const [departmentModalTarget, setDepartmentModalTarget] = useState<{
    group: GroupManagementGroup;
    department?: GroupDepartment | null;
  } | null>(null);
  const [contactModalTarget, setContactModalTarget] = useState<{
    group: GroupManagementGroup;
    contact?: GroupContact | null;
  } | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<number | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{
    resource: string;
    resourceId: number;
    title: string;
  } | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));

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

  const fetchData = async (targetPage: number = page, targetSize: number = pageSize) => {
    setLoading(true);
    setError(null);
    try {
      const [companyRows, groupRows] = await Promise.all([
        listCompanyNames(),
        listGroups({
          q: searchKeyword.trim() || undefined,
          page: targetPage,
          size: targetSize,
        }),
      ]);
      setCompanies(companyRows.sort((a, b) => a.name.localeCompare(b.name, "ko")));
      setGroups(groupRows.items);
      setTotalGroups(groupRows.total);
      setPage(groupRows.page);
    } catch (err: any) {
      setError(err?.message || "데이터 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData(page, pageSize);
  }, [page, pageSize]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
      return;
    }
    void fetchData(1, pageSize);
  }, [searchKeyword]);

  const fetchAllUsersByCompany = async (companyName: string) => {
    const collected: User[] = [];
    let nextPage = 1;
    let total = 0;

    do {
      const result = await listUsers({
        companyName,
        page: nextPage,
        size: 200,
      });
      collected.push(...result.items);
      total = result.total;
      nextPage += 1;
    } while (collected.length < total);

    return collected;
  };

  const handleAddGroup = async (name: string) => {
    await createCompanyName(name);
    await fetchData(page, pageSize);
  };

  const handleEditGroup = async (id: number, name: string) => {
    await updateCompanyName(id, name);
    await fetchData(page, pageSize);
  };

  const handleDeleteGroup = async (company: CompanyName) => {
    const ok = await openConfirm({
      title: "그룹 삭제",
      message: `"${company.name}" 그룹을 삭제하시겠습니까?\n그룹의 부서/인원 정보와 소속 유저의 그룹 연결이 함께 정리됩니다.`,
    });
    if (!ok) return;
    setDeletingGroupId(company.id);
    setError(null);
    try {
      const members = await fetchAllUsersByCompany(company.name);
      await Promise.all(members.map((u) => changeUserCompany(u.id, null)));
      await deleteCompanyName(company.id);
      await fetchData(page, pageSize);
    } catch (err: any) {
      setError(err?.message || "그룹 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingGroupId(null);
    }
  };

  const handleSaveDepartment = async (groupId: number, departmentId: number | null, name: string) => {
    if (departmentId) {
      await updateGroupDepartment(departmentId, name);
    } else {
      await createGroupDepartment(groupId, name);
    }
    await fetchData(page, pageSize);
  };

  const handleDeleteDepartment = async (department: GroupDepartment) => {
    const ok = await openConfirm({
      title: "부서 삭제",
      message: `"${department.name}" 부서를 삭제하시겠습니까?`,
    });
    if (!ok) return;
    try {
      await deleteGroupDepartment(department.id);
      await fetchData(page, pageSize);
    } catch (err: any) {
      setError(err?.message || "부서 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleSaveContact = async (
    groupId: number,
    contactId: number | null,
    payload: {
      departmentId: number;
      name: string;
      position: string;
      phone: string;
      email: string;
    }
  ) => {
    if (contactId) {
      await updateGroupContact(contactId, payload);
    } else {
      await createGroupContact(groupId, payload);
    }
    await fetchData(page, pageSize);
  };

  const handleDeleteContact = async (contact: GroupContact) => {
    const ok = await openConfirm({
      title: "인원 삭제",
      message: `"${contact.name}" 인원 정보를 삭제하시겠습니까?`,
    });
    if (!ok) return;
    try {
      await deleteGroupContact(contact.id);
      await fetchData(page, pageSize);
    } catch (err: any) {
      setError(err?.message || "인원 삭제 중 오류가 발생했습니다.");
    }
  };

  const toggleExpand = (groupId: number) =>
    setExpanded((prev) => ({ ...prev, [groupId]: !prev[groupId] }));

  const handleExcelExport = () => {
    const rows: string[][] = [["그룹명", "부서명", "담당자명", "직급", "연락처", "이메일"]];
    for (const group of groups) {
      if (group.contacts.length === 0) {
        rows.push([group.name, "", "", "", "", ""]);
        continue;
      }
      for (const contact of group.contacts) {
        rows.push([
          group.name,
          contact.departmentName,
          contact.name,
          contact.position || "",
          contact.phone || "",
          contact.email || "",
        ]);
      }
    }
    const csv = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "그룹관리.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const openHistory = (resource: string, resourceId: number, title: string) => {
    setHistoryTarget({ resource, resourceId, title });
  };

  return (
    <div className="table-page gm-page">
      <div className="gm-toolbar">
        <div className="gm-toolbar-left">
          <div className="addressbook-pill">
            <input
              className="addressbook-pill-input"
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="그룹명 검색"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setPage(1);
                  void fetchData(1, pageSize);
                }
              }}
            />
          </div>
          <button
            type="button"
            className="addressbook-reset-btn"
            onClick={() => {
              setSearchKeyword("");
              setPage(1);
            }}
          >
            초기화
          </button>
        </div>
        <div className="gm-toolbar-right">
          <select
            className="addressbook-page-size"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={20}>20개씩 보기</option>
            <option value={50}>50개씩 보기</option>
            <option value={100}>100개씩 보기</option>
          </select>
          <button type="button" className="excel-btn" onClick={handleExcelExport} title="엑셀 다운로드">
            <ExcelIcon />
          </button>
          <button type="button" className="addressbook-add-btn" onClick={() => setAddGroupOpen(true)}>
            <Plus size={14} />
            그룹 추가
          </button>
        </div>
      </div>

      {error && <p className="gm-error">{error}</p>}
      {loading && <p className="gm-loading">불러오는 중...</p>}

      {!loading && groups.length === 0 && (
        <div className="gm-empty">
          <p>{searchKeyword ? "검색 결과가 없습니다." : "등록된 그룹이 없습니다."}</p>
        </div>
      )}

      <div className="gm-list">
        {groups.map((group) => {
          const company = companies.find((item) => item.id === group.id) ?? {
            id: group.id,
            name: group.name,
            createdAt: group.createdAt,
          };
          const isOpen = expanded[group.id] === true;

          return (
            <div key={group.id} className="gm-section">
              <div className="gm-section-header" onClick={() => toggleExpand(group.id)}>
                <div className="gm-section-title" onClick={(e) => e.stopPropagation()}>
                  <span className="gm-company-name">{group.name}</span>
                  <span className="gm-member-count">({group.contacts.length}명)</span>
                  <button
                    type="button"
                    className="gm-name-edit-btn"
                    onClick={() => setEditGroupTarget(company)}
                    title="업체명 수정"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <div className="gm-section-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    className="gm-header-btn"
                    onClick={() => setDepartmentListGroup(group)}
                  >
                    부서목록
                  </button>
                  <button
                    type="button"
                    className="gm-header-btn"
                    onClick={() => setContactModalTarget({ group, contact: null })}
                  >
                    <Plus size={12} />
                    인원추가
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      className="addressbook-action-btn addressbook-history-btn"
                      title="변경이력"
                      onClick={(e) => {
                        e.stopPropagation();
                        openHistory("GROUP", group.id, group.name);
                      }}
                    >
                      H
                    </button>
                  )}
                  <button
                    type="button"
                    className="gm-header-btn gm-header-btn-del"
                    onClick={() => void handleDeleteGroup(company)}
                    disabled={deletingGroupId === group.id}
                    title="그룹 삭제"
                  >
                    <Trash2 size={12} />
                  </button>
                  <button
                    type="button"
                    className="gm-expand-btn"
                    onClick={() => toggleExpand(group.id)}
                    aria-label={isOpen ? "접기" : "펼치기"}
                  >
                    <ChevronDown
                      size={16}
                      style={{
                        transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.2s",
                        stroke: "var(--black)",
                      }}
                    />
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="gm-section-body">
                  <table className="gm-table">
                    <colgroup>
                      <col style={{ width: "20%" }} />
                      <col style={{ width: "15%" }} />
                      <col style={{ width: "12%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "16%" }} />
                      <col style={{ width: "19%" }} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>부서명</th>
                        <th>담당자명</th>
                        <th>직급</th>
                        <th>연락처</th>
                        <th>이메일</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.contacts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="gm-table-empty">등록된 인원이 없습니다. 인원을 추가하세요.</td>
                        </tr>
                      ) : (
                        group.contacts.map((contact) => (
                          <tr key={contact.id}>
                            <td>{contact.departmentName}</td>
                            <td>{contact.name}</td>
                            <td>{contact.position || "-"}</td>
                            <td>{contact.phone || "-"}</td>
                            <td className="gm-email-cell">{contact.email || "-"}</td>
                            <td>
                              <div className="gm-row-actions">
                                <button
                                  type="button"
                                  className="addressbook-action-btn"
                                  onClick={() => setContactModalTarget({ group, contact })}
                                  title="수정"
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="addressbook-action-btn"
                                  onClick={() => void handleDeleteContact(contact)}
                                  title="삭제"
                                >
                                  <Trash2 size={14} />
                                </button>
                                {isAdmin && (
                                  <button
                                    type="button"
                                    className="addressbook-action-btn addressbook-history-btn"
                                    onClick={() => openHistory("GROUP_CONTACT", contact.id, `${group.name} · ${contact.name}`)}
                                    title="변경이력"
                                  >
                                    H
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!loading && totalGroups > 0 && (
        <div className="pagination-line">
          <button
            type="button"
            className="pager-nav-btn"
            disabled={page <= 1}
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          >
            &lt; 이전
          </button>
          <span className="page-ellipsis">총 {totalGroups}건</span>
          <div className="pager-numbers">
            {getPaginationNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`gm-ellipsis-${idx}`} className="page-ellipsis">...</span>
              ) : (
                <button
                  key={`gm-page-${p}`}
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

      {addGroupOpen && (
        <AddGroupModal
          onClose={() => setAddGroupOpen(false)}
          onSave={handleAddGroup}
        />
      )}

      {editGroupTarget && (
        <EditGroupModal
          company={editGroupTarget}
          onClose={() => setEditGroupTarget(null)}
          onSave={(name) => handleEditGroup(editGroupTarget.id, name)}
        />
      )}

      {departmentListGroup && (() => {
        const freshGroup = groups.find(g => g.id === departmentListGroup.id) ?? departmentListGroup;
        return (
          <DepartmentListModal
            group={freshGroup}
            isAdmin={isAdmin}
            onClose={() => setDepartmentListGroup(null)}
            onAdd={() => setDepartmentModalTarget({ group: freshGroup, department: null })}
            onEdit={(department) => setDepartmentModalTarget({ group: freshGroup, department })}
            onDelete={(department) => void handleDeleteDepartment(department)}
            onHistory={(department) => openHistory("GROUP_DEPARTMENT", department.id, `${freshGroup.name} · ${department.name}`)}
          />
        );
      })()}

      {departmentModalTarget && (
        <DepartmentModal
          groupName={departmentModalTarget.group.name}
          department={departmentModalTarget.department}
          onClose={() => setDepartmentModalTarget(null)}
          onSave={(name) =>
            handleSaveDepartment(
              departmentModalTarget.group.id,
              departmentModalTarget.department?.id ?? null,
              name
            )
          }
        />
      )}

      {contactModalTarget && (
        <ContactModal
          group={contactModalTarget.group}
          contact={contactModalTarget.contact}
          onClose={() => setContactModalTarget(null)}
          onSave={(payload) =>
            handleSaveContact(
              contactModalTarget.group.id,
              contactModalTarget.contact?.id ?? null,
              payload
            )
          }
        />
      )}

      <HistoryModal
        open={historyTarget !== null}
        resource={historyTarget?.resource ?? "GROUP"}
        resourceId={historyTarget?.resourceId}
        title={historyTarget?.title ?? ""}
        onClose={() => setHistoryTarget(null)}
      />
    </div>
  );
}
