// src/components/AdminUsersTable.tsx
import type { User, UserRole } from "../api/types";

type Props = {
  users: User[];
  savingId: number | null;
  onRoleChange: (userId: number, newRole: UserRole) => void;
  onCompanyChange: (user: User) => void;
};

export function AdminUsersTable({
  users,
  savingId,
  onRoleChange,
  onCompanyChange,
}: Props) {
  return (
    <section>
      <h3 style={{ fontSize: 15, marginTop: 0, marginBottom: 8 }}>
        사용자 목록
      </h3>

      {users.length === 0 ? (
        <p style={{ fontSize: 13, color: "#777" }}>
          아직 등록된 사용자가 없습니다.
        </p>
      ) : (
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              {["ID", "이름", "이메일", "권한(Role)", "회사(화주)"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    borderBottom: "1px solid #eee",
                    padding: "6px 4px",
                  }}
                >
                  {h}
                </th>
              ))}
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
                    onChange={(e) => onRoleChange(u.id, e.target.value as UserRole)}
                    style={{
                      padding: 4,
                      borderRadius: 4,
                      border: "1px solid #ccc",
                      fontSize: 12,
                    }}
                  >
                    <option value="CLIENT">CLIENT (서비스 이용자)</option>
                    <option value="DISPATCHER">DISPATCHER (직원)</option>
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
                    onClick={() => onCompanyChange(u)}
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
    </section>
  );
}
