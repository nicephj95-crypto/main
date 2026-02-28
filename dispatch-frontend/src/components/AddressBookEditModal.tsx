// src/components/AddressBookEditModal.tsx
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { AddressBookEntry } from "../api/types";
import type { FormState } from "../hooks/useAddressBook";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../hooks/useAddressBook";

type Props = {
  editing: AddressBookEntry | null;
  editForm: FormState | null;
  handleEditChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAddressSearch: () => void;
  handleSaveEdit: () => void;
  setEditing: Dispatch<SetStateAction<AddressBookEntry | null>>;
  setEditForm: Dispatch<SetStateAction<FormState | null>>;
};

export function AddressBookEditModal({
  editing,
  editForm,
  handleEditChange,
  onAddressSearch,
  handleSaveEdit,
  setEditing,
  setEditForm,
}: Props) {
  if (!editing || !editForm) return null;

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
      >
        <h3 style={{ marginTop: 0, marginBottom: 12, fontSize: 16 }}>
          주소록 수정
        </h3>

        <form
          onSubmit={(e) => { e.preventDefault(); void handleSaveEdit(); }}
          className="address-form-grid"
        >
          {/* 장소명 (2칸) · 담당자명 (1칸) · 연락처 (1칸) */}
          <input
            style={{ gridColumn: "span 2" }}
            type="text"
            name="placeName"
            value={editForm.placeName}
            onChange={handleEditChange}
            placeholder="장소명 (필수)"
          />
          <input
            type="text"
            name="contactName"
            value={editForm.contactName}
            onChange={handleEditChange}
            placeholder="담당자명"
          />
          <input
            type="tel"
            name="contactPhone"
            value={editForm.contactPhone}
            onChange={handleEditChange}
            placeholder="연락처"
          />

          {/* 주소 — 검색 전용 */}
          <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
            <input
              style={{ flex: 1, cursor: "default" }}
              type="text"
              value={editForm.address}
              readOnly
              placeholder="주소 검색 (필수)"
            />
            <button
              type="button"
              onClick={onAddressSearch}
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
            value={editForm.addressDetail}
            onChange={handleEditChange}
            placeholder="상세주소"
          />

          {/* 점심시간 레이블 */}
          <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#555", fontWeight: 600, marginTop: 2 }}>
            점심시간
          </div>

          <div className="address-lunch-row full">
            <select name="lunchStartHour" value={editForm.lunchStartHour} onChange={handleEditChange} aria-label="점심시간 시작">
              <option value="">시작 시</option>
              {HOUR_OPTIONS.map((h) => <option key={`esh-${h}`} value={h}>{h}</option>)}
            </select>
            <select name="lunchStartMinute" value={editForm.lunchStartMinute} onChange={handleEditChange} aria-label="점심시간 시작 분">
              <option value="">분</option>
              {MINUTE_OPTIONS.map((m) => <option key={`esm-${m}`} value={m}>{m}</option>)}
            </select>
            <span aria-hidden="true">~</span>
            <select name="lunchEndHour" value={editForm.lunchEndHour} onChange={handleEditChange} aria-label="점심시간 종료">
              <option value="">종료 시</option>
              {HOUR_OPTIONS.map((h) => <option key={`eeh-${h}`} value={h}>{h}</option>)}
            </select>
            <select name="lunchEndMinute" value={editForm.lunchEndMinute} onChange={handleEditChange} aria-label="점심시간 종료 분">
              <option value="">분</option>
              {MINUTE_OPTIONS.map((m) => <option key={`eem-${m}`} value={m}>{m}</option>)}
            </select>
          </div>

          <textarea
            className="full"
            name="memo"
            value={editForm.memo}
            onChange={handleEditChange}
            placeholder="특이사항 / 메모"
            style={{ gridColumn: "1 / -1", minHeight: 80, resize: "vertical", padding: 8, borderRadius: 4, border: "1px solid #ccc", fontSize: 13 }}
          />

          <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
            <button
              type="button"
              onClick={() => { setEditing(null); setEditForm(null); }}
              style={{ padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc", backgroundColor: "#fff", cursor: "pointer" }}
            >
              취소
            </button>
            <button type="submit" className="address-save-btn" style={{ width: "auto", marginTop: 0 }}>
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
