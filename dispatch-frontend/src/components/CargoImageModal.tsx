// src/components/CargoImageModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { openConfirm } from "./ConfirmDialog";

type Props = {
  cargoImageModalOpen: boolean;
  cargoImages: File[];
  setCargoImageModalOpen: Dispatch<SetStateAction<boolean>>;
  handleSelectCargoImages: (files: FileList | null) => void;
  handleRemoveCargoImage: (index: number) => void;
};

export function CargoImageModal({
  cargoImageModalOpen,
  cargoImages,
  setCargoImageModalOpen,
  handleSelectCargoImages,
  handleRemoveCargoImage,
}: Props) {
  const [carouselIndex, setCarouselIndex] = useState(0);
  const totalCount = cargoImages.length;

  // File → blob URL 안정 캐시: 같은 File 객체는 URL을 재생성하지 않음
  const urlCacheRef = useRef<Map<File, string>>(new Map());

  const previewItems = useMemo(() => {
    const currentSet = new Set(cargoImages);
    // 더 이상 사용하지 않는 파일의 URL 해제
    for (const [file, url] of urlCacheRef.current) {
      if (!currentSet.has(file)) {
        URL.revokeObjectURL(url);
        urlCacheRef.current.delete(file);
      }
    }
    // 새 파일만 URL 생성
    return cargoImages.map((file, index) => {
      if (!urlCacheRef.current.has(file)) {
        urlCacheRef.current.set(file, URL.createObjectURL(file));
      }
      return { index, file, url: urlCacheRef.current.get(file)! };
    });
  }, [cargoImages]);

  // 모달 언마운트 시 모든 URL 해제
  useEffect(() => {
    return () => {
      for (const url of urlCacheRef.current.values()) URL.revokeObjectURL(url);
      urlCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (totalCount === 0) setCarouselIndex(0);
    else if (carouselIndex >= totalCount) setCarouselIndex(totalCount - 1);
  }, [totalCount, carouselIndex]);

  if (!cargoImageModalOpen) return null;

  const safeIndex = Math.min(carouselIndex, Math.max(0, totalCount - 1));
  const current = previewItems[safeIndex];

  const prev = () => setCarouselIndex((i) => (i > 0 ? i - 1 : totalCount - 1));
  const next = () => setCarouselIndex((i) => (i < totalCount - 1 ? i + 1 : 0));

  const handleRemoveWithConfirm = async (index: number) => {
    const ok = await openConfirm({
      title: "이미지 삭제",
      message: "이 이미지를 삭제하시겠습니까?",
    });
    if (!ok) return;
    handleRemoveCargoImage(index);
  };

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={() => setCargoImageModalOpen(false)}
    >
      <div
        className="dispatch-image-modal img-modal-v2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="이미지 추가"
      >
        <div className="img-modal-header">
          <div className="img-modal-header-info">
            <span className="img-modal-title">화물 이미지</span>
            <span className="img-modal-subtitle">{totalCount}장</span>
          </div>
          <button
            type="button"
            className="img-modal-close-btn"
            onClick={() => setCargoImageModalOpen(false)}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="img-modal-body">
          <div className="img-modal-toolbar">
            <span className="img-modal-count">
              이미지 <strong>{totalCount}</strong>/5
            </span>
            <label
              className={`img-modal-upload-btn${totalCount >= 5 ? " is-disabled" : ""}`}
            >
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  if (totalCount >= 5) return;
                  handleSelectCargoImages(e.target.files);
                  e.currentTarget.value = "";
                }}
                disabled={totalCount >= 5}
                style={{ display: "none" }}
              />
              <Plus size={13} />
              이미지 추가
            </label>
          </div>

          {totalCount === 0 && (
            <div className="img-modal-empty">
              <div className="img-modal-empty-icon"><Plus size={26} /></div>
              <p>등록된 이미지가 없습니다</p>
              <p className="img-modal-empty-sub">최대 5장 (jpg/png/webp, 장당 최대 10MB)</p>
            </div>
          )}

          {totalCount > 0 && current && (
            <div className="ivc-wrap">
              <div className="ivc-main">
                <button
                  type="button"
                  className="ivc-nav ivc-nav-prev"
                  onClick={prev}
                  aria-label="이전 이미지"
                  style={totalCount <= 1 ? { visibility: "hidden" } : undefined}
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="ivc-img-box">
                  <img src={current.url} alt={current.file.name} className="ivc-img" />
                  <button
                    type="button"
                    className="ivc-delete-btn"
                    onClick={() => handleRemoveWithConfirm(current.index)}
                    title="이미지 삭제"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <button
                  type="button"
                  className="ivc-nav ivc-nav-next"
                  onClick={next}
                  aria-label="다음 이미지"
                  style={totalCount <= 1 ? { visibility: "hidden" } : undefined}
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="ivc-meta">
                <span className="ivc-filename">{current.file.name}</span>
                <span className="ivc-counter">{safeIndex + 1} / {totalCount}</span>
              </div>

              <div
                className="ivc-thumbs"
                style={totalCount <= 1 ? { visibility: "hidden" } : undefined}
              >
                {previewItems.map((item, idx) => (
                  <button
                    key={`${item.file.name}-${item.index}`}
                    type="button"
                    className={`ivc-thumb${idx === safeIndex ? " active" : ""}`}
                    onClick={() => setCarouselIndex(idx)}
                    title={item.file.name}
                  >
                    <img src={item.url} alt={item.file.name} className="ivc-thumb-img" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
