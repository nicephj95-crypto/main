// src/AdminUsersPage.tsx
import { useEffect, useState } from "react";
import {
  listUsers,
  changeUserRole,
  changeUserCompany,
  listSignupRequests,
  reviewSignupRequest,
  listCompanyNames,
} from "./api/client";
import type { CompanyName, SignupRequest, SignupRequestStatus, User, UserRole } from "./api/types";
import { SignupRequestsTable } from "./components/SignupRequestsTable";
import { AdminUsersTable } from "./components/AdminUsersTable";
import { CompanySearchSelect } from "./components/CompanySearchSelect";

type SignupFilter = SignupRequestStatus | "ALL";

// 회사 설정 모달
function CompanyPickerModal({
  user,
  companyNames,
  onClose,
  onSave,
}: {
  user: User;
  companyNames: CompanyName[];
  onClose: () => void;
  onSave: (value: string | null) => void;
}) {
  const [selected, setSelected] = useState(user.companyName ?? "");

  return (
    <div
      style={{
        position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 8, padding: 24, width: 360,
          maxWidth: "calc(100vw - 32px)", boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 6, fontSize: 15 }}>회사 설정</h3>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
          <strong>{user.name}</strong> ({user.email})
        </p>

        <CompanySearchSelect
          value={selected}
          onChange={setSelected}
          companyNames={companyNames}
          placeholder="회사명 검색 후 선택"
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: 4, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 13 }}
          >
            취소
          </button>
          {selected && (
            <button
              type="button"
              onClick={() => onSave(null)}
              style={{ padding: "7px 14px", borderRadius: 4, border: "1px solid #ccc", background: "#fff", cursor: "pointer", fontSize: 13, color: "#e53e3e" }}
            >
              연결 해제
            </button>
          )}
          <button
            type="button"
            onClick={() => onSave(selected || null)}
            style={{ padding: "7px 14px", borderRadius: 4, border: "none", background: "#3182ce", color: "#fff", cursor: "pointer", fontSize: 13 }}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [signupFilter, setSignupFilter] = useState<SignupFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [companyNames, setCompanyNames] = useState<CompanyName[]>([]);
  const [companyPickerTarget, setCompanyPickerTarget] = useState<User | null>(null);

  const fetchUsers = async () => {
    const userData = await listUsers();
    setUsers(userData);
  };

  const fetchSignupRequests = async (filter: SignupFilter) => {
    const requestData = await listSignupRequests(
      filter === "ALL" ? undefined : filter
    );
    setSignupRequests(requestData);
  };

  const fetchData = async (filter: SignupFilter) => {
    setLoading(true);
    setError(null);
    try {
      const [, , companies] = await Promise.all([
        fetchUsers(),
        fetchSignupRequests(filter),
        listCompanyNames(),
      ]);
      setCompanyNames(companies);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "관리자 데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(signupFilter);
  }, [signupFilter]);

  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    setSavingId(userId);
    setError(null);
    try {
      const updated = await changeUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => u.id === userId ? { ...u, role: updated.role } : u)
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "권한 변경 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleReviewSignupRequest = async (requestId: number, action: "APPROVE" | "REJECT") => {
    setSavingId(requestId);
    setError(null);
    try {
      await reviewSignupRequest(requestId, action);
      await Promise.all([fetchUsers(), fetchSignupRequests(signupFilter)]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "가입요청 처리 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleCompanySave = async (value: string | null) => {
    if (!companyPickerTarget) return;
    const userId = companyPickerTarget.id;
    setCompanyPickerTarget(null);
    setSavingId(userId);
    setError(null);
    try {
      const updated = await changeUserCompany(userId, value);
      setUsers((prev) =>
        prev.map((u) => u.id === updated.id ? { ...u, companyName: updated.companyName } : u)
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "회사 정보 변경 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>사용자 관리 (ADMIN 전용)</h2>
      <p style={{ fontSize: 13, color: "#555", marginBottom: 12 }}>
        회사명(화주)을 설정하면 같은 회사에 속한 유저들이 주소록을 공유하게 됩니다.
      </p>

      {error && (
        <p style={{ color: "red", fontSize: 13, marginBottom: 8 }}>{error}</p>
      )}

      {loading ? (
        <p>불러오는 중...</p>
      ) : (
        <>
          <SignupRequestsTable
            signupRequests={signupRequests}
            signupFilter={signupFilter}
            setSignupFilter={setSignupFilter}
            savingId={savingId}
            onReview={handleReviewSignupRequest}
          />
          <AdminUsersTable
            users={users}
            savingId={savingId}
            onRoleChange={handleRoleChange}
            onCompanyChange={(user) => setCompanyPickerTarget(user)}
          />
        </>
      )}

      {companyPickerTarget && (
        <CompanyPickerModal
          user={companyPickerTarget}
          companyNames={companyNames}
          onClose={() => setCompanyPickerTarget(null)}
          onSave={(value) => void handleCompanySave(value)}
        />
      )}
    </div>
  );
}
