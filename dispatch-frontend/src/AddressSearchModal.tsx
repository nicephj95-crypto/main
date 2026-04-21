// src/AddressSearchModal.tsx
import { useEffect } from "react";
import { formatSelectedAddress } from "./utils/addressFormat";

type AddressSearchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string) => void;
  title?: string;
};

export function AddressSearchModal({
  isOpen,
  onClose,
  onSelect,
}: AddressSearchModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    if (!window.daum || !window.daum.Postcode) {
      alert("주소 검색 서비스를 사용할 수 없습니다. (daum.Postcode 미로딩)");
      onClose();
      return;
    }

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

    postcode.open();
  }, [isOpen, onClose, onSelect]);

  return null;
}
