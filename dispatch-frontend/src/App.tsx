// src/App.tsx
import { useState } from "react";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";
import { LoginPanel } from "./LoginPanel";
import type { AuthUser } from "./LoginPanel";
import "./App.css";

type Tab = "form" | "list";

function App() {
  const [tab, setTab] = useState<Tab>("form");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  return (
    <div className="app-root">
      {/* 상단 로그인 바 (지금 쓰던 거 그대로) */}
      <LoginPanel
        currentUser={currentUser}
        onLogin={(user) => setCurrentUser(user)}
        onLogout={() => setCurrentUser(null)}
      />

      <div className="app-shell">
        {/* 상단 헤더 + 탭 (캡처 상단 네비 느낌) */}
        <header className="app-header">
          <div className="logo">HM'US</div>

          <nav className="main-tabs">
            <button
              className={`tab-btn ${tab === "form" ? "active" : ""}`}
              onClick={() => setTab("form")}
            >
              배차접수
            </button>
            <button
              className={`tab-btn ${tab === "list" ? "active" : ""}`}
              onClick={() => setTab("list")}
            >
              배차내역
            </button>
          </nav>

          <div className="header-right">
            {/* 로그인 패널에서 이미 상태를 보여주니까
                여기엔 심플한 텍스트만 둬도 되고, 비워놔도 됨 */}
            <span className="header-right-text">LOGIN / JOIN US</span>
          </div>
        </header>

        <main className="app-main">
          {currentUser ? (
            tab === "form" ? (
              <section className="card card-form">
                <h2 className="card-title">배차 접수</h2>
                <RequestForm />
              </section>
            ) : (
              <section className="card card-list">
                <h2 className="card-title">배차 내역</h2>
                <RequestList />
              </section>
            )
          ) : (
            <section className="card card-empty">
              <h2 className="card-title">로그인이 필요합니다</h2>
              <p className="card-desc">
                상단에서 로그인 후 배차 접수 / 배차 내역 기능을 사용할 수 있습니다.
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;