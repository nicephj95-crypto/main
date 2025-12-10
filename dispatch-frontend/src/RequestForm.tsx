import { useState } from "react";
import type {
  CreateRequestBody,
  LoadMethod,
  VehicleGroup,
  PaymentMethod,
  AddressBookEntry,
  CreateAddressBookBody,
} from "./api/types";
import {
  listAddressBook,
  createRequest,
  createAddressBookEntry,
} from "./api/client";
import { AddressSearchModal } from "./AddressSearchModal";

const loadMethodOptions: LoadMethod[] = [
  "FORKLIFT",
  "MANUAL",
  "SUDOU_SUHAEJUNG",
  "HOIST",
  "CRANE",
  "CONVEYOR",
];

const vehicleGroupOptions: VehicleGroup[] = [
  "MOTORCYCLE",
  "DAMAS",
  "LABO",
  "ONE_TON_PLUS",
];

const paymentMethodOptions: PaymentMethod[] = [
  "CREDIT",
  "CARD",
  "CASH_PREPAID",
  "CASH_COLLECT",
];

export function RequestForm() {
  // 🔹 주소 검색 모달 on/off
  const [isPickupModalOpen, setIsPickupModalOpen] = useState(false);
  const [isDropoffModalOpen, setIsDropoffModalOpen] = useState(false);

  // 🔹 주소록
  const [addressBook, setAddressBook] = useState<AddressBookEntry[]>([]);
  const [addressBookLoading, setAddressBookLoading] = useState(false);
  const [addressBookError, setAddressBookError] = useState<string | null>(null);

  // 🔹 기사 요청사항
  const [driverNote, setDriverNote] = useState("");

  // 🔹 바로상차 / 바로하차
  const [pickupIsImmediate, setPickupIsImmediate] = useState<boolean>(true); // 기본: 바로상차
  const [dropoffIsImmediate, setDropoffIsImmediate] =
    useState<boolean>(false); // 기본: 시간 지정

  // 🔹 상차/하차 시간 (datetime-local 문자열)
  const [pickupDateTime, setPickupDateTime] = useState<string>("");
  const [dropoffDateTime, setDropoffDateTime] = useState<string>("");

  // 🔹 출발지
  const [pickupPlaceName, setPickupPlaceName] = useState("출발 센터A");
  const [pickupAddress, setPickupAddress] =
    useState("인천 서구 테스트로 100");
  const [pickupAddressDetail, setPickupAddressDetail] =
    useState("1층 램프앞");
  const [pickupContactName, setPickupContactName] =
    useState("홍길동");
  const [pickupContactPhone, setPickupContactPhone] =
    useState("010-0000-0000");

  // 🔹 도착지
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

  // 🔹 기타 (방법/차량/결제/화물)
  const [pickupMethod, setPickupMethod] =
    useState<LoadMethod>("MANUAL");
  const [dropoffMethod, setDropoffMethod] =
    useState<LoadMethod>("FORKLIFT");

  const [vehicleGroup, setVehicleGroup] =
    useState<VehicleGroup>("ONE_TON_PLUS");

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("CARD");

  const [cargoDescription, setCargoDescription] =
    useState("의류 박스 50개");

  const [distanceKm, setDistanceKm] = useState<number>(25.5);
  const [quotedPrice, setQuotedPrice] = useState<number>(48000);

  // 🔹 폼 전송 상태
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────
  // 주소록 불러오기 / 저장
  // ─────────────────────────────────────────
  const fetchAddressBook = async () => {
    try {
      setAddressBookLoading(true);
      setAddressBookError(null);
      const data = await listAddressBook();
      setAddressBook(data);
    } catch (err: any) {
      console.error(err);
      setAddressBookError(
        err.message || "주소록을 불러오는 중 오류가 발생했습니다."
      );
    } finally {
      setAddressBookLoading(false);
    }
  };

  const handleSavePickupToAddressBook = async () => {
    try {
      setAddressBookLoading(true);
      setAddressBookError(null);

      const body: CreateAddressBookBody = {
        placeName: pickupPlaceName,
        address: pickupAddress,
        addressDetail: pickupAddressDetail,
        contactName: pickupContactName,
        contactPhone: pickupContactPhone,
        type: "BOTH", // 출발/도착 공용으로 쓰기
      };

      const saved = await createAddressBookEntry(body);
      setAddressBook((prev) => [...prev, saved]);
    } catch (err: any) {
      console.error(err);
      setAddressBookError(
        err.message || "주소록 저장 중 오류가 발생했습니다."
      );
    } finally {
      setAddressBookLoading(false);
    }
  };

  const handleSaveDropoffToAddressBook = async () => {
    try {
      setAddressBookLoading(true);
      setAddressBookError(null);

      const body: CreateAddressBookBody = {
        placeName: dropoffPlaceName,
        address: dropoffAddress,
        addressDetail: dropoffAddressDetail,
        contactName: dropoffContactName,
        contactPhone: dropoffContactPhone,
        type: "BOTH",
      };

      const saved = await createAddressBookEntry(body);
      setAddressBook((prev) => [...prev, saved]);
    } catch (err: any) {
      console.error(err);
      setAddressBookError(
        err.message || "주소록 저장 중 오류가 발생했습니다."
      );
    } finally {
      setAddressBookLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // 폼 전송
  // ─────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setLastResult(null);

    const payload: CreateRequestBody = {
      pickup: {
        placeName: pickupPlaceName,
        address: pickupAddress,
        addressDetail: pickupAddressDetail,
        contactName: pickupContactName,
        contactPhone: pickupContactPhone,
        method: pickupMethod,
        isImmediate: pickupIsImmediate,
        datetime:
          !pickupIsImmediate && pickupDateTime
            ? new Date(pickupDateTime).toISOString()
            : undefined,
      },
      dropoff: {
        placeName: dropoffPlaceName,
        address: dropoffAddress,
        addressDetail: dropoffAddressDetail,
        contactName: dropoffContactName,
        contactPhone: dropoffContactPhone,
        method: dropoffMethod,
        isImmediate: dropoffIsImmediate,
        datetime:
          !dropoffIsImmediate && dropoffDateTime
            ? new Date(dropoffDateTime).toISOString()
            : undefined,
      },
      vehicle: {
        group: vehicleGroup,
      },
      cargo: {
        description: cargoDescription,
      },
      payment: {
        method: paymentMethod,
        distanceKm,
        quotedPrice,
      },
      options: {
        requestType: "NORMAL",
        driverNote: driverNote,
      },
    };

    try {
      const result = await createRequest(payload);
      setLastResult(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "에러가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────
  // JSX
  // ─────────────────────────────────────────
  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: 16 }}>
      <h1>배차 요청 테스트 폼</h1>

      <form onSubmit={handleSubmit}>
        {/* 출발지 */}
        <fieldset style={{ marginBottom: 16 }}>
          <legend>출발지</legend>

          <div>
            <label>
              출발지명
              <input
                value={pickupPlaceName}
                onChange={(e) => setPickupPlaceName(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label>
              출발지 주소
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setIsPickupModalOpen(true)}
                >
                  주소 검색
                </button>
              </div>
            </label>
          </div>

          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <button
              type="button"
              onClick={handleSavePickupToAddressBook}
              disabled={addressBookLoading}
            >
              이 출발지 위치를 주소록에 저장
            </button>
          </div>

          {/* 주소록 불러오기 + 출발지 선택 */}
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={fetchAddressBook}
              disabled={addressBookLoading}
              style={{ marginRight: 8 }}
            >
              {addressBookLoading
                ? "주소록 불러오는 중..."
                : "주소록 불러오기"}
            </button>

            {addressBookError && (
              <span style={{ color: "red", marginLeft: 8 }}>
                {addressBookError}
              </span>
            )}
          </div>

          {addressBook.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <label>
                출발지 주소록에서 선택
                <select
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const entry = addressBook.find(
                      (item) => item.id === id
                    );
                    if (!entry) return;

                    setPickupPlaceName(entry.placeName);
                    setPickupAddress(entry.address);
                    setPickupAddressDetail(entry.addressDetail || "");
                    setPickupContactName(entry.contactName || "");
                    setPickupContactPhone(entry.contactPhone || "");
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    출발지 주소록 선택
                  </option>
                  {addressBook.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.placeName} ({item.address})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div>
            <label>
              출발지 상세주소
              <input
                value={pickupAddressDetail}
                onChange={(e) =>
                  setPickupAddressDetail(e.target.value)
                }
              />
            </label>
          </div>

          <div>
            <label>
              출발지 담당자 이름
              <input
                value={pickupContactName}
                onChange={(e) =>
                  setPickupContactName(e.target.value)
                }
              />
            </label>
          </div>

          <div>
            <label>
              출발지 연락처
              <input
                value={pickupContactPhone}
                onChange={(e) =>
                  setPickupContactPhone(e.target.value)
                }
              />
            </label>
          </div>

          {/* 상차방법 */}
          <div>
            <label>
              상차방법
              <select
                value={pickupMethod}
                onChange={(e) =>
                  setPickupMethod(e.target.value as LoadMethod)
                }
              >
                {loadMethodOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 상차시간 + 바로상차 토글 */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <label style={{ flex: 1 }}>
              상차시간
              <input
                type="datetime-local"
                value={pickupDateTime}
                onChange={(e) =>
                  setPickupDateTime(e.target.value)
                }
                disabled={pickupIsImmediate}
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>

            <label style={{ whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={pickupIsImmediate}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setPickupIsImmediate(checked);
                  if (checked) {
                    setPickupDateTime("");
                  }
                }}
              />
              {" "}바로상차
            </label>
          </div>
        </fieldset>

        {/* 도착지 */}
        <fieldset style={{ marginBottom: 16 }}>
          <legend>도착지</legend>

          <div>
            <label>
              도착지명
              <input
                value={dropoffPlaceName}
                onChange={(e) =>
                  setDropoffPlaceName(e.target.value)
                }
              />
            </label>
          </div>

          <div>
            <label>
              도착지 주소
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  style={{ flex: 1 }}
                  value={dropoffAddress}
                  onChange={(e) =>
                    setDropoffAddress(e.target.value)
                  }
                />
                <button
                  type="button"
                  onClick={() => setIsDropoffModalOpen(true)}
                >
                  주소 검색
                </button>
              </div>
            </label>
          </div>

          <div style={{ marginTop: 4, marginBottom: 8 }}>
            <button
              type="button"
              onClick={handleSaveDropoffToAddressBook}
              disabled={addressBookLoading}
            >
              이 도착지 위치를 주소록에 저장
            </button>
          </div>

          {addressBook.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <label>
                도착지 주소록에서 선택
                <select
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    const entry = addressBook.find(
                      (item) => item.id === id
                    );
                    if (!entry) return;

                    setDropoffPlaceName(entry.placeName);
                    setDropoffAddress(entry.address);
                    setDropoffAddressDetail(
                      entry.addressDetail || ""
                    );
                    setDropoffContactName(
                      entry.contactName || ""
                    );
                    setDropoffContactPhone(
                      entry.contactPhone || ""
                    );
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    도착지 주소록 선택
                  </option>
                  {addressBook.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.placeName} ({item.address})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          <div>
            <label>
              도착지 상세주소
              <input
                value={dropoffAddressDetail}
                onChange={(e) =>
                  setDropoffAddressDetail(e.target.value)
                }
              />
            </label>
          </div>

          <div>
            <label>
              도착지 담당자 이름
              <input
                value={dropoffContactName}
                onChange={(e) =>
                  setDropoffContactName(e.target.value)
                }
              />
            </label>
          </div>

          <div>
            <label>
              도착지 연락처
              <input
                value={dropoffContactPhone}
                onChange={(e) =>
                  setDropoffContactPhone(e.target.value)
                }
              />
            </label>
          </div>

          {/* 하차방법 */}
          <div>
            <label>
              하차방법
              <select
                value={dropoffMethod}
                onChange={(e) =>
                  setDropoffMethod(e.target.value as LoadMethod)
                }
              >
                {loadMethodOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* 하차시간 + 바로하차 토글 */}
          <div
            style={{
              marginTop: 8,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <label style={{ flex: 1 }}>
              하차시간
              <input
                type="datetime-local"
                value={dropoffDateTime}
                onChange={(e) =>
                  setDropoffDateTime(e.target.value)
                }
                disabled={dropoffIsImmediate}
                style={{ marginLeft: 8, width: "100%" }}
              />
            </label>

            <label style={{ whiteSpace: "nowrap" }}>
              <input
                type="checkbox"
                checked={dropoffIsImmediate}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDropoffIsImmediate(checked);
                  if (checked) {
                    setDropoffDateTime("");
                  }
                }}
              />
              {" "}바로하차
            </label>
          </div>
        </fieldset>

        {/* 차량 / 화물 / 결제 */}
        <fieldset style={{ marginBottom: 16 }}>
          <legend>차량 / 화물 / 결제</legend>

          <div>
            <label>
              차량 그룹
              <select
                value={vehicleGroup}
                onChange={(e) =>
                  setVehicleGroup(
                    e.target.value as VehicleGroup
                  )
                }
              >
                {vehicleGroupOptions.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              화물 내용
              <input
                value={cargoDescription}
                onChange={(e) =>
                  setCargoDescription(e.target.value)
                }
              />
            </label>
          </div>

          <div>
            <label>
              기사 요청사항
              <textarea
                value={driverNote}
                onChange={(e) =>
                  setDriverNote(e.target.value)
                }
                rows={3}
                style={{ width: "100%", resize: "vertical" }}
                placeholder="예) 지게차 필요, 출입증 발급 필수"
              />
            </label>
          </div>

          <div>
            <label>
              결제 방법
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(
                    e.target.value as PaymentMethod
                  )
                }
              >
                {paymentMethodOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <label>
              거리 (Km)
              <input
                type="number"
                step="0.1"
                value={distanceKm}
                onChange={(e) =>
                  setDistanceKm(Number(e.target.value) || 0)
                }
              />
            </label>
          </div>

          <div>
            <label>
              견적 요금
              <input
                type="number"
                value={quotedPrice}
                onChange={(e) =>
                  setQuotedPrice(
                    Number(e.target.value) || 0
                  )
                }
              />
            </label>
          </div>
        </fieldset>

        <button type="submit" disabled={loading}>
          {loading ? "전송 중..." : "배차 요청 보내기"}
        </button>
      </form>

      {error && (
        <p style={{ color: "red", marginTop: 16 }}>
          에러: {error}
        </p>
      )}

      {lastResult && (
        <pre
          style={{
            marginTop: 16,
            padding: 8,
            background: "#f4f4f4",
            fontSize: 12,
          }}
        >
          {JSON.stringify(lastResult, null, 2)}
        </pre>
      )}

      {/* 출발지 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={isPickupModalOpen}
        onClose={() => setIsPickupModalOpen(false)}
        onSelect={(addr) => {
          setPickupAddress(addr);
        }}
      />

      {/* 도착지 주소 검색 모달 */}
      <AddressSearchModal
        isOpen={isDropoffModalOpen}
        onClose={() => setIsDropoffModalOpen(false)}
        onSelect={(addr) => {
          setDropoffAddress(addr);
        }}
      />
    </div>
  );
}