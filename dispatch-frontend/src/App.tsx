import { useEffect, useState } from "react";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";
import { AddressBookPage } from "./AddressBookPage";
import { LoginPanel } from "./LoginPanel";
import type { AuthUser } from "./LoginPanel";
import { ProfilePage } from "./ProfilePage";
import { AdminUsersPage } from "./AdminUsersPage";
import "./pages.css";
import { getStoredAuthUser, logout, refreshToken } from "./api/client";

type Tab = "form" | "list" | "addressBook" | "profile" | "users";

function App() {
  const [tab, setTab] = useState<Tab>("form");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showAuthPanel, setShowAuthPanel] = useState(false);
  const [reapplyRequestId, setReapplyRequestId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const cachedUser = getStoredAuthUser<AuthUser>();
      if (cachedUser && !cancelled) {
        setCurrentUser(cachedUser);
      }

      try {
        const res = await refreshToken();
        if (!cancelled) {
          setCurrentUser(res.user);
        }
      } catch {
        // refresh token 없거나 만료된 경우:
        // 캐시된 유저가 있으면 UI는 유지하고, 없으면 비로그인 상태 유지
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page-shell">
      <header className="page-top-nav">
        <div className="page-logo">HM'US</div>

        <nav className="page-menu" aria-label="주요 메뉴">
          <button
            type="button"
            className={`page-menu-btn ${tab === "form" ? "active" : ""}`}
            onClick={() => setTab("form")}
          >
            배차접수
          </button>
          <button
            type="button"
            className={`page-menu-btn ${tab === "list" ? "active" : ""}`}
            onClick={() => setTab("list")}
          >
            배차내역
          </button>
          <button
            type="button"
            className={`page-menu-btn ${tab === "addressBook" ? "active" : ""}`}
            onClick={() => setTab("addressBook")}
          >
            주소록
          </button>
          {currentUser?.role === "ADMIN" && (
            <button
              type="button"
              className={`page-menu-btn ${tab === "users" ? "active" : ""}`}
              onClick={() => setTab("users")}
            >
              사용자관리
            </button>
          )}
        </nav>

        <div className="page-user-tools">
          {currentUser ? (
            <>
              <button type="button" onClick={() => setTab("profile")}>
                {currentUser.name}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setCurrentUser(null);
                  setTab("form");
                }}
              >
                LOGOUT
              </button>
            </>
          ) : (
            <button
              type="button"
              className="login-join-btn"
              onClick={() => setShowAuthPanel((prev) => !prev)}
            >
              LOGIN / JOIN US
            </button>
          )}
        </div>
      </header>

      {showAuthPanel && !currentUser && (
        <div className="auth-strip">
          <LoginPanel
            currentUser={currentUser}
            onLogin={(user) => {
              setCurrentUser(user);
              setShowAuthPanel(false);
            }}
            onLogout={() => {
              setCurrentUser(null);
              setTab("form");
            }}
            onClickProfile={() => setTab("profile")}
          />
        </div>
      )}

      <main className="page-content">
        {tab === "form" && (
          <RequestForm
            replayRequestId={reapplyRequestId}
            onReplayRequestHandled={() => setReapplyRequestId(null)}
          />
        )}
        {tab === "list" &&
          (currentUser ? (
            <RequestList
              currentUser={currentUser}
              onReplayToRequestForm={(requestId) => {
                setReapplyRequestId(requestId);
                setTab("form");
              }}
            />
          ) : (
            <div className="login-hint">배차내역은 로그인 후 사용할 수 있습니다.</div>
          ))}
        {tab === "addressBook" &&
          (currentUser ? (
            <AddressBookPage currentUser={currentUser} />
          ) : (
            <div className="login-hint">주소록은 로그인 후 사용할 수 있습니다.</div>
          ))}
        {tab === "profile" &&
          (currentUser ? (
            <ProfilePage
              currentUser={currentUser}
              onUserUpdate={(user) => setCurrentUser(user)}
            />
          ) : (
            <div className="login-hint">내 정보는 로그인 후 사용할 수 있습니다.</div>
          ))}
        {tab === "users" && currentUser?.role === "ADMIN" && <AdminUsersPage />}
      </main>
    </div>
  );
}

export default App;
