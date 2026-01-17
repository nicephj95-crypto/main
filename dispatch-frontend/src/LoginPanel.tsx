// src/LoginPanel.tsx
import { useState } from "react";
import {
  login,
  signup,
  setAuthToken,
  clearAuthToken,
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
  onClickProfile: () => void;
}

export function LoginPanel({
  currentUser,
  onLogin,
  onLogout,
  onClickProfile,
}: LoginPanelProps) {
  // 🔹 로그인용 상태
  const [email, setEmail] = useState("login-test@example.com");
  const [password, setPassword] = useState("NewPassword123!");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 🔹 회원가입 모달용 상태
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupMessage, setSignupMessage] = useState<string | null>(null);

  const handleLogout = () => {
    clearAuthToken();
    onLogout();
  };

  // ───────────────── 로그인 처리 ─────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);

    try {
      const res = await login({ email, password });
      setAuthToken(res.token);
      onLogin(res.user);
    } catch (err: any) {
      console.error(err);
      setLoginError(
        err?.message || "로그인 중 오류가 발생했습니다."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  // ───────────────── 회원가입 처리 (모달 안) ─────────────────
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    setSignupMessage(null);

    if (!signupName.trim()) {
      setSignupError("이름을 입력해주세요.");
      return;
    }

    setSignupLoading(true);
    try {
      await signup({
        name: signupName.trim(),
        email: signupEmail,
        password: signupPassword,
      });

      // 🔹 성공 시: 로그인 폼에 값 채워 넣고, 안내메시지 보여준 뒤 모달 닫기
      setEmail(signupEmail);
      setPassword(signupPassword);
      setSignupMessage("회원가입이 완료되었습니다. 이제 로그인해 주세요.");

      // 폼 리셋 + 모달 닫기
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupOpen(false);
    } catch (err: any) {
      console.error(err);
      setSignupError(
        err?.message || "회원가입 중 오류가 발생했습니다."
      );
    } finally {
      setSignupLoading(false);
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

  // ───────────────── 로그인 폼 + 회원가입 모달 ─────────────────
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
            style={{
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <input
            type="password"
            value={password}
            placeholder="비밀번호"
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
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

          {/* 오른쪽에 회원가입 버튼 */}
          <button
            type="button"
            onClick={() => {
              setSignupOpen(true);
              setSignupError(null);
              setSignupMessage(null);
              // 기본값: 로그인 폼에 적은 이메일/비번 가져와도 됨
              setSignupEmail(email);
              setSignupPassword(password);
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

          {loginError && (
            <span
              style={{
                color: "red",
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              {loginError}
            </span>
          )}
          {signupMessage && (
            <span
              style={{
                color: "#0070c9",
                fontSize: 12,
                marginLeft: 8,
              }}
            >
              {signupMessage}
            </span>
          )}
        </form>
      </div>

      {/* 🔹 회원가입 모달 */}
      {signupOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: 20,
              width: 360,
              maxWidth: "90%",
              boxShadow: "0 8px 20px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>회원가입</h3>
              <button
                type="button"
                onClick={() => setSignupOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSignup}
              style={{ display: "grid", gap: 8, fontSize: 13 }}
            >
              <input
                type="text"
                value={signupName}
                onChange={(e) => setSignupName(e.target.value)}
                placeholder="이름"
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                placeholder="이메일"
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="비밀번호 (8자 이상)"
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />

              {signupError && (
                <div
                  style={{
                    color: "red",
                    fontSize: 12,
                    marginTop: 4,
                  }}
                >
                  {signupError}
                </div>
              )}

              <div
                style={{
                  marginTop: 8,
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setSignupOpen(false)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={signupLoading}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "1px solid #333",
                    backgroundColor: "#333",
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {signupLoading ? "가입 중..." : "가입하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}