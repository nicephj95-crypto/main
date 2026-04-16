// src/components/AddressBookEditModal.tsx
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { AddressBookEntry } from "../api/types";
import type { FormState } from "../hooks/useAddressBook";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../hooks/useAddressBook";
import { Search } from "lucide-react";

type Props = {
  editing: AddressBookEntry | null;
  editForm: FormState | null;
  companyNameLocked: string | null;
  handleEditChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onAddressSearch: () => void;
  handleSaveEdit: () => void;
  setEditing: Dispatch<SetStateAction<AddressBookEntry | null>>;
  setEditForm: Dispatch<SetStateAction<FormState | null>>;
};

export function AddressBookEditModal({
  editing,
  editForm,
  companyNameLocked,
  handleEditChange,
  onAddressSearch,
  handleSaveEdit,
  setEditing,
  setEditForm,
}: Props) {
  if (!editing || !editForm) return null;

  const handleClose = () => {
    setEditing(null);
    setEditForm(null);
  };

  return (
    <div className="ab-modal-backdrop" onClick={handleClose}>
      <div className="ab-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ab-modal-header">
          <span className="ab-modal-title">주소록 수정</span>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void handleSaveEdit(); }}
          className="ab-modal-form"
        >
          <div className="ab-form-field">
            <label className="ab-field-label">업체명</label>
            <input
              className="ab-field-input"
              type="text"
              name="businessName"
              value={companyNameLocked ?? editForm.businessName}
              onChange={handleEditChange}
              placeholder="업체명"
              disabled={companyNameLocked !== null}
              readOnly={companyNameLocked !== null}
            />
          </div>

          <div className="ab-form-row">
            <div className="ab-form-field ab-form-field-half">
              <label className="ab-field-label">장소명 *</label>
              <input
                className="ab-field-input"
                type="text"
                name="placeName"
                value={editForm.placeName}
                onChange={handleEditChange}
                placeholder="장소명"
              />
            </div>
            <div className="ab-form-field ab-form-field-half">
              <label className="ab-field-label">담당자명</label>
              <input
                className="ab-field-input"
                type="text"
                name="contactName"
                value={editForm.contactName}
                onChange={handleEditChange}
                placeholder="담당자명"
              />
            </div>
          </div>

          <div className="ab-form-row">
            <div className="ab-form-field ab-form-field-half">
              <label className="ab-field-label">연락처</label>
              <input
                className="ab-field-input"
                type="tel"
                name="contactPhone"
                value={editForm.contactPhone}
                onChange={handleEditChange}
                placeholder="연락처"
              />
            </div>
            <div className="ab-form-field ab-form-field-half">
              <label className="ab-field-label">점심시간</label>
              <div className="ab-lunch-row">
                <select name="lunchStartHour" value={editForm.lunchStartHour} onChange={handleEditChange} aria-label="점심시작 시">
                  <option value="">시</option>
                  {HOUR_OPTIONS.map((h) => <option key={`esh-${h}`} value={h}>{h}</option>)}
                </select>
                <select name="lunchStartMinute" value={editForm.lunchStartMinute} onChange={handleEditChange} aria-label="점심시작 분">
                  <option value="">분</option>
                  {MINUTE_OPTIONS.map((m) => <option key={`esm-${m}`} value={m}>{m}</option>)}
                </select>
                <span>~</span>
                <select name="lunchEndHour" value={editForm.lunchEndHour} onChange={handleEditChange} aria-label="점심종료 시">
                  <option value="">시</option>
                  {HOUR_OPTIONS.map((h) => <option key={`eeh-${h}`} value={h}>{h}</option>)}
                </select>
                <select name="lunchEndMinute" value={editForm.lunchEndMinute} onChange={handleEditChange} aria-label="점심종료 분">
                  <option value="">분</option>
                  {MINUTE_OPTIONS.map((m) => <option key={`eem-${m}`} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ab-form-field">
            <label className="ab-field-label">주소</label>
            <div className="ab-address-infield-wrap" onClick={onAddressSearch}>
              <input
                className="ab-field-input ab-address-infield-input"
                type="text"
                value={editForm.address}
                readOnly
                placeholder="주소 검색 (필수)"
              />
              <span className="ab-address-infield-icon">
                <Search size={16} />
              </span>
            </div>
          </div>

          <div className="ab-form-field">
            <label className="ab-field-label">상세주소</label>
            <input
              className="ab-field-input"
              type="text"
              name="addressDetail"
              value={editForm.addressDetail}
              onChange={handleEditChange}
              placeholder="상세주소"
            />
          </div>

          <div className="ab-form-field">
            <label className="ab-field-label">특이사항</label>
            <textarea
              className="ab-field-textarea"
              name="memo"
              value={editForm.memo}
              onChange={handleEditChange}
              placeholder="특이사항 / 메모"
            />
          </div>

          <div className="ab-modal-footer">
            <button type="button" className="ab-btn-cancel" onClick={handleClose}>
              취소
            </button>
            <button type="submit" className="ab-btn-save">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
