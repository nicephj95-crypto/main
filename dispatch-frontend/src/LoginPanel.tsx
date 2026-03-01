// src/LoginPanel.tsx
import { useState } from "react";
import { login, setAuthSession, setStoredAuthUser, logout } from "./api/client";
import { SignupModal } from "./components/SignupModal";
import { PasswordResetModal } from "./components/PasswordResetModal";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  companyName?: string | null;
}

interface LoginPanelProps {
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
  onClickProfile: () => void;
}

export function LoginPanel({
  currentUser,
  onLogin,
  onLogout,
  onClickProfile,
}: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);

  const [signupOpen, setSignupOpen] = useState(false);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    onLogout();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await login({ email, password });
      setAuthSession(res.token);
      setStoredAuthUser(res.user);
      onLogin(res.user);
    } catch (err: any) {
      console.error(err);
      setLoginError(err?.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoginLoading(false);
    }
  };

  // ───────────────── 로그인된 상태 UI ─────────────────
  if (currentUser) {
    return (
      <div
        style={{
          padding: 16,
          borderBottom: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#fafafa",
        }}
      >
        <div>
          <div style={{ fontSize: 14, color: "#555" }}>로그인됨</div>
          <div style={{ fontWeight: "bold" }}>
            {currentUser.name} ({currentUser.email})
          </div>
          <div style={{ fontSize: 12, color: "#777", marginTop: 4 }}>
            역할: {currentUser.role}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={onClickProfile}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            내 정보
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  // ───────────────── 로그인 폼 + 모달들 ─────────────────
  return (
    <>
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
            disabled={loginLoading}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #333",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            {loginLoading ? "로그인 중..." : "로그인"}
          </button>

          <button
            type="button"
            onClick={() => {
              setSignupOpen(true);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: 13,
              marginLeft: 8,
            }}
          >
            회원가입
          </button>
          <button
            type="button"
            onClick={() => {
              setPasswordResetOpen(true);
            }}
            style={{
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            비밀번호 재설정
          </button>

          {loginError && (
            <span style={{ color: "red", fontSize: 12, marginLeft: 8 }}>
              {loginError}
            </span>
          )}
          {signupMessage && (
            <span style={{ color: "#0070c9", fontSize: 12, marginLeft: 8 }}>
              {signupMessage}
            </span>
          )}
        </form>
      </div>

      <SignupModal
        open={signupOpen}
        initialEmail={email}
        initialPassword={password}
        onClose={() => setSignupOpen(false)}
        onSuccess={(signupEmail, signupPassword, message) => {
          setEmail(signupEmail);
          setPassword(signupPassword);
          setSignupMessage(message);
        }}
      />

      <PasswordResetModal
        open={passwordResetOpen}
        initialEmail={email}
        onClose={() => setPasswordResetOpen(false)}
      />
    </>
  );
}
