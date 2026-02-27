// src/components/PasswordResetModal.tsx
import { useState } from "react";
import { requestPasswordReset, confirmPasswordReset } from "../api/client";

type Props = {
  open: boolean;
  initialEmail: string;
  onClose: () => void;
};

export function PasswordResetModal({ open, initialEmail, onClose }: Props) {
  const [resetEmail, setResetEmail] = useState(initialEmail);
  const [resetToken, setResetToken] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [resetNewPasswordConfirm, setResetNewPasswordConfirm] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleRequestPasswordReset = async () => {
    setResetError(null);
    setResetMessage(null);
    if (!resetEmail.trim()) {
      setResetError("이메일을 입력해주세요.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await requestPasswordReset(resetEmail.trim());
      setResetMessage(
        `${res.message} (현재 개발/테스트 메일 설정에서는 개발자(Resend 계정) 이메일로만 확인 메일이 전송될 수 있습니다. 필요하면 서버 콘솔의 token 로그를 확인하세요.)`
      );
    } catch (err: any) {
      console.error(err);
      setResetError(err?.message || "비밀번호 재설정 요청 중 오류가 발생했습니다.");
    } finally {
      setResetLoading(false);
    }
  };

  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetMessage(null);

    if (!resetToken.trim() || !resetNewPassword.trim()) {
      setResetError("토큰과 새 비밀번호를 입력해주세요.");
      return;
    }
    if (resetNewPassword !== resetNewPasswordConfirm) {
      setResetError("새 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setResetLoading(true);
    try {
      const res = await confirmPasswordReset(resetToken.trim(), resetNewPassword);
      setResetMessage(res.message);
      setResetToken("");
      setResetNewPassword("");
      setResetNewPasswordConfirm("");
    } catch (err: any) {
      console.error(err);
      setResetError(err?.message || "비밀번호 재설정 중 오류가 발생했습니다.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
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
          width: 420,
          maxWidth: "92%",
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
          <h3 style={{ margin: 0, fontSize: 16 }}>비밀번호 재설정</h3>
          <button
            type="button"
            onClick={onClose}
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

        <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
          <div style={{ fontWeight: 600 }}>1) 재설정 토큰 요청</div>
          <input
            type="email"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            placeholder="이메일"
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <button
            type="button"
            disabled={resetLoading}
            onClick={handleRequestPasswordReset}
            style={{
              justifySelf: "start",
              padding: "6px 10px",
              borderRadius: 4,
              border: "1px solid #333",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            토큰 요청
          </button>

          <hr style={{ width: "100%", border: "none", borderTop: "1px solid #eee" }} />

          <form
            onSubmit={handleConfirmPasswordReset}
            style={{ display: "grid", gap: 8, fontSize: 13 }}
          >
            <div style={{ fontWeight: 600 }}>2) 토큰으로 비밀번호 변경</div>
            <input
              type="text"
              value={resetToken}
              onChange={(e) => setResetToken(e.target.value)}
              placeholder="재설정 토큰"
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              type="password"
              value={resetNewPassword}
              onChange={(e) => setResetNewPassword(e.target.value)}
              placeholder="새 비밀번호 (8자 이상)"
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <input
              type="password"
              value={resetNewPasswordConfirm}
              onChange={(e) => setResetNewPasswordConfirm(e.target.value)}
              placeholder="새 비밀번호 확인"
              style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
            />
            <button
              type="submit"
              disabled={resetLoading}
              style={{
                justifySelf: "start",
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid #333",
                backgroundColor: "#333",
                color: "#fff",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              비밀번호 변경
            </button>
          </form>

          {resetError && (
            <div style={{ color: "red", fontSize: 12 }}>{resetError}</div>
          )}
          {resetMessage && (
            <div style={{ color: "#0070c9", fontSize: 12 }}>{resetMessage}</div>
          )}
        </div>
      </div>
    </div>
  );
}
