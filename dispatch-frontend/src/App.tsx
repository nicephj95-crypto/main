import { useState } from "react";
import { RequestForm } from "./RequestForm";
import { RequestList } from "./RequestList";

type Tab = "form" | "list";

function App() {
  const [tab, setTab] = useState<Tab>("form");

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      {/* 간단한 탭 버튼 */}
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
            backgroundColor:
              tab === "form" ? "#333" : "#fff",
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
            backgroundColor:
              tab === "list" ? "#333" : "#fff",
            color: tab === "list" ? "#fff" : "#333",
            cursor: "pointer",
          }}
        >
          배차내역 리스트
        </button>
      </div>

      {tab === "form" ? <RequestForm /> : <RequestList />}
    </div>
  );
}

export default App;