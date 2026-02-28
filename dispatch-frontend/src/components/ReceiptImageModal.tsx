// src/components/ReceiptImageModal.tsx
import type { Dispatch, SetStateAction } from "react";
import type { RequestImageAsset } from "../api/types";

type Props = {
  open: boolean;
  requestId: number | null;
  images: RequestImageAsset[];
  loading: boolean;
  uploading: boolean;
  deletingId: number | null;
  error: string | null;
  previewId: number | null;
  setPreviewId: Dispatch<SetStateAction<number | null>>;
  handleUpload: (files: FileList | null) => void;
  handleDelete: (imageId: number) => void;
  resolveImageUrl: (url: string) => string;
  onClose: () => void;
};

export function ReceiptImageModal({
  open,
  requestId,
  images,
  loading,
  uploading,
  deletingId,
  error,
  previewId,
  setPreviewId,
  handleUpload,
  handleDelete,
  resolveImageUrl,
  onClose,
}: Props) {
  if (!open || requestId === null) return null;

  const previewImage = images.find((img) => img.id === previewId) ?? images[0] ?? null;

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={onClose}
    >
      <div
        className="dispatch-image-modal request-image-viewer-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="인수증 이미지"
      >
        <div className="dispatch-image-modal-header">
          <h3>인수증 이미지 - #{requestId}</h3>
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
        <div className="dispatch-image-modal-body">
          <div className="cargo-image-upload-box">
            <label className="cargo-image-upload-label">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  void handleUpload(e.target.files);
                  e.currentTarget.value = "";
                }}
                disabled={uploading || images.length >= 5}
              />
              {uploading ? "업로드 중..." : "이미지 추가 (최대 5장)"}
            </label>
            <div className="cargo-image-upload-help">
              현재 등록: {images.length}/5장
            </div>
            {loading && <div>불러오는 중...</div>}
            {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
            {!loading && images.length === 0 && !error && (
              <div style={{ fontSize: 12, color: "#777" }}>등록된 이미지가 없습니다.</div>
            )}
            {!loading && images.length > 0 && (
              <>
                {previewImage && (
                  <div className="request-image-viewer-wrap" style={{ marginTop: 4 }}>
                    <div className="request-image-viewer-main" style={{ minHeight: 220, maxHeight: 320 }}>
                      <img
                        src={resolveImageUrl(previewImage.url)}
                        alt={previewImage.originalName}
                        style={{ maxHeight: 320 }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div className="cargo-image-selected-name" style={{ flex: 1 }}>
                        {previewImage.originalName}
                      </div>
                      <a
                        href={resolveImageUrl(previewImage.url)}
                        target="_blank"
                        rel="noreferrer"
                        className="cargo-image-upload-label"
                        style={{ padding: "6px 10px", fontSize: 11 }}
                      >
                        크게 보기
                      </a>
                    </div>
                  </div>
                )}
                <div className="cargo-image-selected-list">
                  {images.map((img) => (
                    <div key={img.id} className="cargo-image-selected-item">
                      <button
                        type="button"
                        onClick={() => setPreviewId(img.id)}
                        style={{
                          border: img.id === previewId ? "1px solid #8db3f0" : "1px solid #e5e5e5",
                          background: img.id === previewId ? "#eef4ff" : "#fff",
                          padding: 0,
                          width: 42,
                          height: 42,
                          borderRadius: 4,
                          overflow: "hidden",
                          cursor: "pointer",
                        }}
                        title="미리보기"
                      >
                        <img
                          src={resolveImageUrl(img.url)}
                          alt={img.originalName}
                          style={{ width: 42, height: 42, objectFit: "cover", border: "none" }}
                        />
                      </button>
                      <div style={{ minWidth: 0 }}>
                        <div className="cargo-image-selected-name">{img.originalName}</div>
                        <div className="cargo-image-selected-meta">
                          {(img.sizeBytes / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                      <button
                        type="button"
                        className="cargo-image-remove-btn"
                        onClick={() => void handleDelete(img.id)}
                        disabled={deletingId === img.id}
                      >
                        {deletingId === img.id ? "..." : "삭제"}
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        <div className="dispatch-image-modal-footer">
          <button
            type="button"
            className="dispatch-image-modal-action"
            onClick={onClose}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
