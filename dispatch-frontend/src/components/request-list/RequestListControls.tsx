import { ExcelIcon } from "../../ui/icons";

type RequestListStatus =
  | "ALL"
  | "PENDING"
  | "DISPATCHING"
  | "ASSIGNED"
  | "IN_TRANSIT"
  | "COMPLETED"
  | "CANCELLED";

type RequestListControlsProps = {
  dateSearchType: "RECEIVED_DATE" | "PICKUP_DATE";
  fromDate: string;
  toDate: string;
  pickupKeyword: string;
  dropoffKeyword: string;
  pageSize: number;
  statusFilter: RequestListStatus;
  statusTotal: number;
  statusCount: Record<string, number>;
  exportingExcel: boolean;
  formatLocalYmd: (date: Date) => string;
  setDateSearchType: (value: "RECEIVED_DATE" | "PICKUP_DATE") => void;
  setFromDate: (value: string) => void;
  setToDate: (value: string) => void;
  setPickupKeyword: (value: string) => void;
  setDropoffKeyword: (value: string) => void;
  setPage: (value: number) => void;
  setPageSize: (value: number) => void;
  setStatusFilter: (value: RequestListStatus) => void;
  setExportingExcel: (value: boolean) => void;
  onExport: () => Promise<void>;
};

export function RequestListControls({
  dateSearchType,
  fromDate,
  toDate,
  pickupKeyword,
  dropoffKeyword,
  pageSize,
  statusFilter,
  statusTotal,
  statusCount,
  exportingExcel,
  formatLocalYmd,
  setDateSearchType,
  setFromDate,
  setToDate,
  setPickupKeyword,
  setDropoffKeyword,
  setPage,
  setPageSize,
  setStatusFilter,
  setExportingExcel,
  onExport,
}: RequestListControlsProps) {
  const statusTabs: Array<{ value: RequestListStatus; label: string; count: number }> = [
    { value: "ALL", label: "전체", count: statusTotal },
    { value: "PENDING", label: "접수중", count: statusCount.PENDING ?? 0 },
    { value: "DISPATCHING", label: "배차중", count: statusCount.DISPATCHING ?? 0 },
    { value: "ASSIGNED", label: "배차완료", count: statusCount.ASSIGNED ?? 0 },
    { value: "CANCELLED", label: "취소", count: statusCount.CANCELLED ?? 0 },
  ];

  return (
    <>
      <div className="table-page-toolbar">
        <div className="toolbar-left">
          <button
            type="button"
            className="list-date-type-btn"
            onClick={() => {
              if (dateSearchType === "RECEIVED_DATE") {
                const future = new Date();
                future.setDate(future.getDate() + 90);
                setToDate(formatLocalYmd(future));
                setDateSearchType("PICKUP_DATE");
              } else {
                setToDate(formatLocalYmd(new Date()));
                setDateSearchType("RECEIVED_DATE");
              }
              setPage(1);
            }}
          >
            {dateSearchType === "RECEIVED_DATE" ? "접수일" : "상차일"}
          </button>

          <div className="list-pill list-date-range">
            <input
              className="pill-input"
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPage(1);
              }}
            />
            <span className="list-sep">~</span>
            <input
              className="pill-input"
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="list-pill list-locations">
            <input
              className="pill-input"
              type="text"
              placeholder="출발지명"
              value={pickupKeyword}
              onChange={(e) => setPickupKeyword(e.target.value)}
              autoComplete="off"
            />
            <span className="list-arrow">›</span>
            <input
              className="pill-input"
              type="text"
              placeholder="도착지명"
              value={dropoffKeyword}
              onChange={(e) => setDropoffKeyword(e.target.value)}
              autoComplete="off"
            />
          </div>

          <button
            type="button"
            className="list-reset-btn"
            onClick={() => {
              const d = new Date();
              const to = formatLocalYmd(d);
              d.setDate(d.getDate() - 7);
              const from = formatLocalYmd(d);
              setFromDate(from);
              setToDate(to);
              setPickupKeyword("");
              setDropoffKeyword("");
              setPage(1);
            }}
          >
            초기화
          </button>
        </div>
      </div>

      <div className="status-bar">
        <div className="status-tabs">
          {statusTabs.map((tab) => (
            <button
              key={tab.value}
              className={`status-tab ${statusFilter === tab.value ? "active" : ""}`}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
            >
              <span className="status-label">{tab.label}</span>
              <span className="status-count">{tab.count}건</span>
            </button>
          ))}
        </div>

        <div className="status-actions">
          <select
            className="pill-select"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10개씩 보기</option>
            <option value={30}>30개씩 보기</option>
            <option value={50}>50개씩 보기</option>
            <option value={100}>100개씩 보기</option>
            <option value={500}>500개씩 보기</option>
          </select>
          <button
            type="button"
            className="excel-btn"
            aria-label="엑셀 다운로드"
            title="엑셀 다운로드"
            disabled={exportingExcel}
            onClick={async () => {
              try {
                setExportingExcel(true);
                await onExport();
              } finally {
                setExportingExcel(false);
              }
            }}
          >
            <ExcelIcon />
          </button>
        </div>
      </div>
    </>
  );
}
