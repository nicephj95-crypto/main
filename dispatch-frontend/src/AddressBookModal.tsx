// src/AddressBookModal.tsx
import { useCallback, useEffect, useRef, useState } from "react";
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

const ADDRESS_BOOK_MODAL_PAGE_SIZE = 100;

export function AddressBookModal({
  isOpen,
  targetType = null,
  companyName = null,
  onClose,
  onSelect,
}: AddressBookModalProps) {
  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AddressBookEntry | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<"pickup" | "dropoff">("pickup");
  const requestSeqRef = useRef(0);

  const handleApply = () => {
    if (!selectedEntry) return;
    onSelect(selectedEntry, selectedTarget);
    onClose();
  };

  const hasMore = entries.length < total;

  const fetchPage = useCallback(
    async (targetPage: number, mode: "replace" | "append") => {
      const seq = requestSeqRef.current + 1;
      requestSeqRef.current = seq;
      if (mode === "replace") {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      try {
        const data = await listAddressBook(
          search.trim() || undefined,
          companyName ?? undefined,
          targetPage,
          ADDRESS_BOOK_MODAL_PAGE_SIZE
        );
        if (requestSeqRef.current !== seq) return;
        setEntries((prev) => {
          if (mode === "replace") return data.items;
          const seen = new Set(prev.map((item) => item.id));
          const nextItems = data.items.filter((item) => !seen.has(item.id));
          return [...prev, ...nextItems];
        });
        setPage(data.page);
        setTotal(data.total);
        if (mode === "replace") {
          setSelectedEntry(null);
        }
      } catch (err: any) {
        if (requestSeqRef.current !== seq) return;
        console.error(err);
        setError(err?.message || "주소록을 불러오는 중 오류가 발생했습니다.");
      } finally {
        if (requestSeqRef.current === seq) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [companyName, search]
  );

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSelectedEntry(null);
    setSelectedTarget(targetType === "dropoff" ? "dropoff" : "pickup");
  }, [isOpen, targetType]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      void fetchPage(1, "replace");
    }, search.trim() ? 250 : 0);

    return () => window.clearTimeout(timer);
  }, [isOpen, search, companyName, fetchPage]);

  const handleLoadMore = () => {
    if (loading || loadingMore || !hasMore) return;
    void fetchPage(page + 1, "append");
  };

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

        <div className="dispatch-addressbook-modal-count">
          {loading ? "조회 중" : `표시 ${entries.length.toLocaleString()}건 / 총 ${total.toLocaleString()}건`}
        </div>

        <div className="dispatch-addressbook-modal-list">
          {loading && <div className="dispatch-addressbook-modal-state">불러오는 중...</div>}
          {error && (
            <div className="dispatch-addressbook-modal-state dispatch-addressbook-modal-state-error">
              {error}
            </div>
          )}

          {!loading && !error && entries.length === 0 && (
            <div className="dispatch-addressbook-modal-state">
              {search.trim() === ""
                ? "저장된 주소가 없습니다."
                : "검색 결과가 없습니다."}
            </div>
          )}

          {!loading && !error && entries.length > 0 && (
            entries.map((item) => {
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

          {!loading && !error && hasMore && (
            <button
              type="button"
              className="dispatch-addressbook-modal-load-more"
              onClick={handleLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "불러오는 중..." : "더보기"}
            </button>
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
