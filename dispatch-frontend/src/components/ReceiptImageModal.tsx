// src/components/ReceiptImageModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RequestImageAsset } from "../api/types";
import { ImageViewerCarousel } from "./ImageViewerCarousel";
import { X, Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { openConfirm } from "./ConfirmDialog";

type Props = {
  open: boolean;
  requestId: number | null;
  images: RequestImageAsset[];
  loading: boolean;
  uploading: boolean;
  deletingId: number | null;
  error: string | null;
  pendingFiles: File[];
  previewId: number | null;
  setPreviewId: Dispatch<SetStateAction<number | null>>;
  handleUpload: (files: FileList | null) => void;
  handleRemovePending: (index: number) => void;
  handleDelete: (imageId: number) => void;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isReadOnly?: boolean;
};

export function ReceiptImageModal({
  open,
  requestId,
  images,
  loading,
  uploading,
  deletingId,
  error,
  pendingFiles,
  handleUpload,
  handleRemovePending,
  handleDelete,
  onConfirm,
  onClose,
  isReadOnly = false,
}: Props) {
  const isVisible = open && requestId !== null;
  const totalCount = images.length + pendingFiles.length;
  const [pendingCarouselIndex, setPendingCarouselIndex] = useState(0);

  const urlCacheRef = useRef<Map<File, string>>(new Map());

  const pendingPreviewItems = useMemo(() => {
    const currentSet = new Set(pendingFiles);
    for (const [file, url] of urlCacheRef.current) {
      if (!currentSet.has(file)) {
        URL.revokeObjectURL(url);
        urlCacheRef.current.delete(file);
      }
    }
    return pendingFiles.map((file, index) => {
      if (!urlCacheRef.current.has(file)) {
        urlCacheRef.current.set(file, URL.createObjectURL(file));
      }
      return { index, file, url: urlCacheRef.current.get(file)! };
    });
  }, [pendingFiles]);

  useEffect(() => {
    return () => {
      for (const url of urlCacheRef.current.values()) URL.revokeObjectURL(url);
      urlCacheRef.current.clear();
    };
  }, []);

  useEffect(() => {
    if (pendingPreviewItems.length === 0) {
      setPendingCarouselIndex(0);
      return;
    }
    if (pendingCarouselIndex >= pendingPreviewItems.length) {
      setPendingCarouselIndex(pendingPreviewItems.length - 1);
    }
  }, [pendingPreviewItems.length, pendingCarouselIndex]);

  if (!isVisible || requestId === null) return null;

  const handleRemovePendingWithConfirm = async (index: number) => {
    const ok = await openConfirm({
      title: "이미지 삭제",
      message: "이 이미지를 삭제하시겠습니까?",
    });
    if (!ok) return;
    handleRemovePending(index);
  };

  const pendingSafeIndex = Math.min(
    pendingCarouselIndex,
    Math.max(0, pendingPreviewItems.length - 1)
  );
  const pendingCurrent = pendingPreviewItems[pendingSafeIndex] ?? null;
  const pendingTotal = pendingPreviewItems.length;
  const pendingPrev = () =>
    setPendingCarouselIndex((index) => (index > 0 ? index - 1 : pendingTotal - 1));
  const pendingNext = () =>
    setPendingCarouselIndex((index) => (index < pendingTotal - 1 ? index + 1 : 0));

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="dispatch-image-modal img-modal-v2"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="인수증 이미지"
      >
        <div className="img-modal-header">
          <div className="img-modal-header-info">
            <span className="img-modal-title">인수증 이미지</span>
            <span className="img-modal-subtitle">#{requestId}</span>
          </div>
          <button
            type="button"
            className="img-modal-close-btn"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="img-modal-body">
          {!isReadOnly && (
            <div className="img-modal-toolbar">
              <span className="img-modal-count">
                등록된 이미지 <strong>{totalCount}</strong>/5
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
                    void handleUpload(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  disabled={uploading || totalCount >= 5}
                  style={{ display: "none" }}
                />
                <Plus size={13} />
                {uploading ? "업로드 중..." : "이미지 추가"}
              </label>
            </div>
          )}

          {!isReadOnly && (
            <p className="img-modal-hint">배차완료 상태에서만 인수증 이미지를 저장할 수 있습니다.</p>
          )}

          {loading && <div className="img-modal-status">불러오는 중...</div>}
          {error && <div className="img-modal-error">{error}</div>}

          {!loading && totalCount === 0 && !error && (
            <div className="img-modal-empty">
              <div className="img-modal-empty-icon">
                <Plus size={26} />
              </div>
              <p>등록된 이미지가 없습니다</p>
              {!isReadOnly && (
                <p className="img-modal-empty-sub">최대 5장까지 등록 가능합니다</p>
              )}
            </div>
          )}

          {!loading && images.length > 0 && (
            <ImageViewerCarousel
              items={images}
              deletingId={deletingId}
              onDelete={isReadOnly ? undefined : (id) => handleDelete(id)}
            />
          )}

          {!loading && pendingPreviewItems.length > 0 && (
            <div className="img-modal-pending-section">
              <div className="img-modal-pending-title">업로드 대기 ({pendingPreviewItems.length}장)</div>
              {pendingCurrent && (
                <div className="ivc-wrap">
                  <div className="ivc-main">
                    <button
                      type="button"
                      className="ivc-nav ivc-nav-prev"
                      onClick={pendingPrev}
                      aria-label="이전 대기 이미지"
                      style={pendingTotal <= 1 ? { visibility: "hidden" } : undefined}
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <div className="ivc-img-box">
                      <img
                        src={pendingCurrent.url}
                        alt={pendingCurrent.file.name}
                        className="ivc-img"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        className="ivc-delete-btn"
                        onClick={() => handleRemovePendingWithConfirm(pendingCurrent.index)}
                        title="이미지 삭제"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <button
                      type="button"
                      className="ivc-nav ivc-nav-next"
                      onClick={pendingNext}
                      aria-label="다음 대기 이미지"
                      style={pendingTotal <= 1 ? { visibility: "hidden" } : undefined}
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  <div className="ivc-meta">
                    <span className="ivc-filename">{pendingCurrent.file.name}</span>
                    <span className="ivc-counter">
                      {pendingSafeIndex + 1} / {pendingTotal} · {(pendingCurrent.file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>

                  <div
                    className="ivc-thumbs"
                    style={pendingTotal <= 1 ? { visibility: "hidden" } : undefined}
                  >
                    {pendingPreviewItems.map((item, idx) => (
                      <button
                        key={`${item.file.name}-${item.index}`}
                        type="button"
                        className={`ivc-thumb${idx === pendingSafeIndex ? " active" : ""}`}
                        onClick={() => setPendingCarouselIndex(idx)}
                        title={item.file.name}
                      >
                        <img
                          src={item.url}
                          alt={item.file.name}
                          className="ivc-thumb-img"
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="img-modal-footer">
          {!isReadOnly && (
            <button
              type="button"
              className="img-modal-footer-btn img-modal-footer-btn-primary"
              onClick={() => void onConfirm()}
            >
              저장
            </button>
          )}
          <button
            type="button"
            className="img-modal-footer-btn"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
