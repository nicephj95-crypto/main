// src/AdminUsersPage.tsx
import { useEffect, useState } from "react";
import {
  listUsers,
  changeUserRole,
  changeUserCompany,
  listSignupRequests,
  reviewSignupRequest,
} from "./api/client";
import type { SignupRequest, SignupRequestStatus, User, UserRole } from "./api/types";
import { SignupRequestsTable } from "./components/SignupRequestsTable";
import { AdminUsersTable } from "./components/AdminUsersTable";

type SignupFilter = SignupRequestStatus | "ALL";

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [signupRequests, setSignupRequests] = useState<SignupRequest[]>([]);
  const [signupFilter, setSignupFilter] = useState<SignupFilter>("ALL");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      await Promise.all([fetchUsers(), fetchSignupRequests(filter)]);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "관리자 데이터를 불러오는 중 오류가 발생했습니다."
      );
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
        prev.map((u) =>
          u.id === userId ? { ...u, role: updated.role } : u
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "권한 변경 중 오류가 발생했습니다.");
    } finally {
      setSavingId(null);
    }
  };

  const handleReviewSignupRequest = async (
    requestId: number,
    action: "APPROVE" | "REJECT"
  ) => {
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

  // 🔹 회사(화주) 설정 / 변경
  const handleCompanyChange = async (user: User) => {
    setError(null);

    const current = user.companyName ?? "";
    const input = window.prompt(
      `회사명(화주명)을 입력하세요.\n값을 지우면 회사 연결이 해제됩니다.`,
      current
    );
    if (input === null) return; // 취소

    const trimmed = input.trim();
    const value = trimmed === "" ? null : trimmed;

    try {
      setSavingId(user.id);
      const updated = await changeUserCompany(user.id, value);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === updated.id ? { ...u, companyName: updated.companyName } : u
        )
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
      <h2 style={{ fontSize: 18, marginBottom: 4 }}>
        사용자 관리 (ADMIN 전용)
      </h2>
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
            onCompanyChange={handleCompanyChange}
          />
        </>
      )}
    </div>
  );
}
