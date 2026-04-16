// src/components/ExcelImportResultModal.tsx
import type { Dispatch, SetStateAction } from "react";
import type { AddressBookImportResult } from "../api/types";

type Props = {
  excelImportResult: AddressBookImportResult | null;
  setExcelImportResult: Dispatch<SetStateAction<AddressBookImportResult | null>>;
};

export function ExcelImportResultModal({
  excelImportResult,
  setExcelImportResult,
}: Props) {
  if (!excelImportResult) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={() => setExcelImportResult(null)}
    >
      <div
        style={{
          width: 560,
          maxWidth: "calc(100vw - 24px)",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          padding: 18,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0, fontSize: 16 }}>주소록 엑셀 업로드 결과</h3>
        <p style={{ margin: "10px 0 0", fontSize: 13, color: "#555" }}>
          총 {excelImportResult.totalRows}행 중 생성 {excelImportResult.createdCount}건 / 건너뜀{" "}
          {excelImportResult.skippedCount}건 / 실패 {excelImportResult.failureCount}건
        </p>
        {excelImportResult.appliedCompanyName && (
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#555" }}>
            적용 업체: <strong>{excelImportResult.appliedCompanyName}</strong>
            {excelImportResult.companyNameOverridden
              ? ` / 파일 내 회사명 ${excelImportResult.companyNameOverridden}건은 로그인 회사 기준으로 적용되었습니다.`
              : " / 파일 내 회사명 대신 로그인 회사 기준으로 저장되었습니다."}
          </p>
        )}

        {(excelImportResult.skipped.length > 0 || excelImportResult.failures.length > 0) && (
          <div
            style={{
              marginTop: 12,
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid #e5e5e5",
              borderRadius: 6,
              padding: 10,
              background: "#fafafa",
            }}
          >
            {excelImportResult.failures.length > 0 && (
              <div style={{ marginBottom: excelImportResult.skipped.length ? 10 : 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#b42318", marginBottom: 6 }}>
                  실패 행
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#444" }}>
                  {excelImportResult.failures.map((item, idx) => (
                    <li key={`f-${idx}`}>
                      {item.row}행: {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {excelImportResult.skipped.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", marginBottom: 6 }}>
                  건너뜀 행
                </div>
                <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#444" }}>
                  {excelImportResult.skipped.map((item, idx) => (
                    <li key={`s-${idx}`}>
                      {item.row}행: {item.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button
            type="button"
            className="address-save-btn"
            style={{ width: "auto", marginTop: 0 }}
            onClick={() => setExcelImportResult(null)}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
