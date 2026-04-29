// src/components/RequestAssignModal.tsx
import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AssignFormState } from "../hooks/useRequestList";
import { DispatchTrackingModal } from "./DispatchTrackingModal";
import type { RequestDetail, VehicleGroup } from "../api/types";
import { getPlatformByVehicleGroup } from "../utils/integrationPlatform";
import { formatPhoneNumber } from "../utils/phoneFormat";

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

function driverSendValue(value?: string | number | null): string {
  if (value == null) return "-";
  const text = String(value).trim();
  return text || "-";
}

function driverSendAddress(address?: string | null, detail?: string | null): string {
  const text = [address, detail].map((v) => v?.trim()).filter(Boolean).join(" ");
  return text || "-";
}

function driverSendMoney(value?: string | number | null): string {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  return digits ? `${Number(digits).toLocaleString()}원` : "-";
}

function driverSendDateTime(value?: string | null, immediateLabel?: string): string {
  if (!value) return immediateLabel || "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return immediateLabel || "-";
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yy}/${mm}/${dd} ${hh}:${min}`;
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function buildDriverMessage(request: RequestDetail | null | undefined, form: AssignFormState): string {
  const pickupName = driverSendValue(request?.pickupPlaceName);
  const dropoffName = driverSendValue(request?.dropoffPlaceName);
  const vehicleInfo = `${driverSendValue(form.vehicleTonnage ? `${form.vehicleTonnage}톤` : null)}/${driverSendValue(form.vehicleType)}`;
  const infoLines = [
    `차주명 : ${driverSendValue(form.driverName)}`,
    `차주연락처 : ${driverSendValue(form.driverPhone)}`,
    `차량번호 : ${driverSendValue(form.vehicleNumber)}`,
    `차량정보 : ${vehicleInfo}`,
    `청구금액 : ${driverSendMoney(form.billingPrice)}`,
  ];

  return [
    `상차지 : ${pickupName} / ${driverSendValue(request?.pickupContactPhone)} (${driverSendDateTime(request?.pickupDatetime, request?.pickupIsImmediate ? "바로" : undefined)} 상차)`,
    driverSendAddress(request?.pickupAddress, request?.pickupAddressDetail),
    "",
    `하차지 : ${dropoffName} / ${driverSendValue(request?.dropoffContactPhone)} (${driverSendDateTime(request?.dropoffDatetime, request?.dropoffIsImmediate ? "바로" : undefined)} 도착)`,
    driverSendAddress(request?.dropoffAddress, request?.dropoffAddressDetail),
    "",
    infoLines.join("\n"),
    "-------------------------------------------",
    "",
    `상차지에 ★하차지명(${dropoffName})★ 가시는 차량이라고 말씀해주세요.`,
    "",
    "상하차시간 엄수해 주세요.",
    "",
    "하차 직후 ★인수증★ 서명 사진 찍어서 저한테 문자 보내주세요.",
    "",
    "카고차량이시면 눈/비/이슬 맞지 않게 갑바 꼭 씌워주세요.",
    "",
    "운행 중 문제 생기면 상하차지와 실랑이 마시고 꼭 저한테 연락 주세요.",
    "",
    "안전운전하세요! 감사합니다~",
  ].join("\n");
}

type Props = {
  assignModalOpen: boolean;
  assignTargetId: number | null;
  assignTargetVehicleGroup?: VehicleGroup | null;
  assignTargetRequest?: RequestDetail | null;
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
  assignTargetRequest,
  assignForm,
  setAssignForm,
  assignSaving,
  isStaff,
  handleCloseAssignModal,
  handleSaveAssignment,
}: Props) {
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [tempReasons, setTempReasons] = useState<string[]>([]);
  const [customReason, setCustomReason] = useState("");
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [driverSendFeedback, setDriverSendFeedback] = useState<string | null>(null);
  const trackingPlatform =
    getPlatformByVehicleGroup(assignTargetVehicleGroup) === "INSUNG" ? "insung" : "hwamul24";

  if (!assignModalOpen || !isStaff) return null;

  const set = (key: keyof AssignFormState) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setAssignForm((prev) => ({ ...prev, [key]: e.target.value }));

  const openReasonModal = () => {
    setTempReasons(parseReasons(assignForm.extraFareReason));
    setCustomReason("");
    setReasonModalOpen(true);
  };

  const confirmReasons = () => {
    const trimmedCustomReason = customReason.trim();
    const nextReasons =
      trimmedCustomReason && !tempReasons.includes(trimmedCustomReason)
        ? [...tempReasons, trimmedCustomReason]
        : tempReasons;
    setAssignForm((prev) => ({ ...prev, extraFareReason: stringifyReasons(nextReasons) }));
    setReasonModalOpen(false);
    setCustomReason("");
  };

  const toggleTempReason = (option: string) => {
    setTempReasons((prev) =>
      prev.includes(option) ? prev.filter((r) => r !== option) : [...prev, option]
    );
  };

  const displayValue = parseReasons(assignForm.extraFareReason).join(", ");

  const handleCopyDriverMessage = async () => {
    try {
      const message = buildDriverMessage(assignTargetRequest, assignForm);
      console.debug("[copy] driver message", { firstLine: message.split("\n")[0] ?? "" });
      await copyText(message);
      setDriverSendFeedback("복사 완료");
      window.setTimeout(() => setDriverSendFeedback(null), 1600);
    } catch {
      setDriverSendFeedback("복사 실패");
      window.setTimeout(() => setDriverSendFeedback(null), 1600);
    }
  };

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
                    const formatted = formatPhoneNumber(e.target.value);
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
            <div className="am-footer-left">
              <button
                type="button"
                className="am-btn am-btn-driver-send"
                onClick={() => void handleCopyDriverMessage()}
                disabled={assignSaving}
              >
                차주전송
              </button>
              {driverSendFeedback && (
                <span className="am-copy-feedback">{driverSendFeedback}</span>
              )}
            </div>
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
            <div className="am-reason-custom">
              <input
                type="text"
                className="am-reason-custom-input"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmReasons();
                  }
                }}
                placeholder="직접 입력"
                maxLength={80}
              />
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
