// src/components/ReceiptImageModal.tsx
import { useEffect, useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { RequestImageAsset } from "../api/types";
import { ProtectedImage, ProtectedImageOpenButton } from "./ProtectedImage";

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
  previewId,
  setPreviewId,
  handleUpload,
  handleRemovePending,
  handleDelete,
  onConfirm,
  onClose,
}: Props) {
  const isVisible = open && requestId !== null;
  const previewImage = images.find((img) => img.id === previewId) ?? images[0] ?? null;
  const totalCount = images.length + pendingFiles.length;
  const pendingPreviewItems = useMemo(
    () =>
      pendingFiles.map((file, index) => ({
        index,
        file,
        url: URL.createObjectURL(file),
      })),
    [pendingFiles]
  );

  useEffect(() => {
    return () => {
      pendingPreviewItems.forEach((it) => URL.revokeObjectURL(it.url));
    };
  }, [pendingPreviewItems]);

  if (!isVisible || requestId === null) return null;

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
                disabled={uploading || totalCount >= 5}
              />
              {uploading ? "업로드 중..." : "이미지 추가 (최대 5장)"}
            </label>
            <div className="cargo-image-upload-help">
              현재 등록: {totalCount}/5장
            </div>
            <div className="cargo-image-upload-help">완료 상태로 변경 시 서버에 업로드됩니다.</div>
            {loading && <div>불러오는 중...</div>}
            {error && <div style={{ color: "red", fontSize: 12 }}>{error}</div>}
            {!loading && totalCount === 0 && !error && (
              <div style={{ fontSize: 12, color: "#777" }}>등록된 이미지가 없습니다.</div>
            )}
            {!loading && images.length > 0 && (
              <>
                {previewImage && (
                  <div className="request-image-viewer-wrap" style={{ marginTop: 4 }}>
                    <div className="request-image-viewer-main" style={{ minHeight: 220, maxHeight: 320 }}>
                      <ProtectedImage
                        src={previewImage.url}
                        alt={previewImage.originalName}
                        style={{ maxHeight: 320, maxWidth: "100%" }}
                      />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <div className="cargo-image-selected-name" style={{ flex: 1 }}>
                        {previewImage.originalName}
                      </div>
                      <ProtectedImageOpenButton
                        src={previewImage.url}
                        className="cargo-image-upload-label"
                        style={{ padding: "6px 10px", fontSize: 11 }}
                      >
                        크게 보기
                      </ProtectedImageOpenButton>
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
                        <ProtectedImage
                          src={img.url}
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
            {!loading && pendingPreviewItems.length > 0 && (
              <div className="cargo-image-selected-list" style={{ marginTop: 10 }}>
                {pendingPreviewItems.map((item) => (
                  <div key={`${item.file.name}-${item.index}`} className="cargo-image-selected-item">
                    <div
                      style={{
                        border: "1px solid #e5e5e5",
                        background: "#fff",
                        width: 42,
                        height: 42,
                        borderRadius: 4,
                        overflow: "hidden",
                        flexShrink: 0,
                      }}
                      title="업로드 대기 이미지"
                    >
                      <img
                        src={item.url}
                        alt={item.file.name}
                        style={{ width: 42, height: 42, objectFit: "cover", border: "none" }}
                      />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="cargo-image-selected-name">{item.file.name}</div>
                      <div className="cargo-image-selected-meta">
                        {(item.file.size / 1024 / 1024).toFixed(2)} MB (업로드 대기)
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cargo-image-remove-btn"
                      onClick={() => handleRemovePending(item.index)}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="dispatch-image-modal-footer">
          <button
            type="button"
            className="dispatch-image-modal-action"
            onClick={() => {
              void onConfirm();
            }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
