// src/pages/PartnerPage.tsx
import { useEffect, useState } from "react";
import { listCompanyNames, createCompanyName, deleteCompanyName } from "../api/client";
import type { CompanyName } from "../api/types";

export function PartnerPage() {
  const [companies, setCompanies] = useState<CompanyName[]>([]);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await listCompanyNames();
      setCompanies(data);
    } catch (err: any) {
      setError(err?.message || "회사 목록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCompanies();
  }, []);

  const handleAdd = async () => {
    const name = inputValue.trim();
    if (!name) return;
    setAdding(true);
    setError(null);
    try {
      const created = await createCompanyName(name);
      setCompanies((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name, "ko"))
      );
      setInputValue("");
    } catch (err: any) {
      setError(err?.message || "회사명 등록 중 오류가 발생했습니다.");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`"${name}" 거래처를 삭제하시겠습니까?`)) return;
    setDeletingId(id);
    setError(null);
    try {
      await deleteCompanyName(id);
      setCompanies((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      setError(err?.message || "회사명 삭제 중 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="partner-page">
      <div className="partner-header">
        <h2 className="partner-title">거래처 관리</h2>
        <p className="partner-desc">
          등록된 거래처(회사명)는 주소록 작성 및 사용자 회사 설정 시 선택 목록으로 사용됩니다.
        </p>
      </div>

      {error && (
        <div className="partner-error">{error}</div>
      )}

      {/* 추가 폼 */}
      <div className="partner-add-row">
        <input
          type="text"
          className="partner-add-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="새 거래처명 입력"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleAdd();
            }
          }}
          disabled={adding}
        />
        <button
          type="button"
          className="partner-add-btn"
          onClick={() => void handleAdd()}
          disabled={adding || !inputValue.trim()}
        >
          {adding ? "등록 중..." : "+ 거래처 추가"}
        </button>
      </div>

      {/* 회사 목록 */}
      {loading ? (
        <p className="partner-loading">불러오는 중...</p>
      ) : companies.length === 0 ? (
        <div className="partner-empty">
          <p>등록된 거래처가 없습니다.</p>
          <p>위 입력란에 거래처명을 입력하고 추가 버튼을 눌러 등록하세요.</p>
        </div>
      ) : (
        <table className="partner-table">
          <colgroup>
            <col style={{ width: 40 }} />
            <col />
            <col style={{ width: 160 }} />
            <col style={{ width: 80 }} />
          </colgroup>
          <thead>
            <tr>
              <th>#</th>
              <th>거래처명</th>
              <th>등록일</th>
              <th>관리</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((c, idx) => (
              <tr key={c.id}>
                <td className="partner-cell-num">{idx + 1}</td>
                <td className="partner-cell-name">{c.name}</td>
                <td className="partner-cell-date">
                  {new Date(c.createdAt).toLocaleDateString("ko-KR")}
                </td>
                <td className="partner-cell-action">
                  <button
                    type="button"
                    className="partner-del-btn"
                    onClick={() => void handleDelete(c.id, c.name)}
                    disabled={deletingId === c.id}
                    title="삭제"
                  >
                    삭제
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="partner-count">
        총 <strong>{companies.length}</strong>개 거래처 등록됨
      </p>
    </div>
  );
}
