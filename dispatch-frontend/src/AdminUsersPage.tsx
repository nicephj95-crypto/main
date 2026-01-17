// src/AdminUsersPage.tsx
import { useEffect, useState } from "react";
import { listUsers, changeUserRole, changeUserCompany } from "./api/client";
import type { User, UserRole } from "./api/types";

export function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "사용자 목록을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
      ) : users.length === 0 ? (
        <p style={{ fontSize: 13, color: "#777" }}>
          아직 등록된 사용자가 없습니다.
        </p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #eee",
                  padding: "6px 4px",
                }}
              >
                ID
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #eee",
                  padding: "6px 4px",
                }}
              >
                이름
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #eee",
                  padding: "6px 4px",
                }}
              >
                이메일
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #eee",
                  padding: "6px 4px",
                }}
              >
                권한(Role)
              </th>
              <th
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid #eee",
                  padding: "6px 4px",
                }}
              >
                회사(화주)
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #f3f3f3",
                    width: 60,
                  }}
                >
                  {u.id}
                </td>
                <td
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #f3f3f3",
                    width: 120,
                  }}
                >
                  {u.name}
                </td>
                <td
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #f3f3f3",
                  }}
                >
                  {u.email}
                </td>
                <td
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #f3f3f3",
                    width: 190,
                  }}
                >
                  <select
                    value={u.role}
                    disabled={savingId === u.id}
                    onChange={(e) =>
                      handleRoleChange(u.id, e.target.value as UserRole)
                    }
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      fontSize: 12,
                    }}
                  >
                    <option value="CLIENT">CLIENT (서비스 이용자)</option>
                    <option value="DISPATCHER">
                      DISPATCHER (직원)
                    </option>
                    <option value="ADMIN">ADMIN (마스터)</option>
                  </select>
                </td>
                <td
                  style={{
                    padding: "6px 4px",
                    borderBottom: "1px solid #f3f3f3",
                    width: 220,
                  }}
                >
                  <div style={{ marginBottom: 4 }}>
                    {u.companyName ? (
                      <span>{u.companyName}</span>
                    ) : (
                      <span style={{ color: "#999" }}>미설정</span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={savingId === u.id}
                    onClick={() => handleCompanyChange(u)}
                    style={{
                      padding: "4px 8px",
                      fontSize: 12,
                      borderRadius: 4,
                      border: "1px solid #333",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    회사 설정
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}