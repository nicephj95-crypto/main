// src/components/CompanySearchSelect.tsx
// 검색 가능한 회사명 선택 컴포넌트
import { useEffect, useRef, useState } from "react";
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
  placeholder = "회사명 검색",
  disabled = false,
}: Props) {
  const [inputText, setInputText] = useState(value);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 외부 value 변경 시 inputText 동기화
  useEffect(() => {
    setInputText(value);
  }, [value]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        // 입력한 텍스트가 목록에 없으면 이전 값으로 복원
        const exact = companyNames.find(
          (c) => c.name.toLowerCase() === inputText.toLowerCase()
        );
        if (!exact) {
          setInputText(value);
        }
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [companyNames, inputText, value]);

  const filtered = companyNames.filter((c) =>
    c.name.toLowerCase().includes(inputText.toLowerCase())
  );

  const handleSelect = (name: string) => {
    setInputText(name);
    onChange(name);
    setOpen(false);
  };

  const handleClear = () => {
    setInputText("");
    onChange("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="css-wrap" style={{ position: "relative" }}>
      <div className="company-search-input-wrap">
        <input
          type="text"
          className="company-search-input"
          value={inputText}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => {
            setInputText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          autoComplete="off"
        />
        {inputText && !disabled && (
          <button
            type="button"
            className="company-search-clear"
            onMouseDown={(e) => {
              e.preventDefault();
              handleClear();
            }}
            tabIndex={-1}
            aria-label="지우기"
          >
            ×
          </button>
        )}
      </div>

      {open && !disabled && (
        <ul className="company-search-dropdown">
          {filtered.length === 0 ? (
            <li className="company-search-empty">
              {inputText ? "일치하는 회사 없음" : "등록된 회사 없음"}
            </li>
          ) : (
            filtered.map((c) => (
              <li
                key={c.id}
                className={`company-search-item${c.name === value ? " selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(c.name);
                }}
              >
                {c.name}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
