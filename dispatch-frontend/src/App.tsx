import { useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { Menu, X } from "lucide-react";
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";
import { AddressBookPage } from "./AddressBookPage";
import { LoginPanel } from "./LoginPanel";
import type { AuthUser } from "./LoginPanel";
import { ProfilePage } from "./ProfilePage";
import { AdminUsersPage } from "./AdminUsersPage";
import { PartnerPage } from "./pages/PartnerPage";
import { ConfirmDialog } from "./components/ConfirmDialog";
import "./pages.css";
import "./styles/dispatch-form.css";
import "./styles/request-form-company.css";
import "./styles/request-list.css";
import "./styles/request-list-controls.css";
import "./styles/addressbook.css";
import { AUTH_SESSION_CLEARED_EVENT, logout, refreshToken } from "./api/client";

type AppShellProps = {
  currentUser: AuthUser | null;
  setCurrentUser: Dispatch<SetStateAction<AuthUser | null>>;
  listReloadKey: number;
  setListReloadKey: Dispatch<SetStateAction<number>>;
};

type RequireAuthProps = {
  currentUser: AuthUser | null;
  children: ReactNode;
  message: string;
};

type RequireRolesProps = {
  currentUser: AuthUser | null;
  allowedRoles: string[];
  children: ReactNode;
};

function isStaffRole(role?: string | null) {
  return role === "ADMIN" || role === "DISPATCHER" || role === "SALES";
}

function menuButtonClass(isActive: boolean) {
  return `page-menu-btn ${isActive ? "active" : ""}`;
}

function RequireAuth({ currentUser, children, message }: RequireAuthProps) {
  if (!currentUser) {
    return <div className="login-hint">{message}</div>;
  }

  return <>{children}</>;
}

function RequireRoles({ currentUser, allowedRoles, children }: RequireRolesProps) {
  if (!currentUser) {
    return <Navigate to="/requests/new" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/requests" replace />;
  }

  return <>{children}</>;
}

function RequestFormRoute({
  currentUser,
  setListReloadKey,
}: {
  currentUser: AuthUser | null;
  setListReloadKey: Dispatch<SetStateAction<number>>;
}) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = searchParams.get("mode");
  const requestIdParam = searchParams.get("requestId");
  const sourceRequestId = requestIdParam ? Number(requestIdParam) : null;
  const hasValidSourceRequestId = Number.isFinite(sourceRequestId);
  const isEditMode = mode === "edit" && hasValidSourceRequestId;
  const isCopyMode = mode === "copy" && hasValidSourceRequestId;

  return (
    <RequestForm
      isAuthenticated={!!currentUser}
      currentUser={currentUser}
      mode={isEditMode ? "edit" : isCopyMode ? "copy" : "create"}
      editRequestId={isEditMode ? Number(sourceRequestId) : null}
      copyRequestId={isCopyMode ? Number(sourceRequestId) : null}
      onRequestCreated={() => setListReloadKey((value) => value + 1)}
      onRequestUpdated={() => {
        setListReloadKey((value) => value + 1);
        navigate("/requests");
      }}
    />
  );
}

function RequestListRoute({
  currentUser,
  reloadTrigger,
}: {
  currentUser: AuthUser | null;
  reloadTrigger: number;
}) {
  const navigate = useNavigate();

  return (
    <RequireAuth currentUser={currentUser} message="배차내역은 로그인 후 사용할 수 있습니다.">
      <RequestList
        currentUser={currentUser}
        reloadTrigger={reloadTrigger}
        onReplayToRequestForm={(requestId) => {
          navigate(`/requests/new?mode=copy&requestId=${requestId}`);
        }}
        onEditRequest={(requestId) => {
          navigate(`/requests/new?mode=edit&requestId=${requestId}`);
        }}
      />
    </RequireAuth>
  );
}

function AddressBookRoute({ currentUser }: { currentUser: AuthUser | null }) {
  return (
    <RequireAuth currentUser={currentUser} message="주소록은 로그인 후 사용할 수 있습니다.">
      <AddressBookPage currentUser={currentUser as AuthUser} />
    </RequireAuth>
  );
}

function ProfileRoute({
  currentUser,
  setCurrentUser,
}: {
  currentUser: AuthUser | null;
  setCurrentUser: Dispatch<SetStateAction<AuthUser | null>>;
}) {
  return (
    <RequireAuth currentUser={currentUser} message="내 정보는 로그인 후 사용할 수 있습니다.">
      <ProfilePage
        currentUser={currentUser as AuthUser}
        onUserUpdate={(user) => setCurrentUser(user)}
      />
    </RequireAuth>
  );
}

function AppShell({
  currentUser,
  setCurrentUser,
  listReloadKey,
  setListReloadKey,
}: AppShellProps) {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const canAccessStaffPages = isStaffRole(currentUser?.role);

  const rootRedirectPath = useMemo(() => "/requests/new", []);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="page-shell">
      <header className="page-top-nav">
        <button
          type="button"
          className="page-logo"
          onClick={() => {
            closeMobileMenu();
            navigate("/requests/new");
          }}
          aria-label="배차접수로 이동"
        >
          BAROO
        </button>

        <nav className={`page-menu ${mobileMenuOpen ? "is-open" : ""}`} aria-label="주요 메뉴">
          <NavLink
            to="/requests/new"
            className={({ isActive }) => menuButtonClass(isActive)}
            onClick={closeMobileMenu}
          >
            배차접수
          </NavLink>
          <NavLink
            to="/requests"
            className={({ isActive }) => menuButtonClass(isActive)}
            onClick={closeMobileMenu}
            end
          >
            배차내역
          </NavLink>
          <NavLink
            to="/address-book"
            className={({ isActive }) => menuButtonClass(isActive)}
            onClick={closeMobileMenu}
          >
            주소록
          </NavLink>
          {canAccessStaffPages && (
            <NavLink
              to="/groups"
              className={({ isActive }) => menuButtonClass(isActive)}
              onClick={closeMobileMenu}
            >
              그룹관리
            </NavLink>
          )}
          {canAccessStaffPages && (
            <NavLink
              to="/users"
              className={({ isActive }) => menuButtonClass(isActive)}
              onClick={closeMobileMenu}
            >
              유저관리
            </NavLink>
          )}

          {currentUser ? (
            <div className="page-mobile-menu-user">
              <button
                type="button"
                onClick={() => {
                  closeMobileMenu();
                  navigate("/profile");
                }}
              >
                {currentUser.name}
                {currentUser.role === "ADMIN" ? " (관리)" : ""}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setCurrentUser(null);
                  closeMobileMenu();
                  navigate(rootRedirectPath, { replace: true });
                }}
              >
                LOGOUT
              </button>
            </div>
          ) : null}
        </nav>

        <div className="page-user-tools">
          {currentUser ? (
            <>
              <button type="button" onClick={() => navigate("/profile")}>
                {currentUser.name}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  setCurrentUser(null);
                  closeMobileMenu();
                  navigate(rootRedirectPath, { replace: true });
                }}
              >
                LOGOUT
              </button>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="page-mobile-menu-btn"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-expanded={mobileMenuOpen}
          aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
        >
          {mobileMenuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
        </button>
      </header>

      <main className="page-content">
        <Routes>
          <Route path="/" element={<Navigate to={rootRedirectPath} replace />} />
          <Route
            path="/requests/new"
            element={
              <RequestFormRoute
                currentUser={currentUser}
                setListReloadKey={setListReloadKey}
              />
            }
          />
          <Route
            path="/requests"
            element={
              <RequestListRoute
                currentUser={currentUser}
                reloadTrigger={listReloadKey}
              />
            }
          />
          <Route
            path="/address-book"
            element={<AddressBookRoute currentUser={currentUser} />}
          />
          <Route
            path="/profile"
            element={
              <ProfileRoute
                currentUser={currentUser}
                setCurrentUser={setCurrentUser}
              />
            }
          />
          <Route
            path="/groups"
            element={
              <RequireRoles
                currentUser={currentUser}
                allowedRoles={["ADMIN", "DISPATCHER", "SALES"]}
              >
                <PartnerPage currentUser={currentUser} />
              </RequireRoles>
            }
          />
          <Route
            path="/users"
            element={
              <RequireRoles
                currentUser={currentUser}
                allowedRoles={["ADMIN", "DISPATCHER", "SALES"]}
              >
                <AdminUsersPage currentUser={currentUser} />
              </RequireRoles>
            }
          />
          <Route path="*" element={<Navigate to={rootRedirectPath} replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [listReloadKey, setListReloadKey] = useState(0);
  const [authInitializing, setAuthInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      try {
        const res = await refreshToken();
        if (!cancelled) {
          setCurrentUser(res.user);
        }
      } catch {
        if (!cancelled) {
          setCurrentUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthInitializing(false);
        }
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleSessionCleared = () => {
      setCurrentUser(null);
      setAuthInitializing(false);
    };

    window.addEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
    return () => {
      window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, handleSessionCleared);
    };
  }, []);

  if (authInitializing) {
    return <div className="page-shell" />;
  }

  if (!currentUser) {
    return (
      <>
        <div className="auth-page-shell">
          <div className="auth-page-brand">BAROO</div>
          <div className="auth-page-panel">
            <LoginPanel
              currentUser={null}
              onLogin={(user) => {
                setCurrentUser(user);
                navigate("/requests/new", { replace: true });
              }}
              onLogout={() => {
                setCurrentUser(null);
              }}
              onClickProfile={() => {}}
            />
          </div>
        </div>
        <ConfirmDialog />
      </>
    );
  }

  return (
    <>
      <AppShell
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        listReloadKey={listReloadKey}
        setListReloadKey={setListReloadKey}
      />
      <ConfirmDialog />
    </>
  );
}

export default App;
