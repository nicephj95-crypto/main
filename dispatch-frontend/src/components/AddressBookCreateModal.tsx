// src/components/AddressBookCreateModal.tsx
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import type { FormState } from "../hooks/useAddressBook";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../hooks/useAddressBook";
import { Search } from "lucide-react";

type Props = {
  createModalOpen: boolean;
  creating: boolean;
  error: string | null;
  form: FormState;
  companyNameLocked: string | null;
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
  companyNameLocked,
  handleChange,
  onAddressSearch,
  handleSubmit,
  setCreateModalOpen,
}: Props) {
  if (!createModalOpen) return null;

  return (
    <div
      className="ab-modal-backdrop"
      onClick={() => { if (creating) return; setCreateModalOpen(false); }}
    >
      <div className="ab-modal-box" onClick={(e) => e.stopPropagation()}>
        <div className="ab-modal-header">
          <span className="ab-modal-title">주소록 추가</span>
        </div>

        <form onSubmit={handleSubmit} className="ab-modal-form">
          <div className="ab-form-field">
            <label className="ab-field-label">업체명</label>
            <input
              className="ab-field-input"
              type="text"
              name="businessName"
              value={companyNameLocked ?? form.businessName}
              onChange={handleChange}
              placeholder="업체명"
              disabled={creating || companyNameLocked !== null}
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
                value={form.placeName}
                onChange={handleChange}
                placeholder="장소명"
                disabled={creating}
              />
            </div>
            <div className="ab-form-field ab-form-field-half">
              <label className="ab-field-label">담당자명</label>
              <input
                className="ab-field-input"
                type="text"
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                placeholder="담당자명"
                disabled={creating}
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
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="연락처"
                disabled={creating}
              />
            </div>
            <div className="ab-form-field ab-form-field-half">
              <label className="ab-field-label">점심시간</label>
              <div className="ab-lunch-row">
                <select name="lunchStartHour" value={form.lunchStartHour} onChange={handleChange} disabled={creating} aria-label="점심시작 시">
                  <option value="">시</option>
                  {HOUR_OPTIONS.map((h) => <option key={`sh-${h}`} value={h}>{h}</option>)}
                </select>
                <select name="lunchStartMinute" value={form.lunchStartMinute} onChange={handleChange} disabled={creating} aria-label="점심시작 분">
                  <option value="">분</option>
                  {MINUTE_OPTIONS.map((m) => <option key={`sm-${m}`} value={m}>{m}</option>)}
                </select>
                <span>~</span>
                <select name="lunchEndHour" value={form.lunchEndHour} onChange={handleChange} disabled={creating} aria-label="점심종료 시">
                  <option value="">시</option>
                  {HOUR_OPTIONS.map((h) => <option key={`eh-${h}`} value={h}>{h}</option>)}
                </select>
                <select name="lunchEndMinute" value={form.lunchEndMinute} onChange={handleChange} disabled={creating} aria-label="점심종료 분">
                  <option value="">분</option>
                  {MINUTE_OPTIONS.map((m) => <option key={`em-${m}`} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="ab-form-field">
            <label className="ab-field-label">주소</label>
            <div className="ab-address-infield-wrap" onClick={creating ? undefined : onAddressSearch}>
              <input
                className="ab-field-input ab-address-infield-input"
                type="text"
                value={form.address}
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
              value={form.addressDetail}
              onChange={handleChange}
              placeholder="상세주소"
              disabled={creating}
            />
          </div>

          <div className="ab-form-field">
            <label className="ab-field-label">특이사항</label>
            <textarea
              className="ab-field-textarea"
              name="memo"
              value={form.memo}
              onChange={handleChange}
              placeholder="특이사항 / 메모"
              disabled={creating}
            />
          </div>

          {error && <p className="ab-form-error">{error}</p>}

          <div className="ab-modal-footer">
            <button
              type="button"
              className="ab-btn-cancel"
              disabled={creating}
              onClick={() => setCreateModalOpen(false)}
            >
              취소
            </button>
            <button type="submit" className="ab-btn-save" disabled={creating}>
              {creating ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
