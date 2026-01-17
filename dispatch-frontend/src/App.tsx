// src/App.tsx
import { useState } from "react";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";
import { AddressBookPage } from "./AddressBookPage";
import { LoginPanel } from "./LoginPanel";
import type { AuthUser } from "./LoginPanel";
import { ProfilePage } from "./ProfilePage";
import { AdminUsersPage } from "./AdminUsersPage";


type Tab = "form" | "list" | "addressBook" | "profile" | "users";

function App() {
  const [tab, setTab] = useState<Tab>("form");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* 상단 로그인 영역 */}
      <LoginPanel
        currentUser={currentUser}
        onLogin={(user) => setCurrentUser(user)}
        onLogout={() => {
          setCurrentUser(null);
          setTab("form"); // 로그아웃 시 기본 탭으로
        }}
        onClickProfile={() => setTab("profile")} // ✅ 내 정보 버튼 → 프로필 탭으로
      />

      {/* 로그인 안 되어 있으면 안내 */}
      {!currentUser && (
        <div style={{ padding: 16 }}>
          <p style={{ color: "#555" }}>
            위에서 로그인하면 배차 요청 테스트 폼, 배차 내역 리스트, 주소록, 내 정보를
            사용할 수 있습니다.
          </p>
        </div>
      )}

      {/* 로그인 된 상태에서만 탭 + 내용 표시 */}
      {currentUser && (
        <>
          {/* 상단 탭 (내 정보는 여기 X, 로그인바에서 진입) */}
          <div
            style={{
              display: "flex",
              gap: 8,
              padding: 16,
              borderBottom: "1px solid #ddd",
              marginBottom: 16,
            }}
          >
            <button
              onClick={() => setTab("form")}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: tab === "form" ? "#333" : "#fff",
                color: tab === "form" ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              배차 요청 테스트 폼
            </button>
            <button
              onClick={() => setTab("list")}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: tab === "list" ? "#333" : "#fff",
                color: tab === "list" ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              배차내역 리스트
            </button>
            <button
              onClick={() => setTab("addressBook")}
              style={{
                padding: "8px 16px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor:
                  tab === "addressBook" ? "#333" : "#fff",
                color: tab === "addressBook" ? "#fff" : "#333",
                cursor: "pointer",
              }}
            >
              주소록
            </button>

            {/* ✅ ADMIN 전용: 사용자 관리 탭 (오른쪽 끝으로 밀기 원하면 marginLeft: 'auto') */}
            {currentUser.role === "ADMIN" && (
              <button
                onClick={() => setTab("users")}
                style={{
                  marginLeft: "auto",
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  backgroundColor:
                    tab === "users" ? "#333" : "#fff",
                  color: tab === "users" ? "#fff" : "#333",
                  cursor: "pointer",
                }}
              >
                사용자 관리(ADMIN)
              </button>
            )}
          </div>

          {/* 탭별 내용 */}
          {tab === "form" && <RequestForm />}
          {tab === "list" && <RequestList />}
          {tab === "addressBook" && currentUser && (
            <AddressBookPage currentUser={currentUser} />
          )}

          {/* ✅ 내 정보 */}
          {tab === "profile" && (
            <ProfilePage
              currentUser={currentUser}
              onUserUpdate={(user) => setCurrentUser(user)}
            />
          )}

          {/* ✅ 사용자 관리 (ADMIN 전용) */}
          {tab === "users" && currentUser.role === "ADMIN" && (
            <AdminUsersPage />
          )}
        </>
      )}
    </div>
  );
}

export default App;