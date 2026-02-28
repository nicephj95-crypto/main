// src/components/AddressBookEditModal.tsx
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { AddressBookEntry, CompanyName } from "../api/types";
import type { FormState } from "../hooks/useAddressBook";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../hooks/useAddressBook";
import { CompanySearchSelect } from "./CompanySearchSelect";

type Props = {
  editing: AddressBookEntry | null;
  editForm: FormState | null;
  companyNames: CompanyName[];
  handleEditChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onBusinessNameChange: (value: string) => void;
  handleSaveEdit: () => void;
  setEditing: Dispatch<SetStateAction<AddressBookEntry | null>>;
  setEditForm: Dispatch<SetStateAction<FormState | null>>;
};

export function AddressBookEditModal({
  editing,
  editForm,
  companyNames,
  handleEditChange,
  onBusinessNameChange,
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
          <input
            type="text"
            name="placeName"
            value={editForm.placeName}
            onChange={handleEditChange}
            placeholder="장소명 (필수)"
          />
          <CompanySearchSelect
            value={editForm.businessName}
            onChange={onBusinessNameChange}
            companyNames={companyNames}
            placeholder="회사명 선택"
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
          <input
            className="full"
            type="text"
            name="address"
            value={editForm.address}
            onChange={handleEditChange}
            placeholder="주소 (필수)"
          />
          <input
            className="full"
            type="text"
            name="addressDetail"
            value={editForm.addressDetail}
            onChange={handleEditChange}
            placeholder="상세주소"
          />
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
