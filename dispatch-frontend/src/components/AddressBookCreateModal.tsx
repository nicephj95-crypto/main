// src/components/AddressBookCreateModal.tsx
import type { ChangeEvent, Dispatch, FormEvent, SetStateAction } from "react";
import type { FormState } from "../hooks/useAddressBook";
import type { CompanyName } from "../api/types";
import { HOUR_OPTIONS, MINUTE_OPTIONS } from "../hooks/useAddressBook";

type Props = {
  createModalOpen: boolean;
  creating: boolean;
  error: string | null;
  form: FormState;
  companyNames: CompanyName[];
  handleChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: FormEvent) => void;
  setCreateModalOpen: Dispatch<SetStateAction<boolean>>;
};

export function AddressBookCreateModal({
  createModalOpen,
  creating,
  error,
  form,
  companyNames,
  handleChange,
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
        <h3
          style={{
            marginTop: 0,
            marginBottom: 12,
            fontSize: 16,
          }}
        >
          주소록 추가
        </h3>

        <form onSubmit={handleSubmit} className="address-form-grid">
          <input
            type="text"
            name="placeName"
            value={form.placeName}
            onChange={handleChange}
            placeholder="장소명 (필수)"
          />
          <select
            name="businessName"
            value={form.businessName}
            onChange={handleChange}
            style={{ marginTop: 4 }}
            aria-label="회사명"
          >
            <option value="">회사명 선택</option>
            {companyNames.map((c) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
          <input
            type="text"
            name="contactName"
            value={form.contactName}
            onChange={handleChange}
            placeholder="담당자명"
          />
          <input
            type="tel"
            name="contactPhone"
            value={form.contactPhone}
            onChange={handleChange}
            placeholder="연락처"
          />
          <input
            className="full"
            type="text"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="주소 (필수)"
          />
          <input
            className="full"
            type="text"
            name="addressDetail"
            value={form.addressDetail}
            onChange={handleChange}
            placeholder="상세주소"
          />
          <div className="address-lunch-row full">
            <select
              name="lunchStartHour"
              value={form.lunchStartHour}
              onChange={handleChange}
              aria-label="점심시간 시작"
            >
              <option value="">시작 시</option>
              {HOUR_OPTIONS.map((hour) => (
                <option key={`sh-${hour}`} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              name="lunchStartMinute"
              value={form.lunchStartMinute}
              onChange={handleChange}
              aria-label="점심시간 시작 분"
            >
              <option value="">분</option>
              {MINUTE_OPTIONS.map((minute) => (
                <option key={`sm-${minute}`} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
            <span aria-hidden="true">~</span>
            <select
              name="lunchEndHour"
              value={form.lunchEndHour}
              onChange={handleChange}
              aria-label="점심시간 종료"
            >
              <option value="">종료 시</option>
              {HOUR_OPTIONS.map((hour) => (
                <option key={`eh-${hour}`} value={hour}>
                  {hour}
                </option>
              ))}
            </select>
            <select
              name="lunchEndMinute"
              value={form.lunchEndMinute}
              onChange={handleChange}
              aria-label="점심시간 종료 분"
            >
              <option value="">분</option>
              {MINUTE_OPTIONS.map((minute) => (
                <option key={`em-${minute}`} value={minute}>
                  {minute}
                </option>
              ))}
            </select>
          </div>
          <textarea
            className="full"
            name="memo"
            value={form.memo}
            onChange={handleChange}
            placeholder="특이사항 / 메모"
            style={{
              gridColumn: "1 / -1",
              minHeight: 80,
              resize: "vertical",
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 13,
            }}
          />

          <div
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 4,
            }}
          >
            <button
              type="button"
              disabled={creating}
              onClick={() => setCreateModalOpen(false)}
              style={{
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              취소
            </button>
            <button
              type="submit"
              disabled={creating}
              className="address-save-btn"
              style={{ width: "auto", marginTop: 0 }}
            >
              {creating ? "저장 중..." : "저장"}
            </button>
          </div>

          {error && (
            <p
              style={{
                marginTop: 4,
                color: "red",
                fontSize: 12,
                gridColumn: "1 / -1",
              }}
            >
              {error}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
