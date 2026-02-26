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
        className="dispatch-image-modal assign-info-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatch-image-modal-header">
          <h3>배차정보 입력 {assignTargetId ? `#${assignTargetId}` : ""}</h3>
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={handleCloseAssignModal}
            disabled={assignSaving || assignDeleting}
          >
            닫기
          </button>
        </div>
        <div className="dispatch-image-modal-body">
          <div className="assign-info-form-grid">
            <label className="assign-info-field">
              <span>이름</span>
              <input
                type="text"
                value={assignForm.driverName}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, driverName: e.target.value }))
                }
                placeholder="기사명"
              />
            </label>
            <label className="assign-info-field">
              <span>전화번호</span>
              <input
                type="text"
                value={assignForm.driverPhone}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, driverPhone: e.target.value }))
                }
                placeholder="010-0000-0000"
              />
            </label>
            <label className="assign-info-field">
              <span>차량번호</span>
              <input
                type="text"
                value={assignForm.vehicleNumber}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, vehicleNumber: e.target.value }))
                }
                placeholder="12가3456"
              />
            </label>
            <div className="assign-info-field">
              <span>차량정보</span>
              <div className="assign-info-vehicle-row">
                <input
                  type="text"
                  inputMode="decimal"
                  value={assignForm.vehicleTonnage}
                  onChange={(e) =>
                    setAssignForm((prev) => ({
                      ...prev,
                      vehicleTonnage: e.target.value,
                    }))
                  }
                  placeholder="톤수"
                />
                <select
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
            </div>
            <label className="assign-info-field">
              <span>실운임 (₩)</span>
              <input
                type="text"
                inputMode="numeric"
                value={assignForm.actualFare}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, actualFare: e.target.value }))
                }
                placeholder="기사에게 지급하는 운임"
              />
            </label>
            <label className="assign-info-field">
              <span>청구가★ (₩)</span>
              <input
                type="text"
                inputMode="numeric"
                value={assignForm.billingPrice}
                onChange={(e) =>
                  setAssignForm((prev) => ({ ...prev, billingPrice: e.target.value }))
                }
                placeholder="고객에게 청구하는 금액"
              />
            </label>
          </div>
        </div>
        <div className="dispatch-image-modal-footer assign-info-modal-footer">
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={handleCloseAssignModal}
            disabled={assignSaving || assignDeleting}
          >
            취소
          </button>
          {hasCurrentAssignment && (
            <button
              type="button"
              className="dispatch-image-modal-close assign-info-delete-btn"
              onClick={() => void handleDeleteAssignment()}
              disabled={assignSaving || assignDeleting}
            >
              {assignDeleting ? "삭제 중..." : "배차정보 삭제"}
            </button>
          )}
          <button
            type="button"
            className="dispatch-image-modal-action"
            onClick={() => void handleSaveAssignment()}
            disabled={assignSaving || assignDeleting}
          >
            {assignSaving ? "저장 중..." : "저장 후 배차완료"}
          </button>
        </div>
      </div>
    </div>
  );
}
