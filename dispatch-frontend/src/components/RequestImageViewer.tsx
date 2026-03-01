// src/components/RequestImageViewer.tsx
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import type { RequestImageAsset } from "../api/types";
import { ProtectedImage, ProtectedImageOpenButton } from "./ProtectedImage";

type Props = {
  imageViewerOpen: boolean;
  imageViewerTitle: string;
  imageViewerKind: "all" | "receipt";
  imageViewerRequestId: number | null;
  imageViewerLoading: boolean;
  imageViewerError: string | null;
  imageViewerItems: RequestImageAsset[];
  imageViewerIndex: number;
  uploadingReceiptId: number | null;
  receiptViewerInputRef: MutableRefObject<HTMLInputElement | null>;
  setImageViewerOpen: Dispatch<SetStateAction<boolean>>;
  handleUploadReceipt: (requestId: number, files: FileList | null) => Promise<void>;
  setImageViewerIndex: Dispatch<SetStateAction<number>>;
};

export function RequestImageViewer({
  imageViewerOpen,
  imageViewerTitle,
  imageViewerKind,
  imageViewerRequestId,
  imageViewerLoading,
  imageViewerError,
  imageViewerItems,
  imageViewerIndex,
  uploadingReceiptId,
  receiptViewerInputRef,
  setImageViewerOpen,
  handleUploadReceipt,
  setImageViewerIndex,
}: Props) {
  if (!imageViewerOpen) return null;

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={() => setImageViewerOpen(false)}
    >
      <div
        className="dispatch-image-modal request-image-viewer-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="요청 이미지 보기"
      >
        <div className="dispatch-image-modal-header">
          <h3>{imageViewerTitle}</h3>
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={() => setImageViewerOpen(false)}
          >
            닫기
          </button>
        </div>
        <div className="dispatch-image-modal-body">
          {imageViewerKind === "receipt" && imageViewerRequestId != null && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
              <input
                ref={receiptViewerInputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  void handleUploadReceipt(imageViewerRequestId, e.target.files);
                  if (receiptViewerInputRef.current) receiptViewerInputRef.current.value = "";
                }}
              />
              <button
                type="button"
                className="cargo-image-upload-label"
                style={{ padding: "6px 10px", fontSize: 11 }}
                onClick={() => receiptViewerInputRef.current?.click()}
                disabled={uploadingReceiptId === imageViewerRequestId}
              >
                {uploadingReceiptId === imageViewerRequestId ? "업로드 중..." : "이미지 추가"}
              </button>
            </div>
          )}
          {imageViewerLoading && <div>이미지 불러오는 중...</div>}
          {imageViewerError && !imageViewerLoading && (
            <div>{imageViewerError}</div>
          )}
          {!imageViewerLoading && !imageViewerError && imageViewerItems.length > 0 && (
            <div className="request-image-viewer-wrap">
              <div className="request-image-viewer-main">
                <ProtectedImage
                  src={imageViewerItems[imageViewerIndex].url}
                  alt={imageViewerItems[imageViewerIndex].originalName}
                  style={{ maxWidth: "100%", maxHeight: "100%" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <div className="cargo-image-selected-name" style={{ flex: 1 }}>
                  {imageViewerItems[imageViewerIndex].originalName}
                </div>
                <ProtectedImageOpenButton
                  src={imageViewerItems[imageViewerIndex].url}
                  className="cargo-image-upload-label"
                  style={{ padding: "6px 10px", fontSize: 11 }}
                >
                  크게 보기
                </ProtectedImageOpenButton>
              </div>
              <div className="request-image-viewer-thumbs">
                {imageViewerItems.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    className={`request-image-thumb-btn ${idx === imageViewerIndex ? "active" : ""}`}
                    onClick={() => setImageViewerIndex(idx)}
                  >
                    <ProtectedImage
                      src={img.url}
                      alt={img.originalName}
                      style={{ width: 56, height: 56, objectFit: "cover" }}
                    />
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
