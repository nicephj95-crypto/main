// src/LoginPanel.tsx
import { useState } from "react";
import { login, signup, setAuthSession, setStoredAuthUser, logout } from "./api/client";
import { PasswordResetModal } from "./components/PasswordResetModal";
import { formatPhoneNumber } from "./utils/phoneFormat";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  companyName?: string | null;
  showQuotedPrice?: boolean;
}

interface LoginPanelProps {
  currentUser: AuthUser | null;
  onLogin: (user: AuthUser) => void;
  onLogout: () => void;
  onClickProfile: () => void;
  onClose?: () => void;
}

type LoginErrors = {
  loginId: boolean;
  loginPassword: boolean;
  joinName: boolean;
  joinId: boolean;
  joinPassword: boolean;
  joinPasswordConfirm: boolean;
  joinPhone: boolean;
};

const EMPTY_ERRORS: LoginErrors = {
  loginId: false,
  loginPassword: false,
  joinName: false,
  joinId: false,
  joinPassword: false,
  joinPasswordConfirm: false,
  joinPhone: false,
};

export function LoginPanel({
  currentUser,
  onLogin,
  onLogout,
  onClickProfile,
  onClose,
}: LoginPanelProps) {
  const [tab, setTab] = useState<"login" | "join">("login");

  const [loginId, setLoginId] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const [joinName, setJoinName] = useState("");
  const [joinId, setJoinId] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [joinPasswordConfirm, setJoinPasswordConfirm] = useState("");
  const [joinPhone, setJoinPhone] = useState("");

  const [errors, setErrors] = useState<LoginErrors>(EMPTY_ERRORS);
  const [loginLoading, setLoginLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [passwordResetOpen, setPasswordResetOpen] = useState(false);

  const handleTabChange = (next: "login" | "join") => {
    setTab(next);
    setErrors(EMPTY_ERRORS);
    setServerError(null);
    setInfoMessage(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setInfoMessage(null);

    const nextErrors: LoginErrors = {
      ...errors,
      loginId: !loginId.trim(),
      loginPassword: !loginPassword.trim(),
    };
    setErrors(nextErrors);
    if (nextErrors.loginId || nextErrors.loginPassword) return;

    setLoginLoading(true);
    try {
      const res = await login({ email: loginId, password: loginPassword });
      setAuthSession(res.token);
      setStoredAuthUser(res.user);
      onLogin(res.user);
    } catch (err: any) {
      setServerError(err?.message || "로그인 중 오류가 발생했습니다.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setInfoMessage(null);

    const nextErrors: LoginErrors = {
      ...errors,
      joinName: !joinName.trim(),
      joinId: !joinId.trim(),
      joinPassword: !joinPassword.trim(),
      joinPasswordConfirm: !joinPasswordConfirm.trim(),
      joinPhone: !joinPhone.trim(),
    };
    setErrors(nextErrors);
    if (
      nextErrors.joinName ||
      nextErrors.joinId ||
      nextErrors.joinPassword ||
      nextErrors.joinPasswordConfirm ||
      nextErrors.joinPhone
    ) return;

    if (joinPassword !== joinPasswordConfirm) {
      setServerError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setJoinLoading(true);
    try {
      const res = await signup({
        name: joinName.trim(),
        email: joinId.trim(),
        password: joinPassword,
      });
      setInfoMessage(
        res.message || "회원가입 요청이 접수되었습니다. 관리자 승인 후 로그인해 주세요."
      );
      setLoginId(joinId.trim());
      setLoginPassword(joinPassword);
      setJoinName("");
      setJoinId("");
      setJoinPassword("");
      setJoinPasswordConfirm("");
      setJoinPhone("");
      setTab("login");
    } catch (err: any) {
      setServerError(err?.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setJoinLoading(false);
    }
  };

  if (currentUser) {
    const handleLogoutClick = async () => {
      await logout();
      onLogout();
    };
    return (
      <div className="lm-logged-in">
        <div>
          <div className="lm-logged-kicker">로그인됨</div>
          <div className="lm-logged-name">
            {currentUser.name} ({currentUser.email})
          </div>
          <div className="lm-logged-role">역할: {currentUser.role}</div>
        </div>
        <div className="lm-logged-actions">
          <button type="button" className="lm-secondary-btn" onClick={onClickProfile}>
            내 정보
          </button>
          <button type="button" className="lm-secondary-btn" onClick={handleLogoutClick}>
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  const inputClass = (hasError: boolean) =>
    `lm-input${hasError ? " has-error" : ""}`;

  return (
    <>
      <div
        className={onClose ? "lm-backdrop" : "lm-screen"}
        onClick={onClose}
      >
        <div className="lm-panel" onClick={(e) => e.stopPropagation()}>
          {onClose && (
            <div className="lm-header">
              <button
                type="button"
                className="lm-close"
                aria-label="닫기"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          )}

          <div className="lm-tabs">
            <button
              type="button"
              className={`lm-tab${tab === "login" ? " is-active" : ""}`}
              onClick={() => handleTabChange("login")}
            >
              로그인
            </button>
            <button
              type="button"
              className={`lm-tab${tab === "join" ? " is-active" : ""}`}
              onClick={() => handleTabChange("join")}
            >
              회원가입
            </button>
          </div>

          {tab === "login" ? (
            <form className="lm-form" onSubmit={handleLoginSubmit}>
              <input
                className={inputClass(errors.loginId)}
                type="text"
                placeholder="아이디 (이메일)"
                value={loginId}
                onChange={(e) => {
                  setLoginId(e.target.value);
                  if (errors.loginId) setErrors({ ...errors, loginId: false });
                }}
                autoComplete="username"
              />
              <input
                className={inputClass(errors.loginPassword)}
                type="password"
                placeholder="비밀번호"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  if (errors.loginPassword) setErrors({ ...errors, loginPassword: false });
                }}
                autoComplete="current-password"
              />

              {serverError && <p className="lm-server-error">{serverError}</p>}
              {infoMessage && <p className="lm-server-info">{infoMessage}</p>}

              <button type="submit" className="lm-primary-btn" disabled={loginLoading}>
                {loginLoading ? "로그인 중..." : "로그인"}
              </button>

              <button
                type="button"
                className="lm-link-btn"
                onClick={() => setPasswordResetOpen(true)}
              >
                아이디 / 비밀번호 찾기
              </button>
            </form>
          ) : (
            <form className="lm-form" onSubmit={handleJoinSubmit}>
              <input
                className={inputClass(errors.joinName)}
                type="text"
                placeholder="담당자명"
                value={joinName}
                onChange={(e) => {
                  setJoinName(e.target.value);
                  if (errors.joinName) setErrors({ ...errors, joinName: false });
                }}
              />
              <input
                className={inputClass(errors.joinId)}
                type="text"
                placeholder="아이디 (이메일)"
                value={joinId}
                onChange={(e) => {
                  setJoinId(e.target.value);
                  if (errors.joinId) setErrors({ ...errors, joinId: false });
                }}
              />
              <input
                className={inputClass(errors.joinPassword)}
                type="password"
                placeholder="비밀번호"
                value={joinPassword}
                onChange={(e) => {
                  setJoinPassword(e.target.value);
                  if (errors.joinPassword) setErrors({ ...errors, joinPassword: false });
                }}
              />
              <input
                className={inputClass(errors.joinPasswordConfirm)}
                type="password"
                placeholder="비밀번호 확인"
                value={joinPasswordConfirm}
                onChange={(e) => {
                  setJoinPasswordConfirm(e.target.value);
                  if (errors.joinPasswordConfirm) setErrors({ ...errors, joinPasswordConfirm: false });
                }}
              />
              <input
                className={inputClass(errors.joinPhone)}
                type="text"
                placeholder="연락처"
                value={joinPhone}
                onChange={(e) => {
                  setJoinPhone(formatPhoneNumber(e.target.value));
                  if (errors.joinPhone) setErrors({ ...errors, joinPhone: false });
                }}
              />

              {serverError && <p className="lm-server-error">{serverError}</p>}

              <button type="submit" className="lm-primary-btn" disabled={joinLoading}>
                {joinLoading ? "가입 중..." : "회원가입"}
              </button>
            </form>
          )}
        </div>
      </div>

      <PasswordResetModal
        open={passwordResetOpen}
        initialEmail={loginId}
        onClose={() => setPasswordResetOpen(false)}
      />
    </>
  );
}
