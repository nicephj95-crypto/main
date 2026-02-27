// src/components/SignupRequestsTable.tsx
import type { Dispatch, SetStateAction } from "react";
import type { SignupRequest, SignupRequestStatus } from "../api/types";

type SignupFilter = SignupRequestStatus | "ALL";

type Props = {
  signupRequests: SignupRequest[];
  signupFilter: SignupFilter;
  setSignupFilter: Dispatch<SetStateAction<SignupFilter>>;
  savingId: number | null;
  onReview: (requestId: number, action: "APPROVE" | "REJECT") => void;
};

export function SignupRequestsTable({
  signupRequests,
  signupFilter,
  setSignupFilter,
  savingId,
  onReview,
}: Props) {
  return (
    <section
      style={{
        marginBottom: 20,
        border: "1px solid #eee",
        borderRadius: 8,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <h3 style={{ fontSize: 15, margin: 0 }}>회원가입 요청</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "#666" }}>필터</span>
          <select
            value={signupFilter}
            onChange={(e) => setSignupFilter(e.target.value as SignupFilter)}
            style={{
              padding: "4px 6px",
              borderRadius: 4,
              border: "1px solid #ccc",
              fontSize: 12,
            }}
          >
            <option value="ALL">전체</option>
            <option value="PENDING">승인대기</option>
            <option value="APPROVED">승인완료</option>
            <option value="REJECTED">반려</option>
          </select>
        </div>
      </div>

      {signupRequests.length === 0 ? (
        <p style={{ fontSize: 13, color: "#777", margin: 0 }}>
          조건에 맞는 가입요청이 없습니다.
        </p>
      ) : (
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
        >
          <thead>
            <tr>
              {["요청ID", "이름", "이메일", "상태", "요청시각", "처리자", "처리시각", "액션"].map(
                (h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                      padding: "6px 4px",
                    }}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {signupRequests.map((r) => (
              <tr key={r.id}>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>{r.id}</td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>{r.name}</td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>{r.email}</td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>
                  {r.status === "PENDING" && "승인대기"}
                  {r.status === "APPROVED" && "승인완료"}
                  {r.status === "REJECTED" && "반려"}
                </td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>
                  {new Date(r.createdAt).toLocaleString()}
                </td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>
                  {r.reviewedBy ? `${r.reviewedBy.name} (${r.reviewedBy.email})` : "-"}
                </td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>
                  {r.reviewedAt ? new Date(r.reviewedAt).toLocaleString() : "-"}
                </td>
                <td style={{ padding: "6px 4px", borderBottom: "1px solid #f3f3f3" }}>
                  {r.status === "PENDING" ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => onReview(r.id, "APPROVE")}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          borderRadius: 4,
                          border: "1px solid #2a7",
                          backgroundColor: "#2a7",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        disabled={savingId === r.id}
                        onClick={() => onReview(r.id, "REJECT")}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          borderRadius: 4,
                          border: "1px solid #c33",
                          backgroundColor: "#fff",
                          color: "#c33",
                          cursor: "pointer",
                        }}
                      >
                        반려
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: "#888", fontSize: 12 }}>처리완료</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
