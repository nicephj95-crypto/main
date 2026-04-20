// src/components/ReceiptImageModal.tsx
import { useEffect, useMemo, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RequestImageAsset } from "../api/types";
import { ImageViewerCarousel } from "./ImageViewerCarousel";
import { X, Plus, Trash2 } from "lucide-react";

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
  }, [pendingPreviewItems]);

  if (!isVisible || requestId === null) return null;

  const handleRemovePendingWithConfirm = (index: number) => {
    if (!window.confirm("이 이미지를 삭제하시겠습니까?")) return;
    handleRemovePending(index);
  };

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
                className="img-modal-upload-btn"
                style={totalCount >= 5 ? { visibility: "hidden", pointerEvents: "none" } : undefined}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
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
            <p className="img-modal-hint">이미지 업로드와 완료 처리는 분리됩니다. 확인 시 완료 상태만 반영됩니다.</p>
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
              <div className="img-modal-pending-list">
                {pendingPreviewItems.map((item) => (
                  <div key={`${item.file.name}-${item.index}`} className="img-modal-pending-item">
                    <div className="img-modal-pending-thumb">
                      <img
                        src={item.url}
                        alt={item.file.name}
                      />
                    </div>
                    <div className="img-modal-pending-info">
                      <div className="img-modal-pending-name">{item.file.name}</div>
                      <div className="img-modal-pending-size">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      type="button"
                      className="img-modal-pending-del"
                      onClick={() => handleRemovePendingWithConfirm(item.index)}
                      title="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
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
              완료
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
