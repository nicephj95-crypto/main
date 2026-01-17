// src/AddressBookModal.tsx
import { useEffect, useState } from "react";
import { listAddressBook } from "./api/client";
import type { AddressBookEntry } from "./api/types";

interface AddressBookModalProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  onSelect: (entry: AddressBookEntry) => void;
}

export function AddressBookModal({
  isOpen,
  title = "주소록 선택",
  onClose,
  onSelect,
}: AddressBookModalProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // 모달 열릴 때마다 목록 불러오기
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAddressBook();
        setEntries(data);
      } catch (err: any) {
        console.error(err);
        setError(
          err?.message ||
            "주소록을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    setSearch("");
  }, [isOpen]);

  // 검색 버튼 눌렀을 때
  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAddressBook(search);
      setEntries(data);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ||
          "주소록 검색 중 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
      onClick={onClose} // 배경 클릭시 닫기
    >
      <div
        style={{
          width: 720,
          maxHeight: "80vh",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()} // 내용 클릭은 전파 막기
      >
        {/* 헤더 */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <h2 style={{ margin: 0, fontSize: 16 }}>{title}</h2>
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>

        {/* 검색 영역 */}
        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 8,
            fontSize: 13,
          }}
        >
          <input
            type="text"
            placeholder="상호명/주소/담당자 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            style={{
              flex: 1,
              padding: 6,
              borderRadius: 4,
              border: "1px solid #ccc",
            }}
          />
          <button
            type="button"
            onClick={handleSearch}
            style={{
              padding: "6px 12px",
              borderRadius: 4,
              border: "1px solid #333",
              backgroundColor: "#333",
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            검색
          </button>
        </div>

        {/* 내용 영역 (스크롤) */}
        <div style={{ flex: 1, overflowY: "auto", minHeight: 200 }}>
          {loading && <p style={{ fontSize: 13 }}>불러오는 중...</p>}
          {error && (
            <p style={{ fontSize: 13, color: "red" }}>{error}</p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p style={{ fontSize: 13, color: "#777" }}>
              저장된 주소가 없습니다. 주소록 페이지에서 먼저 주소를
              저장해 보세요.
            </p>
          )}

          {!loading && !error && entries.length > 0 && (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 13,
              }}
            >
              <thead>
                <tr>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    상호명
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    구분
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    주소
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    담당자
                  </th>
                  <th
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #eee",
                      padding: "4px 0",
                    }}
                  >
                    선택
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr key={item.id}>
                    <td
                      style={{
                        padding: "4px 0",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      {item.placeName}
                    </td>
                    <td
                      style={{
                        padding: "4px 0",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      {item.type === "PICKUP" && "출발지"}
                      {item.type === "DROPOFF" && "도착지"}
                      {item.type === "BOTH" && "출발/도착"}
                    </td>
                    <td
                      style={{
                        padding: "4px 0",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      <div>{item.address}</div>
                      {item.addressDetail && (
                        <div
                          style={{
                            color: "#777",
                            fontSize: 12,
                          }}
                        >
                          {item.addressDetail}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "4px 0",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      {item.contactName && (
                        <div>{item.contactName}</div>
                      )}
                      {item.contactPhone && (
                        <div
                          style={{
                            color: "#777",
                            fontSize: 12,
                          }}
                        >
                          {item.contactPhone}
                        </div>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "4px 0",
                        borderBottom: "1px solid #f3f3f3",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(item);
                          onClose();
                        }}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          border: "1px solid #333",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        선택
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}