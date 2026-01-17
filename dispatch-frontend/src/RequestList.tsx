// src/RequestList.tsx
import { useEffect, useState } from "react";
import type { RequestSummary, RequestStatus, RequestDetail } from "./api/types";
import {
  listRequests,
  updateRequestStatus,
  getRequestDetail,
} from "./api/client";

export function RequestList() {
  const [items, setItems] = useState<RequestSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // 🔹 상태 필터: "ALL" + 실제 상태(enum)
  const [statusFilter, setStatusFilter] =
    useState<RequestStatus | "ALL">("ALL");

  // 🔹 기간 필터 (YYYY-MM-DD 문자열)
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  // 🔹 페이지네이션 상태
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [total, setTotal] = useState<number>(0);

  // 🔹 상세 모달 상태
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<RequestDetail | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const getPageNumbers = () => {
    const pages: number[] = [];
    const maxPageButtons = 7;

    if (totalPages <= maxPageButtons) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, page - 3);
      let end = Math.min(totalPages, page + 3);

      if (start === 1) {
        end = Math.min(totalPages, maxPageButtons);
      } else if (end === totalPages) {
        start = Math.max(1, totalPages - maxPageButtons + 1);
      }

      for (let p = start; p <= end; p++) {
        pages.push(p);
      }
    }

    return pages;
  };

  // 🔹 목록 조회 (상태/기간/페이지 필터 적용)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const statusArg =
          statusFilter === "ALL" ? "ALL" : statusFilter;
        const fromArg = fromDate || undefined;
        const toArg = toDate || undefined;

        // ✅ 이제 listRequests 가 { items, total, page, pageSize } 반환
        const res = await listRequests(
          statusArg,
          fromArg,
          toArg,
          page,
          pageSize
        );

        setItems(res.items);
        setTotal(res.total);
      } catch (err: any) {
        console.error(err);
        setError(
          err.message ||
            "배차내역을 가져오는 중 오류가 발생했습니다."
        );
        setItems([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [statusFilter, fromDate, toDate, page, pageSize]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "PENDING":
        return "접수중";
      case "DISPATCHING":
        return "배차중";
      case "ASSIGNED":
        return "배차완료";
      case "IN_TRANSIT":
        return "운행중";
      case "COMPLETED":
        return "완료";
      case "CANCELLED":
        return "취소";
      default:
        return status;
    }
  };

  // 🔹 상태 변경
  const handleChangeStatus = async (
    id: number,
    nextStatus: RequestStatus
  ) => {
    try {
      setUpdatingId(id);
      setError(null);
      const updated = await updateRequestStatus(id, nextStatus);

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: updated.status } : item
        )
      );
    } catch (err: any) {
      console.error(err);
      setError(
        err.message ||
          "상태를 변경하는 중 오류가 발생했습니다."
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // 🔹 상세 모달 열기
  const handleOpenDetail = async (id: number) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      setDetailError(null);
      setDetailItem(null);

      const data = await getRequestDetail(id);
      setDetailItem(data);
    } catch (err: any) {
      console.error(err);
      setDetailError(
        err.message ||
          "상세 정보를 가져오는 중 오류가 발생했습니다."
      );
    } finally {
      setDetailLoading(false);
    }
  };

  // 🔹 상세 모달 닫기
  const handleCloseDetail = () => {
    setDetailOpen(false);
    setDetailItem(null);
    setDetailError(null);
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h1>배차내역 리스트</h1>

      {/* 🔹 기간 필터 */}
      <div
        style={{
          marginBottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 14,
        }}
      >
        <span>기간:</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value);
            setPage(1); // 필터 바뀌면 페이지 1로
          }}
        />
        <span>~</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value);
            setPage(1);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setFromDate("");
            setToDate("");
            setPage(1);
          }}
          style={{ marginLeft: 8 }}
        >
          기간 초기화
        </button>
      </div>

      {/* 🔹 상태 필터 탭 */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        <button
          onClick={() => {
            setStatusFilter("ALL");
            setPage(1);
          }}
        >
          전체
        </button>
        <button
          onClick={() => {
            setStatusFilter("PENDING");
            setPage(1);
          }}
        >
          접수중
        </button>
        <button
          onClick={() => {
            setStatusFilter("DISPATCHING");
            setPage(1);
          }}
        >
          배차중
        </button>
        <button
          onClick={() => {
            setStatusFilter("ASSIGNED");
            setPage(1);
          }}
        >
          배차완료
        </button>
        <button
          onClick={() => {
            setStatusFilter("IN_TRANSIT");
            setPage(1);
          }}
        >
          운행중
        </button>
        <button
          onClick={() => {
            setStatusFilter("COMPLETED");
            setPage(1);
          }}
        >
          완료
        </button>
        <button
          onClick={() => {
            setStatusFilter("CANCELLED");
            setPage(1);
          }}
        >
          취소
        </button>
      </div>

      {/* 🔹 페이지당 개수 & 총 건수 */}
      <div
        style={{
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
        }}
      >
        <div>
          한 페이지에{" "}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10개</option>
            <option value={20}>20개</option>
            <option value={30}>30개</option>
            <option value={50}>50개</option>
          </select>
          씩 보기
        </div>
        <div>총 {total.toLocaleString()}건</div>
      </div>

      {loading && <p>불러오는 중...</p>}
      {error && <p style={{ color: "red" }}>에러: {error}</p>}

      {!loading && !error && total === 0 && (
        <p>배차내역이 없습니다. 위에서 폼으로 몇 건 만들어보세요.</p>
      )}

      {!loading && !error && items.length > 0 && (
        <>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  ID
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  생성일시
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  출발지명
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  도착지명
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  거리(km)
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  요금(원)
                </th>
                <th style={{ borderBottom: "1px solid #ccc", padding: 8 }}>
                  상태
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id}>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                      textAlign: "center",
                    }}
                  >
                    {r.id}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {formatDate(r.createdAt)}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                    }}
                  >
                    {r.pickupPlaceName}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                    }}
                  >
                    {r.dropoffPlaceName}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                      textAlign: "right",
                    }}
                  >
                    {r.distanceKm ?? "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                      textAlign: "right",
                    }}
                  >
                    {r.quotedPrice
                      ? r.quotedPrice.toLocaleString()
                      : "-"}
                  </td>
                  <td
                    style={{
                      borderBottom: "1px solid #eee",
                      padding: 8,
                    }}
                  >
                    {/* 상태 텍스트 */}
                    <div>{formatStatus(r.status)}</div>

                    {/* 상태 변경 셀렉트 */}
                    <select
                      value=""
                      onChange={(e) => {
                        const value =
                          e.target.value as RequestStatus | "";
                        if (!value) return;
                        handleChangeStatus(r.id, value);
                        e.target.value = "";
                      }}
                      disabled={updatingId === r.id}
                      style={{ marginTop: 4, fontSize: 12 }}
                    >
                      <option value="">상태 변경...</option>
                      <option value="PENDING">접수중</option>
                      <option value="DISPATCHING">배차중</option>
                      <option value="ASSIGNED">배차완료</option>
                      <option value="IN_TRANSIT">운행중</option>
                      <option value="COMPLETED">완료</option>
                      <option value="CANCELLED">취소</option>
                    </select>

                    {/* 🔹 상세보기 버튼 */}
                    <div style={{ marginTop: 4 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenDetail(r.id)}
                        style={{ fontSize: 12 }}
                      >
                        상세보기
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

           {/* 🔹 페이지네이션 버튼 */}
          <div
            style={{
              marginTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            {/* 이전 버튼 */}
            <button
              type="button"
              onClick={() =>
                setPage((prev) => Math.max(1, prev - 1))
              }
              disabled={page <= 1}
            >
              이전
            </button>

            {/* 가운데: 숫자 페이지 버튼들 */}
            <div style={{ display: "flex", gap: 4 }}>
              {getPageNumbers().map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  disabled={p === page}
                  style={{
                    minWidth: 32,
                    padding: "4px 8px",
                    borderRadius: 4,
                    border:
                      p === page
                        ? "1px solid #333"
                        : "1px solid #ccc",
                    backgroundColor:
                      p === page ? "#333" : "#fff",
                    color: p === page ? "#fff" : "#333",
                    cursor: p === page ? "default" : "pointer",
                  }}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* 다음 버튼 + 현재/전체 페이지 정보 */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span>
                페이지 {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) =>
                    Math.min(totalPages, prev + 1)
                  )
                }
                disabled={page >= totalPages}
              >
                다음
              </button>
            </div>
          </div>
        </>
      )}

      {/* 🔹 상세 모달 */}
      {detailOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={handleCloseDetail} // 배경 클릭으로 닫기
        >
          <div
            style={{
              width: 600,
              maxHeight: "80vh",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              padding: 16,
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()} // 안쪽 클릭은 전파 막기
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>배차요청 상세</h2>
              <button type="button" onClick={handleCloseDetail}>
                닫기
              </button>
            </div>

            {detailLoading && <p>상세 정보를 불러오는 중...</p>}
            {detailError && (
              <p style={{ color: "red" }}>에러: {detailError}</p>
            )}

            {detailItem && !detailLoading && !detailError && (
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {/* 기본 정보 */}
                <section style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                    기본 정보
                  </h3>
                  <div>ID: {detailItem.id}</div>
                  <div>상태: {formatStatus(detailItem.status)}</div>
                  <div>
                    요청일시: {formatDate(detailItem.createdAt)}
                  </div>
                </section>

                {/* 출발지 */}
                <section style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                    출발지
                  </h3>
                  <div>출발지명: {detailItem.pickupPlaceName}</div>
                  <div>주소: {detailItem.pickupAddress}</div>
                  {detailItem.pickupAddressDetail && (
                    <div>
                      상세주소: {detailItem.pickupAddressDetail}
                    </div>
                  )}
                  {detailItem.pickupContactName && (
                    <div>
                      담당자: {detailItem.pickupContactName}
                    </div>
                  )}
                  {detailItem.pickupContactPhone && (
                    <div>
                      연락처: {detailItem.pickupContactPhone}
                    </div>
                  )}
                  <div>상차방법: {detailItem.pickupMethod}</div>
                  <div>
                    바로상차:{" "}
                    {detailItem.pickupIsImmediate ? "예" : "아니오"}
                  </div>
                </section>

                {/* 도착지 */}
                <section style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                    도착지
                  </h3>
                  <div>도착지명: {detailItem.dropoffPlaceName}</div>
                  <div>주소: {detailItem.dropoffAddress}</div>
                  {detailItem.dropoffAddressDetail && (
                    <div>
                      상세주소: {detailItem.dropoffAddressDetail}
                    </div>
                  )}
                  {detailItem.dropoffContactName && (
                    <div>
                      담당자: {detailItem.dropoffContactName}
                    </div>
                  )}
                  {detailItem.dropoffContactPhone && (
                    <div>
                      연락처: {detailItem.dropoffContactPhone}
                    </div>
                  )}
                  <div>하차방법: {detailItem.dropoffMethod}</div>
                  <div>
                    바로하차:{" "}
                    {detailItem.dropoffIsImmediate ? "예" : "아니오"}
                  </div>
                </section>

                {/* 차량 / 화물 */}
                <section style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                    차량 / 화물
                  </h3>
                  <div>
                    차량그룹: {detailItem.vehicleGroup ?? "-"}
                  </div>
                  <div>
                    차량톤수:{" "}
                    {detailItem.vehicleTonnage != null
                      ? `${detailItem.vehicleTonnage}톤`
                      : "-"}
                  </div>
                  <div>
                    차량타입: {detailItem.vehicleBodyType ?? "-"}
                  </div>
                  <div>
                    화물내용: {detailItem.cargoDescription ?? "-"}
                  </div>
                </section>

                {/* 요청 / 결제 */}
                <section style={{ marginBottom: 12 }}>
                  <h3 style={{ margin: "4px 0", fontSize: 14 }}>
                    요청 / 결제
                  </h3>
                  <div>
                    요청유형: {detailItem.requestType}
                  </div>
                  <div>
                    결제방법: {detailItem.paymentMethod ?? "-"}
                  </div>
                  <div>
                    거리(km):{" "}
                    {detailItem.distanceKm != null
                      ? detailItem.distanceKm
                      : "-"}
                  </div>
                  <div>
                    견적요금(원):{" "}
                    {detailItem.quotedPrice != null
                      ? detailItem.quotedPrice.toLocaleString()
                      : "-"}
                  </div>
                  <div>
                    기사요청사항: {detailItem.driverNote ?? "-"}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}