// src/LoginPanel.tsx
import { useState } from "react";
import {
  login,
  setAuthToken,
  clearAuthToken,
  changePassword,
} from "./api/client";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface LoginPanelProps {
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
}

export function LoginPanel({
  currentUser,
  onLogin,
  onLogout,
}: LoginPanelProps) {
  const [email, setEmail] = useState("login-test@example.com");
  const [password, setPassword] = useState("NewPassword123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔹 비밀번호 변경 관련 상태
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [changePwLoading, setChangePwLoading] = useState(false);
  const [changePwMessage, setChangePwMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const res = await login({ email, password });
      setAuthToken(res.token);
      onLogin(res.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthToken();
    onLogout();
    setShowChangePw(false);
    setCurrentPw("");
    setNewPw("");
    setNewPwConfirm("");
    setChangePwMessage(null);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePwMessage(null);

    if (!currentPw || !newPw || !newPwConfirm) {
      setChangePwMessage("현재 비밀번호와 새 비밀번호를 모두 입력해주세요.");
      return;
    }

    if (newPw !== newPwConfirm) {
      setChangePwMessage("새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setChangePwLoading(true);

    try {
      const res = await changePassword(currentPw, newPw);
      setChangePwMessage(res.message || "비밀번호가 변경되었습니다.");
      // 필드 초기화
      setCurrentPw("");
      setNewPw("");
      setNewPwConfirm("");
    } catch (err: any) {
      console.error(err);
      setChangePwMessage(err.message ?? "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setChangePwLoading(false);
    }
  };

  // 🔹 이미 로그인 된 상태
  if (currentUser) {
    return (
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid #eee",
          backgroundColor: "#fafafa",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 14, color: "#555" }}>로그인됨</div>
            <div style={{ fontWeight: "bold" }}>
              {currentUser.name} ({currentUser.email})
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setShowChangePw((prev) => !prev)}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              비밀번호 변경
            </button>
            <button
              onClick={handleLogout}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* 🔹 비밀번호 변경 폼 (토글) */}
        {showChangePw && (
          <form
            onSubmit={handleChangePassword}
            style={{
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              maxWidth: 400,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 4 }}>
              비밀번호 변경
            </div>
            <input
              type="password"
              value={currentPw}
              placeholder="현재 비밀번호"
              onChange={(e) => setCurrentPw(e.target.value)}
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              type="password"
              value={newPw}
              placeholder="새 비밀번호"
              onChange={(e) => setNewPw(e.target.value)}
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              type="password"
              value={newPwConfirm}
              placeholder="새 비밀번호 확인"
              onChange={(e) => setNewPwConfirm(e.target.value)}
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <button
              type="submit"
              disabled={changePwLoading}
              style={{
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid #333",
                backgroundColor: "#333",
                color: "#fff",
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              {changePwLoading ? "변경 중..." : "비밀번호 변경하기"}
            </button>
            {changePwMessage && (
              <span
                style={{
                  color: changePwMessage.includes("성공") ? "green" : "red",
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                {changePwMessage}
              </span>
            )}
          </form>
        )}
      </div>
    );
  }

  // 🔹 로그인 폼 (로그아웃 상태)
  return (
    <div
      style={{
        padding: 16,
        borderBottom: "1px solid #eee",
        backgroundColor: "#fafafa",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <strong>로그인</strong>
        <input
          type="email"
          value={email}
          placeholder="이메일"
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <input
          type="password"
          value={password}
          placeholder="비밀번호"
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "6px 12px",
            borderRadius: 4,
            border: "1px solid #333",
            backgroundColor: "#333",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
        {error && (
          <span style={{ color: "red", fontSize: 12, marginLeft: 8 }}>
            {error}
          </span>
        )}
      </form>
    </div>
  );
}