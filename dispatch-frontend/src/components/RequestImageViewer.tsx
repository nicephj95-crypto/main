// src/components/RequestImageViewer.tsx
import { useEffect, useRef, type Dispatch, type RefObject, type SetStateAction } from "react";
import type { RequestImageAsset } from "../api/types";
import { ImageViewerCarousel } from "./ImageViewerCarousel";
import { X, Plus } from "lucide-react";
import { fileListFromFiles, imageFilesFromClipboard } from "../utils/imageClipboard";

type Props = {
  imageViewerOpen: boolean;
  imageViewerTitle: string;
  imageViewerKind: "all" | "cargo" | "receipt";
  imageViewerRequestId: number | null;
  imageViewerLoading: boolean;
  imageViewerError: string | null;
  imageViewerItems: RequestImageAsset[];
  imageViewerIndex: number;
  uploadingReceiptId: number | null;
  receiptViewerInputRef: RefObject<HTMLInputElement | null>;
  setImageViewerOpen: Dispatch<SetStateAction<boolean>>;
  handleUploadReceipt: (requestId: number, files: FileList | null) => Promise<void>;
  setImageViewerIndex: Dispatch<SetStateAction<number>>;
  canManageImages: boolean;
};

export function RequestImageViewer({
  imageViewerOpen,
  imageViewerTitle,
  imageViewerKind,
  imageViewerRequestId,
  imageViewerLoading,
  imageViewerError,
  imageViewerItems,
  uploadingReceiptId,
  receiptViewerInputRef,
  setImageViewerOpen,
  handleUploadReceipt,
  canManageImages,
}: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!imageViewerOpen) return;
    window.setTimeout(() => modalRef.current?.focus(), 0);
  }, [imageViewerOpen]);

  if (!imageViewerOpen) return null;

  const canPasteReceipt =
    imageViewerKind === "receipt" &&
    imageViewerRequestId != null &&
    canManageImages &&
    uploadingReceiptId !== imageViewerRequestId;

  const handlePasteImages = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!canPasteReceipt || imageViewerRequestId == null) return;
    const files = imageFilesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault();
    void handleUploadReceipt(imageViewerRequestId, fileListFromFiles(files));
  };

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={() => setImageViewerOpen(false)}
    >
      <div
        ref={modalRef}
        className="dispatch-image-modal img-modal-v2"
        onClick={(e) => e.stopPropagation()}
        onPaste={handlePasteImages}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="요청 이미지 보기"
      >
        <div className="img-modal-header">
          <div className="img-modal-header-info">
            <span className="img-modal-title">{imageViewerTitle}</span>
          </div>
          <button
            type="button"
            className="img-modal-close-btn"
            onClick={() => setImageViewerOpen(false)}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="img-modal-body">
          {imageViewerKind === "receipt" && imageViewerRequestId != null && canManageImages && (
            <>
              <input
                ref={receiptViewerInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  void handleUploadReceipt(imageViewerRequestId, e.target.files);
                  if (receiptViewerInputRef.current) receiptViewerInputRef.current.value = "";
                }}
              />
              <div className="img-modal-toolbar">
                <span className="img-modal-count">
                  이미지 <strong>{imageViewerItems.length}</strong>장
                </span>
                <button
                  type="button"
                  className="img-modal-upload-btn"
                  onClick={() => receiptViewerInputRef.current?.click()}
                  disabled={uploadingReceiptId === imageViewerRequestId}
                >
                  <Plus size={13} />
                  {uploadingReceiptId === imageViewerRequestId ? "업로드 중..." : "이미지 추가"}
                </button>
              </div>
            </>
          )}

          {imageViewerLoading && <div className="img-modal-status">이미지 불러오는 중...</div>}
          {imageViewerError && !imageViewerLoading && (
            <div className="img-modal-error">{imageViewerError}</div>
          )}

          {!imageViewerLoading && !imageViewerError && imageViewerItems.length === 0 && (
            <div className="img-modal-empty">
              <div className="img-modal-empty-icon">
                <Plus size={26} />
              </div>
              <p>등록된 이미지가 없습니다</p>
            </div>
          )}

          {!imageViewerLoading && !imageViewerError && imageViewerItems.length > 0 && (
            <ImageViewerCarousel items={imageViewerItems} />
          )}
        </div>
      </div>
    </div>
  );
}
