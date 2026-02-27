// src/components/AddressBookImageModal.tsx
import type { Dispatch, SetStateAction } from "react";
import type { AddressBookEntry, AddressBookImageAsset } from "../api/types";

type Props = {
  imageModalOpen: boolean;
  imageTarget: AddressBookEntry | null;
  imageItems: AddressBookImageAsset[];
  imageLoading: boolean;
  imageUploading: boolean;
  imageDeletingId: number | null;
  imageError: string | null;
  imagePreviewId: number | null;
  previewImage: AddressBookImageAsset | null;
  setImagePreviewId: Dispatch<SetStateAction<number | null>>;
  handleUploadAddressImages: (files: FileList | null) => void;
  handleDeleteAddressImage: (imageId: number) => void;
  resolveImageUrl: (url: string) => string;
  handleCloseImageModal: () => void;
};

export function AddressBookImageModal({
  imageModalOpen,
  imageTarget,
  imageItems,
  imageLoading,
  imageUploading,
  imageDeletingId,
  imageError,
  imagePreviewId,
  previewImage,
  setImagePreviewId,
  handleUploadAddressImages,
  handleDeleteAddressImage,
  resolveImageUrl,
  handleCloseImageModal,
}: Props) {
  if (!imageModalOpen || !imageTarget) return null;

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={handleCloseImageModal}
    >
      <div
        className="dispatch-image-modal request-image-viewer-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dispatch-image-modal-header">
          <h3>주소록 이미지 - {imageTarget.placeName}</h3>
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={handleCloseImageModal}
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
                  void handleUploadAddressImages(e.target.files);
                  e.currentTarget.value = "";
                }}
                disabled={imageUploading || imageItems.length >= 5}
              />
              {imageUploading ? "업로드 중..." : "이미지 추가 (최대 5장)"}
            </label>
            <div className="cargo-image-upload-help">
              현재 등록: {imageItems.length}/5장
            </div>
            {imageLoading && <div>불러오는 중...</div>}
            {imageError && <div style={{ color: "red", fontSize: 12 }}>{imageError}</div>}
            {!imageLoading && imageItems.length === 0 && !imageError && (
              <div style={{ fontSize: 12, color: "#777" }}>등록된 이미지가 없습니다.</div>
            )}
            {!imageLoading && imageItems.length > 0 && (
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
                  {imageItems.map((img) => (
                    <div key={img.id} className="cargo-image-selected-item">
                      <button
                        type="button"
                        onClick={() => setImagePreviewId(img.id)}
                        style={{
                          border: img.id === imagePreviewId ? "1px solid #8db3f0" : "1px solid #e5e5e5",
                          background: img.id === imagePreviewId ? "#eef4ff" : "#fff",
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
                        onClick={() => void handleDeleteAddressImage(img.id)}
                        disabled={imageDeletingId === img.id}
                      >
                        {imageDeletingId === img.id ? "..." : "삭제"}
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
            onClick={handleCloseImageModal}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
