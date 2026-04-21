// src/RequestForm.tsx
import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { AddressBookModal } from "./AddressBookModal";
import { SearchIcon, SwapIcon } from "./ui/icons";
import motorcycleImg from "./img/오토바이.png";
import damasImg from "./img/다마스.png";
import raboImg from "./img/라보.png";
import oneTonPlusImg from "./img/1톤이상.png";
import { useRequestForm } from "./hooks/useRequestForm";
import { CargoImageModal } from "./components/CargoImageModal";
import { ScheduleModal } from "./components/ScheduleModal";
import { FareRuleModal } from "./components/FareRuleModal";
import { RequestCompanySection } from "./components/request-form/RequestCompanySection";
import { RequestRecentPanel } from "./components/request-form/RequestRecentPanel";
import { listCompanies, listGroups } from "./api/client";
import type { CompanyName, GroupManagementGroup } from "./api/types";
import type { AuthUser } from "./LoginPanel";

declare global {
  interface Window {
    daum: any;
  }
}

type RequestFormProps = {
  isAuthenticated?: boolean;
  currentUser?: AuthUser | null;
  mode?: "create" | "edit" | "copy";
  editRequestId?: number | null;
  copyRequestId?: number | null;
  onRequestCreated?: () => void;
  onRequestUpdated?: () => void;
};

export function RequestForm({
  isAuthenticated = false,
  currentUser = null,
  mode = "create",
  editRequestId = null,
  copyRequestId = null,
  onRequestCreated,
  onRequestUpdated,
}: RequestFormProps) {
  const [companies, setCompanies] = useState<CompanyName[]>([]);
  const [groups, setGroups] = useState<GroupManagementGroup[]>([]);
  const [fareRuleOpen, setFareRuleOpen] = useState(false);

  useEffect(() => {
    const role = currentUser?.role;
    if (role === "ADMIN" || role === "DISPATCHER" || role === "SALES") {
      Promise.all([listCompanies(), listGroups({ page: 1, size: 200 })])
        .then(([companyRows, groupRows]) => {
          setCompanies(companyRows);
          setGroups(groupRows.items);
        })
        .catch(() => {/* 목록 없으면 빈 상태 유지 */});
    }
  }, [currentUser?.role]);

  const {
    addressBookModalTarget,
    setAddressBookModalTarget,
    recentRequests,
    recentLoading,
    recentError,
    applyingId,
    pickupPlaceName,
    setPickupPlaceName,
    pickupAddress,
    pickupAddressDetail,
    setPickupAddressDetail,
    pickupContactName,
    setPickupContactName,
    pickupContactPhone,
    setPickupContactPhone,
    pickupMethod,
    setPickupMethod,
    pickupIsImmediate,
    pickupDatetime,
    dropoffPlaceName,
    setDropoffPlaceName,
    dropoffAddress,
    dropoffAddressDetail,
    setDropoffAddressDetail,
    dropoffContactName,
    setDropoffContactName,
    dropoffContactPhone,
    setDropoffContactPhone,
    dropoffMethod,
    setDropoffMethod,
    dropoffIsImmediate,
    dropoffDatetime,
    vehicleGroup,
    setVehicleGroup,
    vehicleTonnage,
    setVehicleTonnage,
    vehicleBodyType,
    setVehicleBodyType,
    vehicleTonOptions,
    vehicleTypeOptions,
    vehicleInfoText,
    currentVehicleInfo,
    cargoDescription,
    setCargoDescription,
    requestType,
    setRequestType,
    driverNote,
    setDriverNote,
    paymentUi,
    setPaymentUi,
    distanceKm,
    quotedPrice,
    calculating,
    submitting,
    message,
    error,
    cargoImageModalOpen,
    setCargoImageModalOpen,
    cargoImages,
    submitFlash,
    scheduleModalTarget,
    setScheduleModalTarget,
    scheduleDraft,
    formatScheduleLabel,

    handleOpenAddressBook,
    handleSearchAddress,
    openScheduleModal,
    applyScheduledDatetime,
    applyImmediateSchedule,
    handleApplyFromRecent,
    handleSubmit,
    handleSelectCargoImages,
    handleRemoveCargoImage,
    handleSwap,
    handleAddressBookSelect,
    needsCompanySelect,
    selectedCompanyName,
    setSelectedCompanyName,
    selectedCompanyContactName,
    setSelectedCompanyContactName,
    selectedCompanyContactPhone,
    setSelectedCompanyContactPhone,
    notifyDefaultEnabled,
    applyNotifyDefaultToCurrentRequest,
    pickupNotify,
    setPickupNotify,
    dropoffNotify,
    setDropoffNotify,
  } = useRequestForm({
    isAuthenticated,
    userId: currentUser?.id ?? null,
    userRole: currentUser?.role ?? null,
    userCompanyName: currentUser?.companyName ?? null,
    mode,
    editRequestId,
    copyRequestId,
    onRequestCreated,
    onRequestUpdated,
  });

  const vehicleImageMap: Partial<Record<string, string>> = {
    MOTORCYCLE: motorcycleImg,
    DAMAS: damasImg,
    LABO: raboImg,
    ONE_TON_PLUS: oneTonPlusImg,
  };

  const vehicleGroupLabel = (g: string) => {
    switch (g) {
      case "MOTORCYCLE": return "오토바이";
      case "DAMAS": return "다마스";
      case "LABO": return "라보";
      case "ONE_TON_PLUS": return "1톤 이상";
      default: return g;
    }
  };
  const addressBookCompanyFilter =
    (needsCompanySelect ? selectedCompanyName : currentUser?.companyName)?.trim() || "";
  const isEditMode = mode === "edit" && editRequestId != null;
  const isCopyMode = mode === "copy" && copyRequestId != null;

  return (
    <>
      <form
        className={`request-form ${submitFlash ? "submit-success-flash" : ""}`}
        onSubmit={handleSubmit}
      >
        <div className="dispatch-layout">
          <div className="dispatch-main">
            {isEditMode && (
              <div className="dispatch-mode-banner" aria-live="polite">
                {`배차수정 · 요청 #${editRequestId}`}
              </div>
            )}
            {isCopyMode && (
              <div className="dispatch-mode-banner" aria-live="polite">
                {`배차복사 · 원본 요청 #${copyRequestId}`}
              </div>
            )}

            {/* ── 섹션 1: 업체선택 + 출발지/도착지 ── */}
            <section className="dispatch-panel">
              <RequestCompanySection
                visible={needsCompanySelect}
                companies={companies}
                groups={groups}
                selectedCompanyName={selectedCompanyName}
                selectedCompanyContactName={selectedCompanyContactName}
                selectedCompanyContactPhone={selectedCompanyContactPhone}
                setSelectedCompanyName={setSelectedCompanyName}
                setSelectedCompanyContactName={setSelectedCompanyContactName}
                setSelectedCompanyContactPhone={setSelectedCompanyContactPhone}
              />

              {/* 출발지 / 교환버튼 / 도착지 — 피그마: 1fr 70px 1fr */}
              <div className="dispatch-panel-grid">

                {/* 출발지 */}
                <div className="dispatch-card">
                  <div className="dispatch-card-title-row dispatch-card-title-row--pickup">
                    <div className="dispatch-card-title">출발지</div>
                    <div className="dispatch-alimtalk-wrap">
                      <button
                        type="button"
                        className={`ab-toggle-switch${notifyDefaultEnabled ? " is-on" : " is-off"}`}
                        onClick={() => applyNotifyDefaultToCurrentRequest(!notifyDefaultEnabled)}
                        aria-label="알림톡 자동발송 토글"
                        aria-pressed={notifyDefaultEnabled}
                      >
                        <span className={`ab-toggle-knob${notifyDefaultEnabled ? " is-on" : " is-off"}`} />
                      </button>
                      <span className="dispatch-alimtalk-label">알림톡 자동발송</span>
                    </div>
                  </div>
                  <div className="dispatch-fields">
                    {/* 주소검색 */}
                    <div className="dispatch-address-row">
                      <div className="dispatch-address-input">
                        <button
                          type="button"
                          className={`dispatch-address-display${pickupAddress ? "" : " is-placeholder"}`}
                          onClick={() => handleSearchAddress("pickup")}
                          aria-label="출발지 주소 검색"
                          title={pickupAddress || "주소 검색*"}
                        >
                          {pickupAddress || "주소 검색*"}
                        </button>
                        <button
                          type="button"
                          className="dispatch-icon-in-input"
                          onClick={() => handleSearchAddress("pickup")}
                          aria-label="주소 검색"
                        >
                          <SearchIcon size={16} />
                        </button>
                        <button
                          type="button"
                          className="dispatch-addressbook-infield"
                          onClick={() => handleOpenAddressBook("pickup")}
                        >
                          주소록
                        </button>
                      </div>
                    </div>

                    {/* 상세주소 / 출발지명 */}
                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={pickupAddressDetail}
                        onChange={(e) => setPickupAddressDetail(e.target.value)}
                        placeholder="상세주소*"
                      />
                      <input
                        type="text"
                        value={pickupPlaceName}
                        onChange={(e) => setPickupPlaceName(e.target.value)}
                        placeholder="출발지명*"
                      />
                    </div>

                    {/* 담당자명 / 연락처 */}
                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={pickupContactName}
                        onChange={(e) => setPickupContactName(e.target.value)}
                        placeholder="담당자명"
                      />
                      <input
                        type="tel"
                        value={pickupContactPhone}
                        onChange={(e) => setPickupContactPhone(e.target.value)}
                        placeholder="연락처*"
                      />
                    </div>

                    {/* 상차방법 */}
                    <select
                      className="dispatch-full"
                      value={pickupMethod}
                      onChange={(e) => setPickupMethod(e.target.value as any)}
                    >
                      <option value="">상차방법*</option>
                      <option value="MANUAL">수작업</option>
                      <option value="FORKLIFT">지게차</option>
                      <option value="SUDOU_SUHAEJUNG">수도움/수해줌</option>
                      <option value="HOIST">호이스트</option>
                      <option value="CRANE">크레인</option>
                      <option value="CONVEYOR">컨베이어</option>
                    </select>

                    {/* 예약/알림 — 피그마: [1fr 흰박스(라벨+링크)] [40px 벨버튼] */}
                    <div className="dispatch-card-footer">
                      <div className="dispatch-card-footer-inner">
                        <span className="dispatch-immediate-label">
                          {formatScheduleLabel(pickupIsImmediate, pickupDatetime, "pickup")}
                        </span>
                        <button
                          type="button"
                          className="dispatch-link"
                          onClick={() => openScheduleModal("pickup")}
                        >
                          상차시간 설정하기(예약)
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`dispatch-bell-btn${pickupNotify ? " active" : ""}`}
                        onClick={() => setPickupNotify((v) => !v)}
                        title={pickupNotify ? "상차 알림 켜짐" : "상차 알림 꺼짐"}
                        aria-label="상차 알림 토글"
                      >
                        {pickupNotify
                          ? <Bell size={18} />
                          : <BellOff size={18} />
                        }
                      </button>
                    </div>
                  </div>
                </div>

                {/* 교환 버튼 — 피그마: 중앙, 세로 가운데 */}
                <button
                  type="button"
                  className="dispatch-swap"
                  aria-label="출발지/도착지 교체"
                  onClick={handleSwap}
                >
                  <SwapIcon />
                </button>

                {/* 도착지 */}
                <div className="dispatch-card">
                  <div className="dispatch-card-title">도착지</div>
                  <div className="dispatch-fields">
                    {/* 주소검색 */}
                    <div className="dispatch-address-row">
                      <div className="dispatch-address-input">
                        <button
                          type="button"
                          className={`dispatch-address-display${dropoffAddress ? "" : " is-placeholder"}`}
                          onClick={() => handleSearchAddress("dropoff")}
                          aria-label="도착지 주소 검색"
                          title={dropoffAddress || "주소 검색*"}
                        >
                          {dropoffAddress || "주소 검색*"}
                        </button>
                        <button
                          type="button"
                          className="dispatch-icon-in-input"
                          onClick={() => handleSearchAddress("dropoff")}
                          aria-label="주소 검색"
                        >
                          <SearchIcon size={16} />
                        </button>
                        <button
                          type="button"
                          className="dispatch-addressbook-infield"
                          onClick={() => handleOpenAddressBook("dropoff")}
                        >
                          주소록
                        </button>
                      </div>
                    </div>

                    {/* 상세주소 / 도착지명 */}
                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={dropoffAddressDetail}
                        onChange={(e) => setDropoffAddressDetail(e.target.value)}
                        placeholder="상세주소*"
                      />
                      <input
                        type="text"
                        value={dropoffPlaceName}
                        onChange={(e) => setDropoffPlaceName(e.target.value)}
                        placeholder="도착지명*"
                      />
                    </div>

                    {/* 담당자명 / 연락처 */}
                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={dropoffContactName}
                        onChange={(e) => setDropoffContactName(e.target.value)}
                        placeholder="담당자명"
                      />
                      <input
                        type="tel"
                        value={dropoffContactPhone}
                        onChange={(e) => setDropoffContactPhone(e.target.value)}
                        placeholder="연락처*"
                      />
                    </div>

                    {/* 하차방법 */}
                    <select
                      className="dispatch-full"
                      value={dropoffMethod}
                      onChange={(e) => setDropoffMethod(e.target.value as any)}
                    >
                      <option value="">하차방법*</option>
                      <option value="MANUAL">수작업</option>
                      <option value="FORKLIFT">지게차</option>
                      <option value="SUDOU_SUHAEJUNG">수도움/수해줌</option>
                      <option value="HOIST">호이스트</option>
                      <option value="CRANE">크레인</option>
                      <option value="CONVEYOR">컨베이어</option>
                    </select>

                    {/* 예약/알림 */}
                    <div className="dispatch-card-footer">
                      <div className="dispatch-card-footer-inner">
                        <span className="dispatch-immediate-label">
                          {formatScheduleLabel(dropoffIsImmediate, dropoffDatetime, "dropoff")}
                        </span>
                        <button
                          type="button"
                          className="dispatch-link"
                          onClick={() => openScheduleModal("dropoff")}
                        >
                          하차시간 설정하기(예약)
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`dispatch-bell-btn${dropoffNotify ? " active" : ""}`}
                        onClick={() => setDropoffNotify((v) => !v)}
                        title={dropoffNotify ? "하차 알림 켜짐" : "하차 알림 꺼짐"}
                        aria-label="하차 알림 토글"
                      >
                        {dropoffNotify
                          ? <Bell size={18} />
                          : <BellOff size={18} />
                        }
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ── 섹션 2: 최근 배차내역 ── */}
            {!isEditMode && (
              <RequestRecentPanel
                recentLoading={recentLoading}
                recentError={recentError}
                recentRequests={recentRequests}
                applyingId={applyingId}
                onApply={handleApplyFromRecent}
              />
            )}

            {/* ── 섹션 3: 차량선택 / 화물 / 결제 ── */}
            <section className="dispatch-panel">
              <div className="dispatch-bottom-grid">
                <div className="dispatch-card dispatch-vehicle-section">
                  <div className="dispatch-card-title">차량선택</div>

                  <div className="dispatch-vehicle-grid">
                    {(["MOTORCYCLE", "DAMAS", "LABO", "ONE_TON_PLUS"] as const).map((g) => (
                      <button
                        key={g}
                        type="button"
                        className={`dispatch-vehicle-card${vehicleGroup === g ? " active" : ""}`}
                        onClick={() => setVehicleGroup(g)}
                      >
                        <div className="dispatch-vehicle-label">{vehicleGroupLabel(g)}</div>
                        <div className="dispatch-vehicle-photo" aria-hidden="true">
                          {vehicleImageMap[g] ? (
                            <img src={vehicleImageMap[g]} alt="" className="dispatch-vehicle-photo-img" />
                          ) : null}
                        </div>
                      </button>
                    ))}
                  </div>

                  {vehicleGroup && currentVehicleInfo && (() => {
                    const info = currentVehicleInfo;
                    if (!info) return null;

                    if (vehicleGroup === "MOTORCYCLE") {
                      return (
                        <div className="dispatch-vehicle-controls">
                          <select
                            className="dispatch-vehicle-select"
                            value={vehicleBodyType}
                            onChange={(e) => setVehicleBodyType(e.target.value)}
                          >
                            <option value="일반">일반</option>
                            <option value="짐바리">짐바리</option>
                          </select>
                          <select
                            className="dispatch-vehicle-select dispatch-vehicle-select-fixed"
                            disabled
                          >
                            <option>오토바이</option>
                          </select>
                        </div>
                      );
                    }

                    if (vehicleGroup === "DAMAS") {
                      return (
                        <div className="dispatch-vehicle-controls">
                          <select className="dispatch-vehicle-select dispatch-vehicle-select-fixed" disabled>
                            <option>0.3톤</option>
                          </select>
                          <select className="dispatch-vehicle-select dispatch-vehicle-select-fixed" disabled>
                            <option>다마스</option>
                          </select>
                        </div>
                      );
                    }

                    if (vehicleGroup === "LABO") {
                      return (
                        <div className="dispatch-vehicle-controls">
                          <select className="dispatch-vehicle-select dispatch-vehicle-select-fixed" disabled>
                            <option>0.5톤</option>
                          </select>
                          <select className="dispatch-vehicle-select dispatch-vehicle-select-fixed" disabled>
                            <option>라보</option>
                          </select>
                        </div>
                      );
                    }

                    if (vehicleGroup === "ONE_TON_PLUS") {
                      return (
                        <div className="dispatch-vehicle-controls">
                          <select
                            className="dispatch-vehicle-select"
                            value={vehicleTonnage === "" ? "" : String(vehicleTonnage)}
                            onChange={(e) =>
                              setVehicleTonnage(e.target.value === "" ? "" : Number(e.target.value))
                            }
                          >
                            <option value="">차량톤수</option>
                            {vehicleTonOptions.map((opt) => (
                              <option key={opt.label} value={String(opt.value)}>{opt.label}</option>
                            ))}
                          </select>
                          <select
                            className="dispatch-vehicle-select"
                            value={vehicleBodyType}
                            onChange={(e) => setVehicleBodyType(e.target.value)}
                          >
                            <option value="">차량종류</option>
                            {vehicleTypeOptions.map((t) => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  <div className="dispatch-vehicle-hint">
                    {vehicleInfoText}
                  </div>
                </div>

                <div className="dispatch-card dispatch-cargo-card">
                  <div className="dispatch-card-title-row">
                    <div className="dispatch-card-title">화물내용</div>
                    <button
                      type="button"
                      className="dispatch-cargo-image-btn"
                      onClick={() => setCargoImageModalOpen(true)}
                    >
                      이미지 추가{cargoImages.length > 0 ? ` (${cargoImages.length})` : ""}
                    </button>
                  </div>
                  <textarea
                    value={cargoDescription}
                    onChange={(e) => setCargoDescription(e.target.value)}
                    className="dispatch-cargo-textarea"
                    placeholder="화물내용 (ex: 3파렛트, 2박스 등)"
                  />
                </div>

                <div className="dispatch-card dispatch-special-section dispatch-wide">
                  <div className="dispatch-card-title">특이사항</div>
                  <div className="dispatch-request-type-row">
                    {([["NORMAL", "기본"], ["URGENT", "긴급"], ["DIRECT", "혼적"], ["ROUND_TRIP", "왕복"]] as const).map(
                      ([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          className={`dispatch-tab${requestType === v ? " active" : ""}`}
                          onClick={() => setRequestType(v)}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                  <input
                    type="text"
                    value={driverNote}
                    onChange={(e) => setDriverNote(e.target.value)}
                    className="dispatch-driver-note"
                    placeholder="기사요청사항 (ex: 도착 전 전화 주세요)"
                  />
                </div>

                <div className="dispatch-card dispatch-payment-card">
                  <div className="dispatch-card-title">결제방법</div>
                  <div className="dispatch-pay-grid">
                    {([["CREDIT", "신용"], ["CARD", "카드"], ["PREPAID", "선불"], ["COLLECT", "착불"]] as const).map(
                      ([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          className={`dispatch-pay-btn${paymentUi === v ? " active" : ""}`}
                          onClick={() => setPaymentUi(v)}
                        >
                          {label}
                        </button>
                      )
                    )}
                  </div>
                  <p className="dispatch-payment-note">
                    ※ 결제방법에 따라 VAT 별도입니다.
                  </p>
                </div>
              </div>
            </section>

            {/* ── Footer: 예상거리/요금 + 접수하기 ── */}
            {/* 피그마: 우측 정렬, 요금약관확인하기는 예상요금 위 floating pill */}
            <div className="dispatch-footer">
              <div className="dispatch-metrics-wrap">
                {/* 요금약관확인하기 pill — 피그마 위치: 예상요금 카드 위 */}
                <div className="dispatch-fare-rule-row">
                  <button
                    type="button"
                    className="dispatch-quote-pill"
                    onClick={() => setFareRuleOpen(true)}
                  >
                    요금약관 확인하기
                  </button>
                </div>

                {/* 예상거리 + 예상요금 카드 */}
                <div className="dispatch-metrics">
                  <div className="dispatch-metric-card">
                    <span className="dispatch-metric-label">예상거리</span>
                    <span className="dispatch-metric-value">
                      {calculating ? "계산 중..." : distanceKm != null ? `${distanceKm.toFixed(2)} km` : "-"}
                    </span>
                  </div>
                  <div className="dispatch-metric-card">
                    <span className="dispatch-metric-label">예상요금</span>
                    <span className="dispatch-metric-value dispatch-metric-accent">
                      {calculating ? "계산 중..." : quotedPrice !== "" ? `${Number(quotedPrice).toLocaleString()} 원` : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="dispatch-submit-big"
                disabled={submitting}
              >
                {submitting
                  ? isEditMode
                    ? "수정 중..."
                    : "접수 중..."
                  : isEditMode
                  ? "수정하기"
                  : "접수하기"}
              </button>
            </div>

            {message && <p className="dispatch-message ok">{message}</p>}
            {error && <p className="dispatch-message err">{error}</p>}
          </div>
        </div>
      </form>

      <CargoImageModal
        cargoImageModalOpen={cargoImageModalOpen}
        cargoImages={cargoImages}
        setCargoImageModalOpen={setCargoImageModalOpen}
        handleSelectCargoImages={handleSelectCargoImages}
        handleRemoveCargoImage={handleRemoveCargoImage}
      />

      <ScheduleModal
        scheduleModalTarget={scheduleModalTarget}
        scheduleDraft={scheduleDraft}
        setScheduleModalTarget={setScheduleModalTarget}
        applyImmediateSchedule={applyImmediateSchedule}
        applyScheduledDatetime={applyScheduledDatetime}
      />

      <FareRuleModal
        open={fareRuleOpen}
        onClose={() => setFareRuleOpen(false)}
      />

      <AddressBookModal
        isOpen={addressBookModalTarget !== null}
        title={
          addressBookModalTarget === "pickup" ? "출발지 주소록 선택"
          : addressBookModalTarget === "dropoff" ? "도착지 주소록 선택"
          : "주소록 선택"
        }
        targetType={addressBookModalTarget}
        companyName={addressBookCompanyFilter || null}
        onClose={() => setAddressBookModalTarget(null)}
        onSelect={handleAddressBookSelect}
      />
    </>
  );
}
