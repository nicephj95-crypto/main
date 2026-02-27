// src/components/SignupModal.tsx
import { useState } from "react";
import { signup } from "../api/client";

type Props = {
  open: boolean;
  initialEmail: string;
  initialPassword: string;
  onClose: () => void;
  onSuccess: (email: string, password: string, message: string) => void;
};

export function SignupModal({
  open,
  initialEmail,
  initialPassword,
  onClose,
  onSuccess,
}: Props) {
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState(initialEmail);
  const [signupPassword, setSignupPassword] = useState(initialPassword);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  if (!open) return null;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);

    if (!signupName.trim()) {
      setSignupError("이름을 입력해주세요.");
      return;
    }

    setSignupLoading(true);
    try {
      const res = await signup({
        name: signupName.trim(),
        email: signupEmail,
        password: signupPassword,
      });

      onSuccess(
        signupEmail,
        signupPassword,
        res.message || "회원가입 요청이 접수되었습니다. 관리자 승인 후 로그인해 주세요."
      );

      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      onClose();
    } catch (err: any) {
      console.error(err);
      setSignupError(err?.message || "회원가입 중 오류가 발생했습니다.");
    } finally {
      setSignupLoading(false);
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

        <form
          onSubmit={handleSignup}
          style={{ display: "grid", gap: 8, fontSize: 13 }}
        >
          <input
            type="text"
            value={signupName}
            onChange={(e) => setSignupName(e.target.value)}
            placeholder="이름"
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <input
            type="email"
            value={signupEmail}
            onChange={(e) => setSignupEmail(e.target.value)}
            placeholder="이메일"
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <input
            type="password"
            value={signupPassword}
            onChange={(e) => setSignupPassword(e.target.value)}
            placeholder="비밀번호 (8자 이상)"
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc" }}
          />

          {signupError && (
            <div style={{ color: "red", fontSize: 12, marginTop: 4 }}>
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
              onClick={onClose}
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
  );
}
