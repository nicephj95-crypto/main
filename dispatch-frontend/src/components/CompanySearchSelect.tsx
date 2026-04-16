import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { CompanyName } from "../api/types";

type Props = {
  value: string;
  onChange: (value: string) => void;
  companyNames: CompanyName[];
  placeholder?: string;
  disabled?: boolean;
};

export function CompanySearchSelect({
  value,
  onChange,
  companyNames,
  placeholder = "업체를 선택하세요",
  disabled = false,
}: Props) {
  const [searchText, setSearchText] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSearchText(value);
    }
  }, [open, value]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  const filtered = companyNames.filter((c) =>
    c.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelect = (name: string) => {
    onChange(name);
    setSearchText(name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="company-search">
      <button
        type="button"
        className={`company-search-trigger${!value ? " is-empty" : ""}${open ? " is-open" : ""}`}
        onClick={() => {
          if (disabled) return;
          setSearchText(value);
          setOpen((prev) => !prev);
        }}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="company-search-trigger-label">{value || placeholder}</span>
        <ChevronDown className="company-search-trigger-icon" size={18} />
      </button>

      {open && !disabled && (
        <div className="company-search-dropdown" role="listbox" aria-label="업체 목록">
          <div className="company-search-filter">
            <Search size={16} className="company-search-filter-icon" />
            <input
              ref={searchInputRef}
              type="text"
              className="company-search-filter-input"
              value={searchText}
              placeholder="업체명 검색"
              onChange={(e) => setSearchText(e.target.value)}
              autoComplete="off"
            />
          </div>

          <ul className="company-search-list">
            {filtered.length === 0 ? (
              <li className="company-search-empty">
                {searchText ? "일치하는 업체가 없습니다." : "등록된 업체가 없습니다."}
              </li>
            ) : (
              filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className={`company-search-item${c.name === value ? " selected" : ""}`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(c.name);
                    }}
                  >
                    <span>{c.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
