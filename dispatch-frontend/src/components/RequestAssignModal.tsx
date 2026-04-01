// src/components/RequestAssignModal.tsx
import type { Dispatch, SetStateAction } from "react";
import type { AssignFormState } from "../hooks/useRequestList";

const VEHICLE_TYPE_OPTIONS = [
  "카고",
  "탑차",
  "윙바디",
  "냉동탑",
  "냉장탑",
  "리프트",
  "호로",
  "기타",
] as const;

type Props = {
  assignModalOpen: boolean;
  assignTargetId: number | null;
  assignForm: AssignFormState;
  setAssignForm: Dispatch<SetStateAction<AssignFormState>>;
  assignSaving: boolean;
  assignDeleting: boolean;
  hasCurrentAssignment: boolean;
  handleCloseAssignModal: () => void;
  handleSaveAssignment: () => Promise<void>;
  handleDeleteAssignment: () => Promise<void>;
};

export function RequestAssignModal({
  assignModalOpen,
  assignTargetId,
  assignForm,
  setAssignForm,
  assignSaving,
  assignDeleting,
  hasCurrentAssignment,
  handleCloseAssignModal,
  handleSaveAssignment,
  handleDeleteAssignment,
}: Props) {
  if (!assignModalOpen) return null;

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={handleCloseAssignModal}
    >
      <div
        className="assign-modal-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="assign-modal-header">
          <h3 className="assign-modal-title">
            배차정보 입력
          </h3>
          {assignTargetId && (
            <span className="assign-modal-id">#{assignTargetId}</span>
          )}
          <button
            type="button"
            className="assign-modal-close-btn"
            onClick={handleCloseAssignModal}
            disabled={assignSaving || assignDeleting}
            aria-label="닫기"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M14 4L4 14M4 4l10 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 폼 본문 */}
        <div className="assign-modal-body">
          {/* 차주명 / 전화번호 */}
          <div className="assign-modal-row-group">
            <div className="assign-modal-row">
              <div className="assign-modal-label">차주명</div>
              <input
                className="assign-modal-input"
                type="text"
                value={assignForm.driverName}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, driverName: e.target.value }))
                }
                placeholder="기사 이름"
              />
            </div>
            <div className="assign-modal-row">
              <div className="assign-modal-label">차주번호</div>
              <input
                className="assign-modal-input"
                type="text"
                value={assignForm.driverPhone}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, driverPhone: e.target.value }))
                }
                placeholder="010-0000-0000"
              />
            </div>
          </div>

          {/* 차량번호 / 차량톤수 */}
          <div className="assign-modal-row-group">
            <div className="assign-modal-row">
              <div className="assign-modal-label">차량번호</div>
              <input
                className="assign-modal-input"
                type="text"
                value={assignForm.vehicleNumber}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))
                }
                placeholder="123가4567"
              />
            </div>
            <div className="assign-modal-row">
              <div className="assign-modal-label">차량톤수</div>
              <input
                className="assign-modal-input"
                type="text"
                inputMode="decimal"
                value={assignForm.vehicleTonnage}
                onChange={(e) =>
                  setAssignForm((prev) => ({
                    ...prev,
                    vehicleTonnage: e.target.value,
                  }))
                }
                placeholder="1톤, 1.4톤 등"
              />
            </div>
          </div>

          {/* 차량종류 (전체 너비) */}
          <div className="assign-modal-row assign-modal-row-full">
            <div className="assign-modal-label">차량종류</div>
            <select
              className="assign-modal-input assign-modal-select"
              value={assignForm.vehicleType}
              onChange={(e) =>
                setAssignForm((prev) => ({ ...prev, vehicleType: e.target.value }))
              }
            >
              <option value="">차량종류 선택</option>
              {VEHICLE_TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div className="assign-modal-divider" />

          {/* 실운임 / 청구가 */}
          <div className="assign-modal-row-group">
            <div className="assign-modal-row assign-modal-row-sensitive">
              <div className="assign-modal-label assign-modal-label-dark">실운임</div>
              <div className="assign-modal-input-wrap">
                <input
                  className="assign-modal-input"
                  type="text"
                  inputMode="numeric"
                  value={assignForm.actualFare}
                  onChange={(e) =>
                    setAssignForm((prev) => ({ ...prev, actualFare: e.target.value }))
                  }
                  placeholder="기사에게 지급하는 운임"
                />
                <span className="assign-modal-sensitive-tag">대외비</span>
              </div>
            </div>
            <div className="assign-modal-row">
              <div className="assign-modal-label">청구가★</div>
              <input
                className="assign-modal-input"
                type="text"
                inputMode="numeric"
                value={assignForm.billingPrice}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, billingPrice: e.target.value }))
                }
                placeholder="고객에게 청구하는 금액"
              />
            </div>
          </div>

          {/* [placeholder] 추가요금 / 추가사유 — 미구현, UI만 표시 */}
          <div className="assign-modal-row-group assign-modal-placeholder">
            <div className="assign-modal-row">
              <div className="assign-modal-label">추가요금</div>
              <input
                className="assign-modal-input"
                type="text"
                inputMode="numeric"
                disabled
                placeholder="추가 요금 (준비 중)"
              />
            </div>
            <div className="assign-modal-row">
              <div className="assign-modal-label">추가사유</div>
              <input
                className="assign-modal-input"
                type="text"
                disabled
                placeholder="추가 사유 선택 (준비 중)"
              />
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="assign-modal-footer">
          {/* 배차정보 삭제 — 기존 기능 유지 */}
          {hasCurrentAssignment && (
            <button
              type="button"
              className="assign-modal-btn assign-modal-btn-delete"
              onClick={() => void handleDeleteAssignment()}
              disabled={assignSaving || assignDeleting}
            >
              {assignDeleting ? "삭제 중..." : "배차정보 삭제"}
            </button>
          )}
          <div className="assign-modal-footer-right">
            <button
              type="button"
              className="assign-modal-btn assign-modal-btn-cancel"
              onClick={handleCloseAssignModal}
              disabled={assignSaving || assignDeleting}
            >
              취소
            </button>
            <button
              type="button"
              className="assign-modal-btn assign-modal-btn-save"
              onClick={() => void handleSaveAssignment()}
              disabled={assignSaving || assignDeleting}
            >
              {assignSaving ? "저장 중..." : "저장 후 배차완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
