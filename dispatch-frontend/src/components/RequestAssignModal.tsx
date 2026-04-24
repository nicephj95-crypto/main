// src/components/RequestAssignModal.tsx
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AssignFormState } from "../hooks/useRequestList";
import { DispatchTrackingModal } from "./DispatchTrackingModal";
import type { VehicleGroup } from "../api/types";
import { getPlatformByVehicleGroup } from "../utils/integrationPlatform";

// 상차지/하차지 구분된 옵션
const PICKUP_REASON_OPTIONS = [
  "상차지 대기", "상차지 검수", "상차지 수작업",
  "상차지 랩핑작업", "상차지 라벨작업", "상차지 까대기",
] as const;

const DROPOFF_REASON_OPTIONS = [
  "하차지 대기", "하차지 검수", "하차지 수작업",
  "하차지 랩핑작업", "하차지 라벨작업", "하차지 까대기",
] as const;

const REASON_OPTION_PAIRS = PICKUP_REASON_OPTIONS.map((pickupOption, index) => ({
  pickupOption,
  dropoffOption: DROPOFF_REASON_OPTIONS[index] ?? null,
}));

// extraFareReason string ↔ string[] 변환
function parseReasons(raw: string): string[] {
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

function stringifyReasons(arr: string[]): string {
  return arr.join(",");
}

type Props = {
  assignModalOpen: boolean;
  assignTargetId: number | null;
  assignTargetVehicleGroup?: VehicleGroup | null;
  assignForm: AssignFormState;
  setAssignForm: Dispatch<SetStateAction<AssignFormState>>;
  assignSaving: boolean;
  isStaff: boolean;
  handleCloseAssignModal: () => void;
  handleSaveAssignment: () => Promise<void>;
};

export function RequestAssignModal({
  assignModalOpen,
  assignTargetId,
  assignTargetVehicleGroup,
  assignForm,
  setAssignForm,
  assignSaving,
  isStaff,
  handleCloseAssignModal,
  handleSaveAssignment,
}: Props) {
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [tempReasons, setTempReasons] = useState<string[]>([]);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const trackingPlatform =
    getPlatformByVehicleGroup(assignTargetVehicleGroup) === "INSUNG" ? "insung" : "hwamul24";

  if (!assignModalOpen || !isStaff) return null;

  const set = (key: keyof AssignFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setAssignForm((prev) => ({ ...prev, [key]: e.target.value }));

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    if (digits.startsWith("02")) {
      if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  };

  const openReasonModal = () => {
    setTempReasons(parseReasons(assignForm.extraFareReason));
    setReasonModalOpen(true);
  };

  const confirmReasons = () => {
    setAssignForm((prev) => ({ ...prev, extraFareReason: stringifyReasons(tempReasons) }));
    setReasonModalOpen(false);
  };

  const toggleTempReason = (option: string) => {
    setTempReasons((prev) =>
      prev.includes(option) ? prev.filter((r) => r !== option) : [...prev, option]
    );
  };

  const displayValue = parseReasons(assignForm.extraFareReason).join(", ");

  return (
    <>
      <div
        className="dispatch-image-modal-backdrop"
        onClick={handleCloseAssignModal}
      >
        <div
          className="am-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── 헤더 ── */}
          <div className="am-header">
            <div className="am-header-left">
              <h2 className="am-title">배차정보 입력</h2>
              <button
                type="button"
                className="am-location-btn"
                title="차량 현재 위치 조회"
                onClick={() => setLocationModalOpen(true)}
              >
                <svg width="17" height="17" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M11 2C7.13 2 4 5.13 4 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            {assignTargetId && (
              <span className="am-order-ref">#{assignTargetId}</span>
            )}
          </div>

          {/* ── 폼 본문 ── */}
          <div className="am-body">

            {/* Row 1: 오더번호 | 차주명 */}
            <div className="am-row-2col">
              <div className="am-field">
                <div className="am-label">오더번호</div>
                <input
                  className="am-input"
                  type="text"
                  value={assignForm.orderNumber}
                  onChange={set("orderNumber")}
                  placeholder="오더번호 입력"
                  maxLength={100}
                />
              </div>
              <div className="am-field">
                <div className="am-label">차주명</div>
                <input
                  className="am-input"
                  type="text"
                  value={assignForm.driverName}
                  onChange={set("driverName")}
                  placeholder="차주 이름"
                  maxLength={50}
                />
              </div>
            </div>

            {/* Row 2: 차주번호 | 차량번호 */}
            <div className="am-row-2col">
              <div className="am-field">
                <div className="am-label">차주번호</div>
                <input
                  className="am-input"
                  type="text"
                  inputMode="tel"
                  value={assignForm.driverPhone}
                  onChange={(e) => {
                    const formatted = formatPhone(e.target.value);
                    setAssignForm((prev) => ({ ...prev, driverPhone: formatted }));
                  }}
                  placeholder="010-0000-0000"
                  maxLength={14}
                />
              </div>
              <div className="am-field">
                <div className="am-label">차량번호</div>
                <input
                  className="am-input"
                  type="text"
                  value={assignForm.vehicleNumber}
                  onChange={set("vehicleNumber")}
                  placeholder="123가4567"
                  maxLength={20}
                />
              </div>
            </div>

            {/* Row 3: 차량톤수 | 차량종류 */}
            <div className="am-row-2col">
              <div className="am-field">
                <div className="am-label">차량톤수</div>
                <input
                  className="am-input"
                  type="text"
                  inputMode="decimal"
                  value={assignForm.vehicleTonnage}
                  onChange={(e) => {
                    const sanitized = e.target.value
                      .replace(/[^0-9.]/g, "")
                      .replace(/(\..*)\./g, "$1");
                    setAssignForm((prev) => ({ ...prev, vehicleTonnage: sanitized }));
                  }}
                  placeholder="예: 1, 1.4, 2.5"
                />
              </div>
              <div className="am-field">
                <div className="am-label">차량종류</div>
                <input
                  className="am-input"
                  type="text"
                  value={assignForm.vehicleType}
                  onChange={set("vehicleType")}
                  placeholder="예: 카고, 윙바디, 냉동탑"
                  maxLength={50}
                />
              </div>
            </div>

            {/* Row 4: 실운임(대외비) | 청구가격 */}
            {isStaff && (
              <div className="am-row-2col">
                <div className="am-field am-field-relative">
                  <div className="am-label">실운임</div>
                  <div className="am-input-wrap am-input-sensitive">
                    <input
                      className="am-input am-input-confidential"
                      type="text"
                      inputMode="numeric"
                      value={assignForm.actualFare}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        setAssignForm((prev) => ({ ...prev, actualFare: v }));
                      }}
                      placeholder="실제 배차 금액"
                    />
                    <span className="am-confidential-tag">대외비*</span>
                  </div>
                </div>
                <div className="am-field">
                  <div className="am-label">청구가격</div>
                  <input
                    className="am-input"
                    type="text"
                    inputMode="numeric"
                    value={assignForm.billingPrice}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setAssignForm((prev) => ({ ...prev, billingPrice: v }));
                    }}
                    placeholder="화주에게 청구할 금액"
                  />
                </div>
              </div>
            )}
            {!isStaff && (
              <div className="am-row-2col">
                <div className="am-field">
                  <div className="am-label">청구가격</div>
                  <input
                    className="am-input"
                    type="text"
                    inputMode="numeric"
                    value={assignForm.billingPrice}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setAssignForm((prev) => ({ ...prev, billingPrice: v }));
                    }}
                    placeholder="화주에게 청구할 금액"
                  />
                </div>
                <div className="am-field" />
              </div>
            )}

            {/* Row 5: 추가요금(대외비) | 추가사유 */}
            {isStaff && (
              <div className="am-row-2col">
                <div className="am-field am-field-relative">
                  <div className="am-label">추가요금</div>
                  <div className="am-input-wrap am-input-sensitive">
                    <input
                      className="am-input am-input-confidential"
                      type="text"
                      inputMode="numeric"
                      value={assignForm.extraFare}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9]/g, "");
                        setAssignForm((prev) => ({ ...prev, extraFare: v }));
                      }}
                      placeholder="추가 요금"
                    />
                    <span className="am-confidential-tag">대외비*</span>
                  </div>
                </div>
                <div className="am-field">
                  <div className="am-label">추가사유</div>
                  <div className="am-reason-display">
                    <input
                      type="text"
                      className="am-reason-display-input"
                      value={displayValue}
                      readOnly
                      placeholder="추가 사유 선택"
                    />
                    <button
                      type="button"
                      className="am-reason-click-btn"
                      onClick={openReasonModal}
                    >
                      CLICK!
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Row 6: 착불수익(대외비) */}
            {isStaff && (
              <div className="am-field am-field-relative am-field-full">
                <div className="am-label">착불수익</div>
                <div className="am-input-wrap am-input-sensitive am-input-wrap-full">
                  <input
                    className="am-input am-input-confidential"
                    type="text"
                    inputMode="numeric"
                    value={assignForm.codRevenue}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9]/g, "");
                      setAssignForm((prev) => ({ ...prev, codRevenue: v }));
                    }}
                    placeholder="착불로 받은 수익 금액"
                  />
                  <span className="am-confidential-tag">대외비*</span>
                </div>
              </div>
            )}

            {/* Row 7: 업무메모 (화주 공개) */}
            <div className="am-field am-field-full">
              <div className="am-label">업무메모</div>
              <input
                className="am-input am-input-full"
                type="text"
                value={assignForm.customerMemo}
                onChange={set("customerMemo")}
                placeholder="화주에게 노출되는 메모"
                maxLength={1000}
              />
            </div>

            {/* Row 8: 내부용 메모 (대외비) */}
            {isStaff && (
              <div className="am-field am-field-relative am-field-full">
                <div className="am-label">업무메모</div>
                <div className="am-input-wrap am-input-sensitive am-input-wrap-full">
                  <input
                    className="am-input am-input-confidential"
                    type="text"
                    value={assignForm.internalMemo}
                    onChange={set("internalMemo")}
                    placeholder="내부용 메모"
                    maxLength={1000}
                  />
                  <span className="am-confidential-tag">대외비*</span>
                </div>
              </div>
            )}

          </div>

          {/* ── 하단 버튼 ── */}
          <div className="am-footer">
            <div className="am-footer-right">
              <button
                type="button"
                className="am-btn am-btn-save"
                onClick={() => void handleSaveAssignment()}
                disabled={assignSaving}
              >
                {assignSaving ? "저장 중..." : "저장"}
              </button>
              <button
                type="button"
                className="am-btn am-btn-cancel"
                onClick={handleCloseAssignModal}
                disabled={assignSaving}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── 추가사유 선택 모달 ── */}
      {reasonModalOpen && (
        <div
          className="am-reason-modal-backdrop"
          onClick={() => setReasonModalOpen(false)}
        >
          <div
            className="am-reason-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="am-reason-modal-title">중복 선택 가능합니다</h3>
            <div className="am-reason-grid">
              {REASON_OPTION_PAIRS.flatMap(({ pickupOption, dropoffOption }, index) => {
                const pickupSelected = tempReasons.includes(pickupOption);
                const pickupButton = (
                  <button
                    key={`pickup-${index}`}
                    type="button"
                    className={`am-reason-option${pickupSelected ? " is-selected" : ""} is-pickup`}
                    onClick={() => toggleTempReason(pickupOption)}
                  >
                    {pickupOption}
                  </button>
                );

                if (!dropoffOption) {
                  return [pickupButton];
                }

                const dropoffSelected = tempReasons.includes(dropoffOption);
                const dropoffButton = (
                  <button
                    key={`dropoff-${index}`}
                    type="button"
                    className={`am-reason-option${dropoffSelected ? " is-selected" : ""} is-dropoff`}
                    onClick={() => toggleTempReason(dropoffOption)}
                  >
                    {dropoffOption}
                  </button>
                );

                return [pickupButton, dropoffButton];
              })}
            </div>
            <button
              type="button"
              className="am-reason-confirm-btn"
              onClick={confirmReasons}
            >
              확인
            </button>
          </div>
        </div>
      )}

      {locationModalOpen && assignTargetId !== null && (
        <DispatchTrackingModal
          requestId={assignTargetId}
          platform={trackingPlatform}
          open={locationModalOpen}
          onClose={() => setLocationModalOpen(false)}
        />
      )}
    </>
  );
}
