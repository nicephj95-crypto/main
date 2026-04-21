// src/AddressSearchModal.tsx
import { useEffect, useRef } from "react";
import { formatSelectedAddress } from "./utils/addressFormat";

type AddressSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
};

export function AddressSearchModal({
  isOpen,
  onClose,
  onSelect,
}: AddressSearchModalProps) {
  const embedRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!window.daum || !window.daum.Postcode) {
      alert("주소 검색 서비스를 사용할 수 없습니다. (daum.Postcode 미로딩)");
      onClose();
      return;
    }

    const container = embedRef.current;
    if (!container) return;

    container.innerHTML = "";
    const postcode = new window.daum.Postcode({
      oncomplete: function (data: any) {
        const selected = formatSelectedAddress(data);

        if (selected) {
          onSelect(selected);
        }

        onClose();
      },
      onclose: function () {
        onClose();
      },
    });

    postcode.embed(container);

    return () => {
      container.innerHTML = "";
    };
  }, [isOpen, onClose, onSelect]);

  if (!isOpen) return null;

  return (
    <div className="address-search-layer" role="dialog" aria-modal="true">
      <button type="button" className="address-search-close" onClick={onClose} aria-label="주소 검색 닫기">
        ×
      </button>
      <div ref={embedRef} className="address-search-embed" />
    </div>
  );
}
