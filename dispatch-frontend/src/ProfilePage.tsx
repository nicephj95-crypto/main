// src/ProfilePage.tsx
import { useState } from "react";
import type { AuthUser } from "./LoginPanel";
import { updateProfile, changePassword } from "./api/client";

interface ProfilePageProps {
  currentUser: AuthUser;
  onUserUpdate: (user: AuthUser) => void;
}

export function ProfilePage({ currentUser, onUserUpdate }: ProfilePageProps) {
  // 이름 수정
  const [name, setName] = useState(currentUser.name);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 비밀번호 변경 모달 상태
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwMessage, setPwMessage] = useState<string | null>(null);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileError("이름은 비워둘 수 없습니다.");
      return;
    }
    setProfileError(null);
    setProfileMessage(null);
    setSavingProfile(true);

    try {
      const res = await updateProfile({ name: name.trim() });

      // 백엔드 응답 형태에 따라 user가 있으면 그걸 쓰고,
      // 아니면 기존 currentUser에 name만 교체
      const updatedUser: AuthUser =
        (res as any).user ?? { ...currentUser, name: name.trim() };

      onUserUpdate(updatedUser);
      setProfileMessage("프로필이 저장되었습니다.");
    } catch (err: any) {
      console.error(err);
      setProfileError(err?.message || "프로필 저장 중 오류가 발생했습니다.");
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordModal = () => {
    setPwError(null);
    setPwMessage(null);
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwMessage(null);

    if (!currentPassword || !newPassword || !newPasswordConfirm) {
      setPwError("모든 비밀번호 입력란을 채워주세요.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setPwError("새 비밀번호와 확인 비밀번호가 일치하지 않습니다.");
      return;
    }

    setPwLoading(true);

    try {
      const res = await changePassword(currentPassword, newPassword);
      setPwMessage(res.message || "비밀번호가 변경되었습니다.");
      // 성공 후 모달 닫고 싶으면:
      // setShowPasswordModal(false);
    } catch (err: any) {
      console.error(err);
      setPwError(err?.message || "비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <section
        style={{
          maxWidth: 480,
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 16,
          backgroundColor: "#fff",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 16,
            marginBottom: 12,
          }}
        >
          내 정보
        </div>

        {/* 이메일 (수정 불가) */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
            이메일
          </div>
          <input
            type="email"
            value={currentUser.email}
            readOnly
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
            }}
          />
        </div>

        {/* 이름 수정 가능 */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
            이름
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
        </div>

        {/* 권한 (readonly) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 4 }}>
            권한
          </div>
          <input
            type="text"
            value={currentUser.role}
            readOnly
            style={{
              width: "100%",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              backgroundColor: "#f5f5f5",
            }}
          />
        </div>

        {/* 프로필 저장 + 비밀번호 변경 버튼 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={savingProfile}
            style={{
              padding: "8px 14px",
              borderRadius: 4,
              border: "1px solid #333",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {savingProfile ? "저장 중..." : "내 정보 저장"}
          </button>

          <button
            type="button"
            onClick={openPasswordModal}
            style={{
              padding: "8px 14px",
              borderRadius: 4,
              border: "1px solid #888",
              backgroundColor: "#fff",
              color: "#333",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            비밀번호 변경
          </button>
        </div>

        {profileMessage && (
          <p style={{ fontSize: 12, color: "#0070c9", marginTop: 4 }}>
            {profileMessage}
          </p>
        )}
        {profileError && (
          <p style={{ fontSize: 12, color: "red", marginTop: 4 }}>
            {profileError}
          </p>
        )}
      </section>

      {/* 비밀번호 변경 모달 */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              width: 360,
              maxWidth: "90%",
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                marginBottom: 12,
              }}
            >
              비밀번호 변경
            </div>

            <form
              onSubmit={handleChangePassword}
              style={{ display: "grid", gap: 8, fontSize: 13 }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#555",
                    marginBottom: 4,
                  }}
                >
                  현재 비밀번호
                </div>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#555",
                    marginBottom: 4,
                  }}
                >
                  새 비밀번호
                </div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "#555",
                    marginBottom: 4,
                  }}
                >
                  새 비밀번호 확인
                </div>
                <input
                  type="password"
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  style={{
                    width: "100%",
                    padding: 8,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              {pwError && (
                <p style={{ fontSize: 12, color: "red", marginTop: 4 }}>
                  {pwError}
                </p>
              )}
              {pwMessage && (
                <p style={{ fontSize: 12, color: "#0070c9", marginTop: 4 }}>
                  {pwMessage}
                </p>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  onClick={closePasswordModal}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 4,
                    border: "1px solid #ccc",
                    backgroundColor: "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={pwLoading}
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
                  {pwLoading ? "변경 중..." : "변경하기"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}