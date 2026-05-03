// src/AddressBookModal.tsx
import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { listAddressBook } from "./api/client";
import type { AddressBookEntry } from "./api/types";

interface AddressBookModalProps {
  isOpen: boolean;
  title?: string;
  targetType?: "pickup" | "dropoff" | null;
  companyName?: string | null;
  onClose: () => void;
  onSelect: (entry: AddressBookEntry, selectedTarget?: "pickup" | "dropoff") => void;
}

export function AddressBookModal({
  isOpen,
  targetType = null,
  companyName = null,
  onClose,
  onSelect,
}: AddressBookModalProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AddressBookEntry | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<"pickup" | "dropoff">("pickup");

  const handleApply = () => {
    if (!selectedEntry) return;
    onSelect(selectedEntry, selectedTarget);
    onClose();
  };

  const filterEntries = (items: AddressBookEntry[]) => {
    const normalizedCompany = companyName?.trim().toLowerCase() || "";
    return items.filter((entry) => {
      const entryCompany =
        (entry.businessName?.trim() || entry.placeName?.trim() || "").toLowerCase();
      return !normalizedCompany || entryCompany.includes(normalizedCompany);
    });
  };

  // 모달 열릴 때마다 목록 불러오기
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await listAddressBook(undefined, companyName ?? undefined, 1, 100);
        setEntries(filterEntries(data.items));
        setSelectedEntry(null);
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
    setSelectedEntry(null);
    setSelectedTarget(targetType === "dropoff" ? "dropoff" : "pickup");
  }, [isOpen, targetType, companyName]);

  const normalizedSearch = search.trim().toLowerCase();
  const filteredEntries = normalizedSearch
    ? entries.filter((entry) => {
        const haystack = [
          entry.placeName,
          entry.address,
          entry.addressDetail,
          entry.contactName,
          entry.contactPhone,
          entry.memo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalizedSearch);
      })
    : entries;

  if (!isOpen) return null;

  return (
    <div
      className="dispatch-addressbook-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="dispatch-addressbook-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatch-addressbook-modal-header">
          <span className="dispatch-addressbook-modal-title">주소록</span>
          <button
            type="button"
            className="dispatch-addressbook-modal-close"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="dispatch-addressbook-modal-search">
          <Search size={16} className="dispatch-addressbook-modal-search-icon" />
          <input
            type="text"
            placeholder="장소명/주소/연락처 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="dispatch-addressbook-modal-search-input"
          />
        </div>

        <div className="dispatch-addressbook-modal-list">
          {loading && <div className="dispatch-addressbook-modal-state">불러오는 중...</div>}
          {error && (
            <div className="dispatch-addressbook-modal-state dispatch-addressbook-modal-state-error">
              {error}
            </div>
          )}

          {!loading && !error && filteredEntries.length === 0 && (
            <div className="dispatch-addressbook-modal-state">
              {entries.length === 0
                ? "저장된 주소가 없습니다."
                : "검색 결과가 없습니다."}
            </div>
          )}

          {!loading && !error && filteredEntries.length > 0 && (
            filteredEntries.map((item) => {
              const isSelected = selectedEntry?.id === item.id;
              const addressLine = [item.address, item.addressDetail].filter(Boolean).join(" ");
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`dispatch-addressbook-modal-card${isSelected ? " is-selected" : ""}`}
                  onClick={() => setSelectedEntry(item)}
                >
                  <span className="dispatch-addressbook-modal-card-title">
                    {item.placeName}
                  </span>
                  <span className="dispatch-addressbook-modal-card-address">
                    {addressLine || "-"}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <p className="dispatch-addressbook-modal-target-label">적용 위치</p>
        <div className="dispatch-addressbook-modal-targets">
          <button
            type="button"
            className={`dispatch-addressbook-modal-target${selectedTarget === "pickup" ? " is-active" : ""}`}
            onClick={() => setSelectedTarget("pickup")}
          >
            출발지
          </button>
          <button
            type="button"
            className={`dispatch-addressbook-modal-target${selectedTarget === "dropoff" ? " is-active" : ""}`}
            onClick={() => setSelectedTarget("dropoff")}
          >
            도착지
          </button>
        </div>

        <div className="dispatch-addressbook-modal-actions">
          <button
            type="button"
            className="dispatch-addressbook-modal-cancel"
            onClick={onClose}
          >
            취소
          </button>
          <button
            type="button"
            className="dispatch-addressbook-modal-apply"
            onClick={handleApply}
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
