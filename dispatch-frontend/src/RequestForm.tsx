// src/RequestForm.tsx
import { AddressBookModal } from "./AddressBookModal";
import { SearchIcon, SwapIcon } from "./ui/icons";
import motorcycleImg from "./img/오토바이.png";
import damasImg from "./img/다마스.png";
import raboImg from "./img/라보.png";
import oneTonPlusImg from "./img/1톤이상.png";
import { useRequestForm } from "./hooks/useRequestForm";
import type { VehicleGroup } from "./hooks/useRequestForm";
import { CargoImageModal } from "./components/CargoImageModal";
import { ScheduleModal } from "./components/ScheduleModal";

declare global {
  interface Window {
    daum: any;
  }
}

type RequestFormProps = {
  isAuthenticated?: boolean;
  replayRequestId?: number | null;
  onReplayRequestHandled?: () => void;
  onRequestCreated?: () => void;
};

export function RequestForm({
  isAuthenticated = false,
  replayRequestId = null,
  onReplayRequestHandled,
  onRequestCreated,
}: RequestFormProps) {
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
    vehicleBodyTypeOptions,
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
    setScheduleDraft,
    formatScheduleLabel,
    vehicleLabel,
    handleOpenAddressBook,
    handleSearchAddress,
    openScheduleModal,
    applyScheduledDatetime,
    applyImmediateSchedule,
    handleCalculateDistance,
    handleApplyFromRecent,
    handleSubmit,
    handleSelectCargoImages,
    handleRemoveCargoImage,
    handleSwap,
    handleAddressBookSelect,
  } = useRequestForm({
    isAuthenticated,
    replayRequestId,
    onReplayRequestHandled,
    onRequestCreated,
  });

  const vehicleImageMap: Record<VehicleGroup, string | undefined> = {
    MOTORCYCLE: motorcycleImg,
    DAMAS: damasImg,
    LABO: raboImg,
    ONE_TON_PLUS: oneTonPlusImg,
    FIVE_TON: undefined,
    ELEVEN_TON: undefined,
  };

  return (
    <>
      <form
        className={`request-form ${submitFlash ? "submit-success-flash" : ""}`}
        onSubmit={handleSubmit}
      >
        <div className="dispatch-layout">
          <div className="dispatch-main">
            <section className="dispatch-panel">
              <div className="dispatch-panel-grid">
                <div className="dispatch-card">
                  <div className="dispatch-card-title">출발지</div>
                  <div className="dispatch-fields dispatch-location-grid">
                    <div className="dispatch-address-row">
                      <div className="dispatch-address-input">
                        <input
                          type="text"
                          value={pickupAddress}
                          readOnly
                          className="dispatch-address-field dispatch-address-readonly"
                          placeholder="주소* (돋보기 또는 주소록으로 입력)"
                        />
                        <button
                          type="button"
                          className="dispatch-icon-in-input"
                          onClick={() => handleSearchAddress("pickup")}
                          aria-label="주소 검색"
                        >
                          <SearchIcon size={18} />
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

                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={pickupAddressDetail}
                        onChange={(e) => setPickupAddressDetail(e.target.value)}
                        className="dispatch-detail-field"
                        placeholder="상세주소*"
                      />
                      <input
                        type="text"
                        value={pickupPlaceName}
                        onChange={(e) => setPickupPlaceName(e.target.value)}
                        className="dispatch-name-field"
                        placeholder="출발지명*"
                      />
                    </div>

                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={pickupContactName}
                        onChange={(e) => setPickupContactName(e.target.value)}
                        className="dispatch-half-field"
                        placeholder="담당자명"
                      />
                      <input
                        type="tel"
                        value={pickupContactPhone}
                        onChange={(e) => setPickupContactPhone(e.target.value)}
                        className="dispatch-half-field"
                        placeholder="연락처*"
                      />
                    </div>

                    <select
                      className="dispatch-full"
                      value={pickupMethod}
                      onChange={(e) => setPickupMethod(e.target.value as any)}
                    >
                      <option value="">상차방법*</option>
                      <option value="MANUAL">수작업 상차</option>
                      <option value="FORKLIFT">지게차 상차</option>
                      <option value="SUDOU_SUHAEJUNG">수동 수해중</option>
                      <option value="HOIST">호이스트</option>
                      <option value="CRANE">크레인</option>
                      <option value="CONVEYOR">컨베이어</option>
                    </select>

                    <div className="dispatch-card-footer">
                      <div className="dispatch-immediate-label">
                        {formatScheduleLabel(pickupIsImmediate, pickupDatetime, "pickup")}
                      </div>
                      <button
                        type="button"
                        className="dispatch-link"
                        onClick={() => openScheduleModal("pickup")}
                      >
                        상차시간 설정하기(예약)
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="dispatch-swap"
                  aria-label="출발지/도착지 교체"
                  onClick={handleSwap}
                >
                  <SwapIcon />
                </button>

                <div className="dispatch-card">
                  <div className="dispatch-card-title">도착지</div>
                  <div className="dispatch-fields dispatch-location-grid">
                    <div className="dispatch-address-row">
                      <div className="dispatch-address-input">
                        <input
                          type="text"
                          value={dropoffAddress}
                          readOnly
                          className="dispatch-address-field dispatch-address-readonly"
                          placeholder="주소* (돋보기 또는 주소록으로 입력)"
                        />
                        <button
                          type="button"
                          className="dispatch-icon-in-input"
                          onClick={() => handleSearchAddress("dropoff")}
                          aria-label="주소 검색"
                        >
                          <SearchIcon size={18} />
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

                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={dropoffAddressDetail}
                        onChange={(e) => setDropoffAddressDetail(e.target.value)}
                        className="dispatch-detail-field"
                        placeholder="상세주소*"
                      />
                      <input
                        type="text"
                        value={dropoffPlaceName}
                        onChange={(e) => setDropoffPlaceName(e.target.value)}
                        className="dispatch-name-field"
                        placeholder="도착지명*"
                      />
                    </div>

                    <div className="dispatch-two-col">
                      <input
                        type="text"
                        value={dropoffContactName}
                        onChange={(e) => setDropoffContactName(e.target.value)}
                        className="dispatch-half-field"
                        placeholder="담당자명"
                      />
                      <input
                        type="tel"
                        value={dropoffContactPhone}
                        onChange={(e) => setDropoffContactPhone(e.target.value)}
                        className="dispatch-half-field"
                        placeholder="연락처*"
                      />
                    </div>

                    <select
                      className="dispatch-full"
                      value={dropoffMethod}
                      onChange={(e) => setDropoffMethod(e.target.value as any)}
                    >
                      <option value="">하차방법*</option>
                      <option value="MANUAL">수작업 하차</option>
                      <option value="FORKLIFT">지게차 하차</option>
                      <option value="SUDOU_SUHAEJUNG">수동 수해중</option>
                      <option value="HOIST">호이스트</option>
                      <option value="CRANE">크레인</option>
                      <option value="CONVEYOR">컨베이어</option>
                    </select>

                    <div className="dispatch-card-footer">
                      <div className="dispatch-immediate-label">
                        {formatScheduleLabel(dropoffIsImmediate, dropoffDatetime, "dropoff")}
                      </div>
                      <button
                        type="button"
                        className="dispatch-link"
                        onClick={() => openScheduleModal("dropoff")}
                      >
                        하차시간 설정하기(예약)
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="dispatch-panel request-recent-inline-wrap">
              <div className="request-recent-panel request-recent-inline">
                <div className="request-recent-header">
                  <span>최근 배차내역</span>
                </div>

                {recentLoading && <p>불러오는 중...</p>}
                {recentError && null}

                {!recentLoading &&
                  !recentError &&
                  recentRequests.length === 0 && (
                    <p style={{ color: "#777" }}>
                      최근 배차내역이 없습니다.
                    </p>
                  )}

                {!recentLoading &&
                  !recentError &&
                  recentRequests.length > 0 && (
                    <div className="request-recent-list">
                      {recentRequests.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleApplyFromRecent(r.id)}
                          disabled={applyingId === r.id}
                          className="request-recent-item"
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "#999",
                              marginBottom: 4,
                            }}
                          >
                            #{r.id} ·{" "}
                            {new Date(r.createdAt).toLocaleString(
                              "ko-KR",
                              {
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </div>
                          <div
                            style={{
                              fontWeight: 500,
                              fontSize: 13,
                            }}
                          >
                            {r.pickupPlaceName} →{" "}
                            {r.dropoffPlaceName}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              color: "#666",
                              marginTop: 2,
                            }}
                          >
                            거리:{" "}
                            {r.distanceKm != null
                              ? `${r.distanceKm.toFixed(1)} km`
                              : "-"}
                            {" · "}요금:{" "}
                            {r.quotedPrice != null
                              ? `${r.quotedPrice.toLocaleString()}원`
                              : "-"}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
              </div>
            </section>

            <section className="dispatch-panel">
              <div className="dispatch-bottom-grid">
                <div className="dispatch-bottom-col">
                  <div className="dispatch-card">
                    <div className="dispatch-card-title">차량선택</div>
                    <div className="dispatch-vehicle-grid">
                      {(
                        ["MOTORCYCLE", "DAMAS", "LABO", "ONE_TON_PLUS"] as VehicleGroup[]
                      ).map((g) => (
                        <button
                          key={g}
                          type="button"
                          className={`dispatch-vehicle-card ${vehicleGroup === g ? "active" : ""}`}
                          onClick={() =>
                            setVehicleGroup((prev) => (prev === g ? "" : g))
                          }
                        >
                          <div className="dispatch-vehicle-label">{vehicleLabel(g)}</div>
                          <div className="dispatch-vehicle-photo" aria-hidden="true">
                            {vehicleImageMap[g] ? (
                              <img
                                src={vehicleImageMap[g]}
                                alt=""
                                className="dispatch-vehicle-photo-img"
                              />
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="dispatch-vehicle-controls">
                      <select
                        value={vehicleTonnage === "" ? "" : String(vehicleTonnage)}
                        onChange={(e) =>
                          setVehicleTonnage(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                      >
                        <option value="">차량톤수</option>
                        <option value="0.5">0.5톤</option>
                        <option value="1">1톤</option>
                        <option value="1.4">1.4톤</option>
                        <option value="2.5">2.5톤</option>
                        <option value="3.5">3.5톤</option>
                        <option value="5">5톤</option>
                        <option value="11">11톤</option>
                      </select>
                      <select
                        value={vehicleBodyType}
                        onChange={(e) => setVehicleBodyType(e.target.value)}
                      >
                        {vehicleBodyType === "" && <option value="">차량종류</option>}
                        {vehicleBodyTypeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="dispatch-vehicle-hint">
                      차량을 선택하면 차량견적을 알려드려요
                    </div>
                  </div>

                  <div className="dispatch-card dispatch-wide">
                    <div className="dispatch-card-title">특이사항</div>
                    <div className="dispatch-request-type-row">
                      {(
                        [
                          ["NORMAL", "기본"],
                          ["URGENT", "긴급"],
                          ["DIRECT", "혼적"],
                          ["ROUND_TRIP", "왕복"],
                        ] as const
                      ).map(([v, label]) => (
                        <button
                          key={v}
                          type="button"
                          className={`dispatch-tab ${requestType === v ? "active" : ""}`}
                          onClick={() => setRequestType(v)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={driverNote}
                      onChange={(e) => setDriverNote(e.target.value)}
                      className="dispatch-driver-note"
                      placeholder="기사요청사항 (ex: 도착 전 전화 주세요, 파손에 각별히 주의해주세요)"
                    />
                  </div>
                </div>

                <div className="dispatch-bottom-col">
                  <div className="dispatch-card">
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

                  <div className="dispatch-card">
                    <div className="dispatch-card-title">결제방법</div>
                    <div className="dispatch-pay-grid">
                      <button
                        type="button"
                        className={`dispatch-pay-btn ${paymentUi === "CREDIT" ? "active" : ""}`}
                        onClick={() => setPaymentUi("CREDIT")}
                      >
                        신용
                      </button>
                      <button
                        type="button"
                        className={`dispatch-pay-btn ${paymentUi === "CARD" ? "active" : ""}`}
                        onClick={() => setPaymentUi("CARD")}
                      >
                        카드
                      </button>
                      <button
                        type="button"
                        className={`dispatch-pay-btn ${paymentUi === "PREPAID" ? "active" : ""}`}
                        onClick={() => setPaymentUi("PREPAID")}
                      >
                        선불
                      </button>
                      <button
                        type="button"
                        className={`dispatch-pay-btn ${paymentUi === "COLLECT" ? "active" : ""}`}
                        onClick={() => setPaymentUi("COLLECT")}
                      >
                        착불
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="dispatch-footer">
              <div className="dispatch-metrics-wrap">
                <button
                  type="button"
                  className="dispatch-quote-pill"
                  onClick={handleCalculateDistance}
                  disabled={calculating}
                >
                  {calculating ? "계산 중..." : "요금약관 확인하기"}
                </button>

                <div className="dispatch-metrics">
                  <div className="dispatch-metric-card">
                    <span className="dispatch-metric-label">거리</span>
                    <span className="dispatch-metric-value">
                      {distanceKm != null ? `${distanceKm.toFixed(2)} km` : "-"}
                    </span>
                  </div>

                  <div className="dispatch-metric-card">
                    <span className="dispatch-metric-label">요금</span>
                    <span className="dispatch-metric-value dispatch-metric-accent">
                      {quotedPrice !== "" ? `${Number(quotedPrice).toLocaleString()} 원` : "-"}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="dispatch-submit-big"
                disabled={submitting}
              >
                {submitting ? "접수 중..." : "접수하기"}
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
        setScheduleDraft={setScheduleDraft}
        setScheduleModalTarget={setScheduleModalTarget}
        applyImmediateSchedule={applyImmediateSchedule}
        applyScheduledDatetime={applyScheduledDatetime}
      />

      {/* ✅ 주소록 모달 렌더링 */}
      <AddressBookModal
        isOpen={addressBookModalTarget !== null}
        title={
          addressBookModalTarget === "pickup"
            ? "출발지 주소록 선택"
            : addressBookModalTarget === "dropoff"
            ? "도착지 주소록 선택"
            : "주소록 선택"
        }
        onClose={() => setAddressBookModalTarget(null)}
        onSelect={handleAddressBookSelect}
      />
    </>
  );
}
