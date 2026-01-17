// src/AddressBookPage.tsx
import { useEffect, useState } from "react";
import {
  listAddressBook,
  createAddressBookEntry,
  updateAddressBookEntry,
  deleteAddressBookEntry,
  listAddressBookCompanies,
} from "./api/client";
import type {
  AddressBookEntry,
  CreateAddressBookBody,
} from "./api/types";
import type { AuthUser } from "./LoginPanel";

type FormState = {
  placeName: string;
  address: string;
  addressDetail: string;
  contactName: string;
  contactPhone: string;
  type: "PICKUP" | "DROPOFF" | "BOTH";
};

type AddressBookPageProps = {
  currentUser: AuthUser;
};

export function AddressBookPage({ currentUser }: AddressBookPageProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // ADMIN 여부
  const isAdmin = currentUser.role === "ADMIN";

  // ADMIN 전용: 회사 목록 + 선택된 회사
  const [companies, setCompanies] = useState<string[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // ✏️ 수정 중인 항목 + 수정 폼 상태
  const [editing, setEditing] = useState<AddressBookEntry | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);

  const [form, setForm] = useState<FormState>({
    placeName: "",
    address: "",
    addressDetail: "",
    contactName: "",
    contactPhone: "",
    type: "BOTH",
  });

  // 🔹 ADMIN일 때 회사 목록 불러오기
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCompanies = async () => {
      try {
        const list = await listAddressBookCompanies();
        setCompanies(list);
      } catch (err) {
        console.error(err);
        // 치명적인 건 아니라서 alert는 안 띄움
      }
    };

    fetchCompanies();
  }, [isAdmin]);

  // 🔹 주소록 목록 불러오기
  const fetchAddressBook = async (
    searchText?: string,
    companyName?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      const q =
        searchText && searchText.trim() !== ""
          ? searchText.trim()
          : undefined;

      const company =
        isAdmin && companyName && companyName.trim() !== ""
          ? companyName.trim()
          : undefined;

      const data = await listAddressBook(q, company);
      setEntries(data);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "주소록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 처음엔 전체
    fetchAddressBook();
  }, []);

  // 🔹 인풋 공통 핸들러 (새 주소 폼)
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // 🔹 인풋 공통 핸들러 (수정 모달 폼)
  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!editForm) return;
    const { name, value } = e.target;
    setEditForm((prev) =>
      prev
        ? {
            ...prev,
            [name]: value,
          }
        : prev
    );
  };

  // 🔹 새 주소 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.placeName || !form.address) {
      setError("상호명과 주소는 필수입니다.");
      return;
    }

    const body: CreateAddressBookBody = {
      placeName: form.placeName,
      address: form.address,
      addressDetail: form.addressDetail || undefined,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      type: form.type,
    };

    setCreating(true);
    try {
      const created = await createAddressBookEntry(body);

      // 새로 만든 기록을 맨 위에 추가
      setEntries((prev) => [created, ...prev]);

      // 폼 초기화
      setForm({
        placeName: "",
        address: "",
        addressDetail: "",
        contactName: "",
        contactPhone: "",
        type: "BOTH",
      });
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "주소록 저장 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  // 🔹 [수정] 버튼 클릭 → 모달 열기
  const handleEditClick = (item: AddressBookEntry) => {
    setEditing(item);
    setEditForm({
      placeName: item.placeName,
      address: item.address,
      addressDetail: item.addressDetail ?? "",
      contactName: item.contactName ?? "",
      contactPhone: item.contactPhone ?? "",
      type: item.type,
    });
  };

  // 🔹 수정 모달에서 저장
  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;

    const body: Partial<CreateAddressBookBody> = {
      placeName: editForm.placeName,
      address: editForm.address,
      addressDetail: editForm.addressDetail || undefined,
      contactName: editForm.contactName || undefined,
      contactPhone: editForm.contactPhone || undefined,
      type: editForm.type,
    };

    try {
      const updated = await updateAddressBookEntry(editing.id, body);
      setEntries((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e))
      );
      setEditing(null);
      setEditForm(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "주소록 수정 중 오류가 발생했습니다.");
    }
  };

  // 🔹 삭제
  const handleDelete = async (item: AddressBookEntry) => {
    const ok = window.confirm(
      `"${item.placeName}" 주소록 항목을 삭제하시겠습니까?`
    );
    if (!ok) return;

    try {
      await deleteAddressBookEntry(item.id);
      setEntries((prev) => prev.filter((e) => e.id !== item.id));
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "주소록 삭제 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <div
        style={{
          padding: 16,
          display: "grid",
          gridTemplateColumns: "2fr 1.2fr",
          gap: 16,
        }}
      >
        {/* 왼쪽: 리스트 */}
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#fff",
            minHeight: 300,
          }}
        >
          <div
            style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}
          >
            저장된 주소록
          </div>

          {/* 🔍 검색 + (ADMIN이면 회사 필터) */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 8,
              alignItems: "center",
            }}
          >
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="상호명 / 주소 / 담당자 / 연락처 검색"
              style={{
                flex: 1,
                minWidth: 180,
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
                fontSize: 13,
              }}
            />

            {isAdmin && (
              <select
                value={selectedCompany}
                onChange={(e) => {
                  const value = e.target.value;
                  setSelectedCompany(value);
                  // 회사 선택 바뀔 때마다 검색 조건 유지해서 다시 조회
                  fetchAddressBook(search, value);
                }}
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  fontSize: 12,
                  minWidth: 140,
                }}
              >
                <option value="">전체 화주</option>
                {companies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => fetchAddressBook(search, selectedCompany)}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid #333",
                backgroundColor: "#333",
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              검색
            </button>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCompany("");
                fetchAddressBook();
              }}
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid #ccc",
                backgroundColor: "#fff",
                fontSize: 12,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              초기화
            </button>
          </div>

          {loading && <p>불러오는 중...</p>}

          {!loading && entries.length === 0 && (
            <p style={{ fontSize: 13, color: "#777" }}>
              아직 저장된 주소가 없습니다. 오른쪽 폼에서 주소를 추가해
              보세요.
            </p>
          )}

          {!loading && entries.length > 0 && (
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
                    관리
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
                          style={{ color: "#777", fontSize: 12 }}
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
                          style={{ color: "#777", fontSize: 12 }}
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
                        onClick={() => handleEditClick(item)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          borderRadius: 4,
                          border: "1px solid #333",
                          backgroundColor: "#333",
                          color: "#fff",
                          cursor: "pointer",
                          marginRight: 4,
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        style={{
                          padding: "4px 8px",
                          fontSize: 12,
                          borderRadius: 4,
                          border: "1px solid #f33",
                          backgroundColor: "#fff",
                          color: "#f33",
                          cursor: "pointer",
                        }}
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* 오른쪽: 주소록 추가 폼 */}
        <section
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            backgroundColor: "#fff",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 12,
              fontSize: 15,
            }}
          >
            새 주소 저장
          </div>

          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 8, fontSize: 13 }}
          >
            <input
              type="text"
              name="placeName"
              value={form.placeName}
              onChange={handleChange}
              placeholder="상호명 (필수)"
              style={{
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="주소 (필수)"
              style={{
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
            <input
              type="text"
              name="addressDetail"
              value={form.addressDetail}
              onChange={handleChange}
              placeholder="상세 주소"
              style={{
                padding: 6,
                borderRadius: 4,
                border: "1px solid #ccc",
              }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              <input
                type="text"
                name="contactName"
                value={form.contactName}
                onChange={handleChange}
                placeholder="담당자명"
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="tel"
                name="contactPhone"
                value={form.contactPhone}
                onChange={handleChange}
                placeholder="연락처"
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span
                style={{ fontSize: 12, color: "#555", width: 40 }}
              >
                구분
              </span>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              >
                <option value="PICKUP">출발지 전용</option>
                <option value="DROPOFF">도착지 전용</option>
                <option value="BOTH">출발/도착 둘 다</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={creating}
              style={{
                marginTop: 8,
                padding: "8px 12px",
                borderRadius: 4,
                border: "1px solid #333",
                backgroundColor: "#333",
                color: "#fff",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {creating ? "저장 중..." : "주소 저장하기"}
            </button>

            {error && (
              <p
                style={{
                  marginTop: 4,
                  color: "red",
                  fontSize: 12,
                }}
              >
                {error}
              </p>
            )}
          </form>
        </section>
      </div>

      {/* ✏️ 수정 모달 */}
      {editing && editForm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 8,
              padding: 20,
              width: 420,
              boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            }}
          >
            <h3
              style={{
                marginTop: 0,
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              주소록 수정
            </h3>

            <div style={{ display: "grid", gap: 8, fontSize: 13 }}>
              <input
                type="text"
                name="placeName"
                value={editForm.placeName}
                onChange={handleEditChange}
                placeholder="상호명"
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="text"
                name="address"
                value={editForm.address}
                onChange={handleEditChange}
                placeholder="주소"
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <input
                type="text"
                name="addressDetail"
                value={editForm.addressDetail}
                onChange={handleEditChange}
                placeholder="상세 주소"
                style={{
                  padding: 6,
                  borderRadius: 4,
                  border: "1px solid #ccc",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  name="contactName"
                  value={editForm.contactName}
                  onChange={handleEditChange}
                  placeholder="담당자명"
                  style={{
                    flex: 1,
                    padding: 6,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
                <input
                  type="tel"
                  name="contactPhone"
                  value={editForm.contactPhone}
                  onChange={handleEditChange}
                  placeholder="연락처"
                  style={{
                    flex: 1,
                    padding: 6,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "#555",
                    width: 40,
                  }}
                >
                  구분
                </span>
                <select
                  name="type"
                  value={editForm.type}
                  onChange={handleEditChange}
                  style={{
                    flex: 1,
                    padding: 6,
                    borderRadius: 4,
                    border: "1px solid #ccc",
                  }}
                >
                  <option value="PICKUP">출발지 전용</option>
                  <option value="DROPOFF">도착지 전용</option>
                  <option value="BOTH">출발/도착 둘 다</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                marginTop: 16,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setEditForm(null);
                }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 4,
                  border: "1px solid #ccc",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
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
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}