// src/components/AddressBookCreateModal.tsx
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import type { FormState } from "../hooks/useAddressBook";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../hooks/useAddressBook";

type Props = {
  createModalOpen: boolean;
  creating: boolean;
  error: string | null;
  form: FormState;
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAddressSearch: () => void;
  handleSubmit: (e: FormEvent) => void;
  setCreateModalOpen: Dispatch<SetStateAction<boolean>>;
};

export function AddressBookCreateModal({
  createModalOpen,
  creating,
  error,
  form,
  handleChange,
  onAddressSearch,
  handleSubmit,
  setCreateModalOpen,
}: Props) {
  if (!createModalOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
      onClick={() => {
        if (creating) return;
        setCreateModalOpen(false);
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 8,
          padding: 20,
          width: 560,
          maxWidth: "calc(100vw - 24px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
          주소록 추가
        </h3>

        <form onSubmit={handleSubmit} className="address-form-grid">
          {/* 장소명 (2칸) · 담당자명 (1칸) · 연락처 (1칸) */}
          <input
            style={{ gridColumn: "span 2" }}
            type="text"
            name="placeName"
            value={form.placeName}
            onChange={handleChange}
            placeholder="장소명 (필수)"
            disabled={creating}
          />
          <input
            type="text"
            name="contactName"
            value={form.contactName}
            onChange={handleChange}
            placeholder="담당자명"
            disabled={creating}
          />
          <input
            type="tel"
            name="contactPhone"
            value={form.contactPhone}
            onChange={handleChange}
            placeholder="연락처"
            disabled={creating}
          />

          {/* 주소 — 검색 전용 */}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
            <input
              style={{ flex: 1, cursor: "default" }}
              type="text"
              value={form.address}
              readOnly
              placeholder="주소 검색 (필수)"
            />
            <button
              type="button"
              onClick={onAddressSearch}
              disabled={creating}
              style={{
                padding: "0 14px",
                border: "none",
                background: "#3182ce",
                color: "#fff",
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              주소 검색
            </button>
          </div>

          <input
            className="full"
            type="text"
            name="addressDetail"
            value={form.addressDetail}
            onChange={handleChange}
            placeholder="상세주소"
            disabled={creating}
          />

          {/* 점심시간 레이블 */}
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#555", fontWeight: 600, marginTop: 2 }}>
            점심시간
          </div>

          <div className="address-lunch-row full">
            <select name="lunchStartHour" value={form.lunchStartHour} onChange={handleChange} aria-label="점심시간 시작" disabled={creating}>
              <option value="">시작 시</option>
              {HOUR_OPTIONS.map((h) => <option key={`sh-${h}`} value={h}>{h}</option>)}
            </select>
            <select name="lunchStartMinute" value={form.lunchStartMinute} onChange={handleChange} aria-label="점심시간 시작 분" disabled={creating}>
              <option value="">분</option>
              {MINUTE_OPTIONS.map((m) => <option key={`sm-${m}`} value={m}>{m}</option>)}
            </select>
            <span aria-hidden="true">~</span>
            <select name="lunchEndHour" value={form.lunchEndHour} onChange={handleChange} aria-label="점심시간 종료" disabled={creating}>
              <option value="">종료 시</option>
              {HOUR_OPTIONS.map((h) => <option key={`eh-${h}`} value={h}>{h}</option>)}
            </select>
            <select name="lunchEndMinute" value={form.lunchEndMinute} onChange={handleChange} aria-label="점심시간 종료 분" disabled={creating}>
              <option value="">분</option>
              {MINUTE_OPTIONS.map((m) => <option key={`em-${m}`} value={m}>{m}</option>)}
            </select>
          </div>

          <textarea
            className="full"
            name="memo"
            value={form.memo}
            onChange={handleChange}
            placeholder="특이사항 / 메모"
            style={{ gridColumn: "1 / -1", minHeight: 80, resize: "vertical", padding: 8, borderRadius: 4, border: "1px solid #ccc", fontSize: 13 }}
            disabled={creating}
          />

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              disabled={creating}
              onClick={() => setCreateModalOpen(false)}
              style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
            >
              취소
            </button>
            <button type="submit" disabled={creating} className="address-save-btn" style={{ width: "auto", marginTop: 0 }}>
              {creating ? "저장 중..." : "저장"}
            </button>
          </div>

          {error && (
            <p style={{ marginTop: 4, color: "red", fontSize: 12, gridColumn: "1 / -1" }}>{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
