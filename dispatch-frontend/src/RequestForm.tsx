// src/RequestForm.tsx
import { useState, useEffect } from "react";
import {
  createRequest,
  getDistanceByAddress,
  listRecentRequests,
  getRequestDetail,
} from "./api/client";
import type {
  CreateRequestBody,
  DistanceResponse,
  AddressBookEntry,
  RequestSummary,
  RequestDetail,
} from "./api/types";
import { AddressBookModal } from "./AddressBookModal";

declare global {
  interface Window {
    daum: any;
  }
}

type Method =
  | "MANUAL"
  | "FORKLIFT"
  | "SUDOU_SUHAEJUNG"
  | "HOIST"
  | "CRANE"
  | "CONVEYOR";

type VehicleGroup =
  | "MOTORCYCLE"
  | "DAMAS"
  | "ONE_TON"
  | "ONE_TON_PLUS"
  | "FIVE_TON"
  | "ELEVEN_TON";

type RequestType = "NORMAL" | "URGENT";
type PaymentMethod = "CARD" | "CASH" | "BANK_TRANSFER";

export function RequestForm() {
  // ✅ 어떤 필드에서 주소록을 여는지 기억 (null이면 모달 닫힘)
  const [addressBookModalTarget, setAddressBookModalTarget] =
    useState<"pickup" | "dropoff" | null>(null);

  // ✅ 최근 배차내역 관련 상태
  const [recentRequests, setRecentRequests] = useState<RequestSummary[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [applyingId, setApplyingId] = useState<number | null>(null);

  // 출발지
  const [pickupPlaceName, setPickupPlaceName] = useState("출발 센터A");
  const [pickupAddress, setPickupAddress] = useState("인천 서구 테스트로 100");
  const [pickupAddressDetail, setPickupAddressDetail] =
    useState("1층 램프앞");
  const [pickupContactName, setPickupContactName] = useState("홍길동");
  const [pickupContactPhone, setPickupContactPhone] =
    useState("010-0000-0000");
  const [pickupMethod, setPickupMethod] = useState<Method>("MANUAL");
  const [pickupIsImmediate, setPickupIsImmediate] = useState(true);
  const [pickupDatetime, setPickupDatetime] = useState<string>("");

  // 도착지
  const [dropoffPlaceName, setDropoffPlaceName] =
    useState("도착 창고B");
  const [dropoffAddress, setDropoffAddress] =
    useState("서울 강남구 테스트로 200");
  const [dropoffAddressDetail, setDropoffAddressDetail] =
    useState("B동 하차장");
  const [dropoffContactName, setDropoffContactName] =
    useState("김철수");
  const [dropoffContactPhone, setDropoffContactPhone] =
    useState("010-1111-2222");
  const [dropoffMethod, setDropoffMethod] = useState<Method>("FORKLIFT");
  const [dropoffIsImmediate, setDropoffIsImmediate] = useState(false);
  const [dropoffDatetime, setDropoffDatetime] = useState<string>("");

  // 차량
  const [vehicleGroup, setVehicleGroup] =
    useState<VehicleGroup>("ONE_TON_PLUS");
  const [vehicleTonnage, setVehicleTonnage] = useState<number | "">("");
  const [vehicleBodyType, setVehicleBodyType] =
    useState<string>("탑차");

  // 화물 / 옵션
  const [cargoDescription, setCargoDescription] =
    useState("의류 박스 50개");
  const [requestType, setRequestType] = useState<RequestType>("NORMAL");
  const [driverNote, setDriverNote] = useState("");

  // 결제 / 거리 / 요금
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CARD");
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [quotedPrice, setQuotedPrice] = useState<number | "">("");

  // 상태
  const [calculating, setCalculating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ✅ 주소록 버튼 클릭 → 모달 열기
  const handleOpenAddressBook = (target: "pickup" | "dropoff") => {
    setAddressBookModalTarget(target);
  };

  // ✅ 카카오 주소 검색
  const handleSearchAddress = (target: "pickup" | "dropoff") => {
    if (!window.daum || !window.daum.Postcode) {
      alert("주소 검색 스크립트가 아직 로드되지 않았습니다.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: (data: any) => {
        const fullAddress = data.roadAddress || data.address; // 도로명 우선

        if (target === "pickup") {
          setPickupAddress(fullAddress);
        } else {
          setDropoffAddress(fullAddress);
        }
      },
    }).open();
  };

  // 🔹 최근 배차내역 불러오기
  const fetchRecentRequests = async () => {
    try {
      setRecentLoading(true);
      setRecentError(null);
      const data = await listRecentRequests(5); // 최근 5건
      setRecentRequests(data);
    } catch (err: any) {
      console.error(err);
      setRecentError(
        err?.message ||
          "최근 배차 내역을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentRequests();
  }, []);

  // 🔹 최근 배차내역 선택해서 폼에 적용
  const handleApplyFromRecent = async (id: number) => {
    try {
      setApplyingId(id);
      setError(null);

      const detail: RequestDetail = await getRequestDetail(id);

      // 출발지
      setPickupPlaceName(detail.pickupPlaceName);
      setPickupAddress(detail.pickupAddress);
      setPickupAddressDetail(detail.pickupAddressDetail ?? "");
      setPickupContactName(detail.pickupContactName ?? "");
      setPickupContactPhone(detail.pickupContactPhone ?? "");
      setPickupMethod(detail.pickupMethod as Method);
      setPickupIsImmediate(detail.pickupIsImmediate);
      setPickupDatetime(detail.pickupDatetime ?? "");

      // 도착지
      setDropoffPlaceName(detail.dropoffPlaceName);
      setDropoffAddress(detail.dropoffAddress);
      setDropoffAddressDetail(detail.dropoffAddressDetail ?? "");
      setDropoffContactName(detail.dropoffContactName ?? "");
      setDropoffContactPhone(detail.dropoffContactPhone ?? "");
      setDropoffMethod(detail.dropoffMethod as Method);
      setDropoffIsImmediate(detail.dropoffIsImmediate);
      setDropoffDatetime(detail.dropoffDatetime ?? "");

      // 차량
      if (detail.vehicleGroup) {
        setVehicleGroup(detail.vehicleGroup as VehicleGroup);
      }
      setVehicleTonnage(
        detail.vehicleTonnage != null ? detail.vehicleTonnage : ""
      );
      setVehicleBodyType(detail.vehicleBodyType ?? "");

      // 화물 / 옵션
      setCargoDescription(detail.cargoDescription ?? "");
      setRequestType(detail.requestType as RequestType);
      setDriverNote(detail.driverNote ?? "");

      // 결제 / 거리 / 요금
      if (detail.paymentMethod) {
        setPaymentMethod(detail.paymentMethod as PaymentMethod);
      }
      setDistanceKm(
        detail.distanceKm != null ? detail.distanceKm : null
      );
      setQuotedPrice(
        detail.quotedPrice != null ? detail.quotedPrice : ""
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "최근 배차 기록을 폼에 적용하는 중 오류가 발생했습니다."
      );
    } finally {
      setApplyingId(null);
    }
  };

  // 🔹 거리 계산 버튼 핸들러
  const handleCalculateDistance = async () => {
    if (!pickupAddress || !dropoffAddress) {
      setError("출발지/도착지 주소를 먼저 입력해 주세요.");
      return;
    }
    setError(null);
    setMessage(null);
    setCalculating(true);

    try {
      const res: DistanceResponse = await getDistanceByAddress(
        pickupAddress,
        dropoffAddress
      );

      if (!res || res.distanceKm == null) {
        throw new Error("거리 계산 결과가 없습니다.");
      }

      setDistanceKm(res.distanceKm);

      // 예시 요금 계산 로직 (km * 1500, 최소 30,000원)
      const basePrice = Math.max(30000, Math.round(res.distanceKm * 1500));
      setQuotedPrice(basePrice);

      setMessage(
        `거리 계산 성공: ${res.distanceKm.toFixed(
          1
        )} km 기준 예상 요금 ${basePrice.toLocaleString()}원`
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "거리 계산 중 오류가 발생했습니다. (네이버 API 또는 서버 오류)"
      );
    } finally {
      setCalculating(false);
    }
  };

  // 🔹 폼 제출(배차 요청 생성)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!pickupPlaceName || !pickupAddress) {
      setError("출발지 상호/주소는 필수입니다.");
      return;
    }
    if (!dropoffPlaceName || !dropoffAddress) {
      setError("도착지 상호/주소는 필수입니다.");
      return;
    }

    const body: CreateRequestBody = {
      pickup: {
        placeName: pickupPlaceName,
        address: pickupAddress,
        addressDetail: pickupAddressDetail || null,
        contactName: pickupContactName || null,
        contactPhone: pickupContactPhone || null,
        method: pickupMethod,
        isImmediate: pickupIsImmediate,
        datetime: pickupDatetime || null,
      },
      dropoff: {
        placeName: dropoffPlaceName,
        address: dropoffAddress,
        addressDetail: dropoffAddressDetail || null,
        contactName: dropoffContactName || null,
        contactPhone: dropoffContactPhone || null,
        method: dropoffMethod,
        isImmediate: dropoffIsImmediate,
        datetime: dropoffDatetime || null,
      },
      vehicle: {
        group: vehicleGroup,
        tonnage:
          vehicleTonnage === "" ? null : Number(vehicleTonnage),
        bodyType: vehicleBodyType || null,
      },
      cargo: {
        description: cargoDescription || null,
      },
      options: {
        requestType,
        driverNote: driverNote || null,
      },
      payment: {
        method: paymentMethod ?? undefined,
        distanceKm:
          distanceKm == null ? null : Number(distanceKm.toFixed(1)),
        quotedPrice:
          quotedPrice === "" ? null : Number(quotedPrice),
      },
    };

    setSubmitting(true);
    try {
      const created = await createRequest(body);
      setMessage(`배차 요청이 생성되었습니다. (ID: ${created.id})`);
      // 필요하면 여기에서 fetchRecentRequests() 호출해서 오른쪽 리스트 갱신해도 됨
      fetchRecentRequests();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || "배차 요청 생성 중 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <form className="request-form" onSubmit={handleSubmit}>
        {/* 🔹 왼쪽: 폼 / 오른쪽: 최근 배차내역 사이드바 */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 16,
          }}
        >
          {/* 왼쪽: 폼 전체 */}
          <div style={{ flex: 3 }}>
            {/* 상단: 출발지 / 도착지 */}
            <div className="request-form-top">
              {/* 출발지 */}
              <section className="form-section">
                <div className="form-section-title">출발지</div>
                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    type="text"
                    value={pickupPlaceName}
                    onChange={(e) =>
                      setPickupPlaceName(e.target.value)
                    }
                    placeholder="상호명"
                  />
                  {/* 주소 + 돋보기 + 주소록 버튼 */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    {/* 왼쪽: 인풋 + 돋보기 */}
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) =>
                          setPickupAddress(e.target.value)
                        }
                        placeholder="주소"
                        style={{ width: "100%", paddingRight: 32 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleSearchAddress("pickup")
                        }
                        aria-label="주소 검색"
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: 0,
                        }}
                      >
                        🔍
                      </button>
                    </div>

                    {/* 오른쪽: 주소록 버튼 */}
                    <button
                      type="button"
                      className="button-chip"
                      onClick={() =>
                        handleOpenAddressBook("pickup")
                      }
                    >
                      주소록
                    </button>
                  </div>
                  <input
                    type="text"
                    value={pickupAddressDetail}
                    onChange={(e) =>
                      setPickupAddressDetail(e.target.value)
                    }
                    placeholder="상세주소"
                  />
                  <input
                    type="text"
                    value={pickupContactName}
                    onChange={(e) =>
                      setPickupContactName(e.target.value)
                    }
                    placeholder="담당자명"
                  />
                  <input
                    type="tel"
                    value={pickupContactPhone}
                    onChange={(e) =>
                      setPickupContactPhone(e.target.value)
                    }
                    placeholder="연락처"
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <select
                      value={pickupMethod}
                      onChange={(e) =>
                        setPickupMethod(e.target.value as Method)
                      }
                    >
                      <option value="MANUAL">수작업 상차</option>
                      <option value="FORKLIFT">지게차 상차</option>
                      <option value="SUDOU_SUHAEJUNG">
                        수동 수해중
                      </option>
                      <option value="HOIST">호이스트</option>
                      <option value="CRANE">크레인</option>
                      <option value="CONVEYOR">컨베이어</option>
                    </select>

                    <label
                      style={{
                        fontSize: 12,
                        display: "flex",
                        gap: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={pickupIsImmediate}
                        onChange={(e) =>
                          setPickupIsImmediate(e.target.checked)
                        }
                      />
                      즉시 상차
                    </label>
                  </div>

                  {!pickupIsImmediate && (
                    <input
                      type="datetime-local"
                      value={pickupDatetime}
                      onChange={(e) =>
                        setPickupDatetime(e.target.value)
                      }
                    />
                  )}
                </div>
              </section>

              {/* 도착지 */}
              <section className="form-section">
                <div className="form-section-title">도착지</div>
                <div style={{ display: "grid", gap: 6 }}>
                  <input
                    type="text"
                    value={dropoffPlaceName}
                    onChange={(e) =>
                      setDropoffPlaceName(e.target.value)
                    }
                    placeholder="상호명"
                  />
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ position: "relative", flex: 1 }}>
                      <input
                        type="text"
                        value={dropoffAddress}
                        onChange={(e) =>
                          setDropoffAddress(e.target.value)
                        }
                        placeholder="주소"
                        style={{ width: "100%", paddingRight: 32 }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleSearchAddress("dropoff")
                        }
                        aria-label="주소 검색"
                        style={{
                          position: "absolute",
                          right: 8,
                          top: "50%",
                          transform: "translateY(-50%)",
                          border: "none",
                          background: "transparent",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: 0,
                        }}
                      >
                        🔍
                      </button>
                    </div>

                    <button
                      type="button"
                      className="button-chip"
                      onClick={() =>
                        handleOpenAddressBook("dropoff")
                      }
                    >
                      주소록
                    </button>
                  </div>
                  <input
                    type="text"
                    value={dropoffAddressDetail}
                    onChange={(e) =>
                      setDropoffAddressDetail(e.target.value)
                    }
                    placeholder="상세주소"
                  />
                  <input
                    type="text"
                    value={dropoffContactName}
                    onChange={(e) =>
                      setDropoffContactName(e.target.value)
                    }
                    placeholder="담당자명"
                  />
                  <input
                    type="tel"
                    value={dropoffContactPhone}
                    onChange={(e) =>
                      setDropoffContactPhone(e.target.value)
                    }
                    placeholder="연락처"
                  />

                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      marginTop: 4,
                    }}
                  >
                    <select
                      value={dropoffMethod}
                      onChange={(e) =>
                        setDropoffMethod(e.target.value as Method)
                      }
                    >
                      <option value="MANUAL">수작업 하차</option>
                      <option value="FORKLIFT">지게차 하차</option>
                      <option value="SUDOU_SUHAEJUNG">
                        수동 수해중
                      </option>
                      <option value="HOIST">호이스트</option>
                      <option value="CRANE">크레인</option>
                      <option value="CONVEYOR">컨베이어</option>
                    </select>

                    <label
                      style={{
                        fontSize: 12,
                        display: "flex",
                        gap: 4,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={dropoffIsImmediate}
                        onChange={(e) =>
                          setDropoffIsImmediate(e.target.checked)
                        }
                      />
                      즉시 하차
                    </label>
                  </div>

                  {!dropoffIsImmediate && (
                    <input
                      type="datetime-local"
                      value={dropoffDatetime}
                      onChange={(e) =>
                        setDropoffDatetime(e.target.value)
                      }
                    />
                  )}
                </div>
              </section>
            </div>

            {/* 하단: 차량 / 특이사항 / 결제 */}
            <div className="request-form-bottom">
              {/* 차량 선택 */}
              <section className="form-section">
                <div className="form-section-title">차량 선택</div>

                <div
                  className="button-group"
                  style={{ marginBottom: 8 }}
                >
                  {(
                    [
                      "MOTORCYCLE",
                      "DAMAS",
                      "ONE_TON",
                      "ONE_TON_PLUS",
                    ] as VehicleGroup[]
                  ).map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={
                        "button-chip" +
                        (vehicleGroup === g ? " active" : "")
                      }
                      onClick={() => setVehicleGroup(g)}
                    >
                      {g === "MOTORCYCLE" && "오토바이"}
                      {g === "DAMAS" && "다마스"}
                      {g === "ONE_TON" && "1톤"}
                      {g === "ONE_TON_PLUS" && "1톤 이상"}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    value={vehicleTonnage}
                    onChange={(e) =>
                      setVehicleTonnage(
                        e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                      )
                    }
                    placeholder="톤수 (예: 1.4)"
                  />
                  <input
                    type="text"
                    value={vehicleBodyType}
                    onChange={(e) =>
                      setVehicleBodyType(e.target.value)
                    }
                    placeholder="차량 종류 (예: 탑차)"
                  />
                </div>
              </section>

              {/* 화물/특이사항 */}
              <section className="form-section">
                <div className="form-section-title">
                  화물 내용 / 특이사항
                </div>

                <textarea
                  value={cargoDescription}
                  onChange={(e) =>
                    setCargoDescription(e.target.value)
                  }
                  placeholder="화물 내용 (예: 의류 3파렛트, 건조기 2대 등)"
                />

                <div style={{ marginTop: 8 }}>
                  <div
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    요청 타입
                  </div>
                  <div className="button-group">
                    <button
                      type="button"
                      className={
                        "button-chip" +
                        (requestType === "NORMAL"
                          ? " active"
                          : "")
                      }
                      onClick={() => setRequestType("NORMAL")}
                    >
                      기본
                    </button>
                    <button
                      type="button"
                      className={
                        "button-chip" +
                        (requestType === "URGENT"
                          ? " active"
                          : "")
                      }
                      onClick={() => setRequestType("URGENT")}
                    >
                      긴급
                    </button>
                  </div>
                </div>

                <textarea
                  style={{ marginTop: 8 }}
                  value={driverNote}
                  onChange={(e) =>
                    setDriverNote(e.target.value)
                  }
                  placeholder="기사님 전달사항 (예: 후진 진입, 출입증 발급 필요 등)"
                />
              </section>

              {/* 결제 / 거리 / 요금 */}
              <section className="form-section">
                <div className="form-section-title">
                  결제 / 거리 / 요금
                </div>

                <div style={{ marginBottom: 8 }}>
                  <div
                    style={{
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    결제 방법
                  </div>
                  <div className="button-group">
                    {(
                      [
                        "CARD",
                        "CASH",
                        "BANK_TRANSFER",
                      ] as PaymentMethod[]
                    ).map((pm) => (
                      <button
                        key={pm}
                        type="button"
                        className={
                          "button-chip" +
                          (paymentMethod === pm
                            ? " active"
                            : "")
                        }
                        onClick={() => setPaymentMethod(pm)}
                      >
                        {pm === "CARD" && "카드"}
                        {pm === "CASH" && "현금"}
                        {pm === "BANK_TRANSFER" && "계좌이체"}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="number"
                      value={distanceKm ?? ""}
                      onChange={(e) =>
                        setDistanceKm(
                          e.target.value === ""
                            ? null
                            : Number(e.target.value)
                        )
                      }
                      placeholder="거리(km)"
                    />
                    <button
                      type="button"
                      onClick={handleCalculateDistance}
                      disabled={calculating}
                      className="button-chip"
                    >
                      {calculating
                        ? "거리 계산 중..."
                        : "거리 자동 계산"}
                    </button>
                  </div>

                  <input
                    type="number"
                    value={quotedPrice}
                    onChange={(e) =>
                      setQuotedPrice(
                        e.target.value === ""
                          ? ""
                          : Number(e.target.value)
                      )
                    }
                    placeholder="요금 (원)"
                  />
                </div>
              </section>
            </div>

            {/* 하단 요약 + 버튼 */}
            <div className="request-form-summary-bar">
              <div>
                <span className="request-form-summary-label">
                  거리
                </span>
                <strong>
                  {distanceKm != null
                    ? `${distanceKm.toFixed(1)} km`
                    : "-"}
                </strong>
              </div>
              <div>
                <span className="request-form-summary-label">
                  요금
                </span>
                <strong>
                  {quotedPrice !== ""
                    ? `${Number(
                        quotedPrice
                      ).toLocaleString()} 원`
                    : "-"}
                </strong>
              </div>
            </div>

            <div className="request-submit-row">
              <button
                type="submit"
                className="request-submit-btn"
                disabled={submitting}
              >
                {submitting ? "접수 중..." : "접수하기"}
              </button>
            </div>

            {message && (
              <p
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#0070c9",
                }}
              >
                {message}
              </p>
            )}
            {error && (
              <p
                style={{
                  marginTop: 4,
                  fontSize: 13,
                  color: "red",
                }}
              >
                {error}
              </p>
            )}
          </div>

          {/* 오른쪽: 최근 배차내역 사이드바 */}
          <aside
            style={{
              flex: 1,
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              backgroundColor: "#fff",
              fontSize: 12,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                marginBottom: 8,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>최근 배차내역</span>
              <button
                type="button"
                onClick={fetchRecentRequests}
                style={{
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  background: "#f8f8f8",
                  cursor: "pointer",
                }}
              >
                새로고침
              </button>
            </div>

            {recentLoading && <p>불러오는 중...</p>}
            {recentError && (
              <p style={{ color: "red" }}>에러: {recentError}</p>
            )}

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
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {recentRequests.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleApplyFromRecent(r.id)}
                      disabled={applyingId === r.id}
                      style={{
                        textAlign: "left",
                        padding: 8,
                        borderRadius: 6,
                        border: "1px solid #eee",
                        backgroundColor:
                          applyingId === r.id
                            ? "#f0f0f0"
                            : "#fafafa",
                        cursor: "pointer",
                      }}
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
          </aside>
        </div>
      </form>

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
        onSelect={(entry: AddressBookEntry) => {
          if (addressBookModalTarget === "pickup") {
            setPickupPlaceName(entry.placeName);
            setPickupAddress(entry.address);
            setPickupAddressDetail(entry.addressDetail ?? "");
            setPickupContactName(entry.contactName ?? "");
            setPickupContactPhone(entry.contactPhone ?? "");
          } else if (addressBookModalTarget === "dropoff") {
            setDropoffPlaceName(entry.placeName);
            setDropoffAddress(entry.address);
            setDropoffAddressDetail(entry.addressDetail ?? "");
            setDropoffContactName(entry.contactName ?? "");
            setDropoffContactPhone(entry.contactPhone ?? "");
          }
          setAddressBookModalTarget(null);
        }}
      />
    </>
  );
}