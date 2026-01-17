// src/UserProfilePanel.tsx
import { useState } from "react";
import type { AuthUser } from "./LoginPanel";
import { changePassword } from "./api/client";

interface UserProfilePanelProps {
  currentUser: AuthUser;
  // 지금은 안 쓰지만, 나중에 이름/이메일 수정할 때 쓸 수 있음
  onUserUpdate?: (user: AuthUser) => void;
}

export function UserProfilePanel({
  currentUser,
}: UserProfilePanelProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setError("현재 비밀번호와 새 비밀번호를 모두 입력해 주세요.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      setMessage(res.message || "비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        padding: 16,
        display: "grid",
        gridTemplateColumns: "1.1fr 1.3fr",
        gap: 16,
      }}
    >
      {/* 왼쪽: 기본 정보 */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            marginBottom: 12,
            fontSize: 15,
          }}
        >
          내 정보
        </div>

        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div>
            <div style={{ fontSize: 12, color: "#777" }}>이름</div>
            <div style={{ fontWeight: 500 }}>{currentUser.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#777" }}>이메일</div>
            <div style={{ fontWeight: 500 }}>{currentUser.email}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#777" }}>권한</div>
            <div>{currentUser.role}</div>
          </div>
        </div>

        <p
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "#888",
            lineHeight: 1.5,
          }}
        >
          * 이름/이메일 수정 기능은 나중에 백엔드 API가 준비되면
          여기에서 함께 수정할 수 있도록 확장할 수 있습니다.
        </p>
      </section>

      {/* 오른쪽: 비밀번호 변경 */}
      <section
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            marginBottom: 12,
            fontSize: 15,
          }}
        >
          비밀번호 변경
        </div>

        <form
          onSubmit={handleChangePassword}
          style={{ display: "grid", gap: 8, fontSize: 13 }}
        >
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            style={{
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호"
            style={{
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            placeholder="새 비밀번호 확인"
            style={{
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "8px 12px",
              borderRadius: 4,
              border: "1px solid #333",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {loading ? "변경 중..." : "비밀번호 변경"}
          </button>

          {message && (
            <p
              style={{
                marginTop: 4,
                color: "#0070c9",
                fontSize: 12,
              }}
            >
              {message}
            </p>
          )}
          {error && (
            <p
              style={{
                marginTop: 4,
                color: "red",
                fontSize: 12,
              }}
            >
              {error}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}