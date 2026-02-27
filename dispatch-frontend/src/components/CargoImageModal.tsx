// src/components/CargoImageModal.tsx
import type { Dispatch, SetStateAction } from "react";

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
  if (!cargoImageModalOpen) return null;

  return (
    <div
      className="dispatch-image-modal-backdrop"
      onClick={() => setCargoImageModalOpen(false)}
    >
      <div
        className="dispatch-image-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="이미지 추가"
      >
        <div className="dispatch-image-modal-header">
          <h3>이미지 추가</h3>
          <button
            type="button"
            className="dispatch-image-modal-close"
            onClick={() => setCargoImageModalOpen(false)}
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
                  handleSelectCargoImages(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
              이미지 선택 (최대 5장)
            </label>
            <div className="cargo-image-upload-help">
              현재 선택: {cargoImages.length}/5장 (jpg/png/webp, 장당 최대 10MB)
            </div>
            {cargoImages.length > 0 && (
              <div className="cargo-image-selected-list">
                {cargoImages.map((file, idx) => (
                  <div key={`${file.name}-${file.size}-${idx}`} className="cargo-image-selected-item">
                    <div className="cargo-image-selected-name">{file.name}</div>
                    <div className="cargo-image-selected-meta">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    <button
                      type="button"
                      className="cargo-image-remove-btn"
                      onClick={() => handleRemoveCargoImage(idx)}
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
            onClick={() => setCargoImageModalOpen(false)}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
