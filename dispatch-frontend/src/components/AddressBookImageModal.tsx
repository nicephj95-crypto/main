// src/components/AddressBookImageModal.tsx
import { useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import type { AddressBookEntry, AddressBookImageAsset } from "../api/types";
import { ImageViewerCarousel } from "./ImageViewerCarousel";
import { X, Plus } from "lucide-react";
import { fileListFromFiles, imageFilesFromClipboard } from "../utils/imageClipboard";

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
  handleCloseImageModal: () => void;
  canManageImages: boolean;
};

export function AddressBookImageModal({
  imageModalOpen,
  imageTarget,
  imageItems,
  imageLoading,
  imageUploading,
  imageDeletingId,
  imageError,
  handleUploadAddressImages,
  handleDeleteAddressImage,
  handleCloseImageModal,
  canManageImages,
}: Props) {
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!imageModalOpen) return;
    window.setTimeout(() => modalRef.current?.focus(), 0);
  }, [imageModalOpen]);

  if (!imageModalOpen || !imageTarget) return null;

  const handlePasteImages = (event: React.ClipboardEvent<HTMLDivElement>) => {
    if (!canManageImages || imageUploading || imageItems.length >= 5) return;
    const files = imageFilesFromClipboard(event);
    if (files.length === 0) return;
    event.preventDefault();
    handleUploadAddressImages(fileListFromFiles(files.slice(0, Math.max(0, 5 - imageItems.length))));
  };

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={handleCloseImageModal}
    >
      <div
        ref={modalRef}
        className="dispatch-image-modal img-modal-v2"
        onClick={(e) => e.stopPropagation()}
        onPaste={handlePasteImages}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="주소록 이미지 관리"
      >
        <div className="img-modal-header">
          <div className="img-modal-header-info">
            <span className="img-modal-title">이미지 관리</span>
            <span className="img-modal-subtitle">{imageTarget.placeName}</span>
          </div>
          <button
            type="button"
            className="img-modal-close-btn"
            onClick={handleCloseImageModal}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="img-modal-body">
          <div className="img-modal-toolbar">
            <span className="img-modal-count">
              등록된 이미지 <strong>{imageItems.length}</strong>/5
            </span>
            {canManageImages && imageItems.length < 5 && (
              <label className="img-modal-upload-btn">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    void handleUploadAddressImages(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  disabled={imageUploading}
                  style={{ display: "none" }}
                />
                <Plus size={13} />
                {imageUploading ? "업로드 중..." : "이미지 추가"}
              </label>
            )}
          </div>

          {imageLoading && <div className="img-modal-status">불러오는 중...</div>}
          {imageError && <div className="img-modal-error">{imageError}</div>}

          {!imageLoading && imageItems.length === 0 && !imageError && (
            <div className="img-modal-empty">
              <div className="img-modal-empty-icon">
                <Plus size={26} />
              </div>
              <p>등록된 이미지가 없습니다</p>
              <p className="img-modal-empty-sub">
                {canManageImages ? "최대 5장까지 등록 가능합니다 (Ctrl+V 가능)" : "등록된 이미지를 확인할 수 있습니다"}
              </p>
            </div>
          )}

          {!imageLoading && imageItems.length > 0 && (
            <ImageViewerCarousel
              items={imageItems}
              deletingId={imageDeletingId}
              onDelete={canManageImages ? handleDeleteAddressImage : undefined}
            />
          )}
        </div>

        <div className="img-modal-footer">
          <button
            type="button"
            className="img-modal-footer-btn"
            onClick={handleCloseImageModal}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
