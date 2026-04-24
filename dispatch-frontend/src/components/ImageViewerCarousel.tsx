// src/components/ImageViewerCarousel.tsx
import { useState } from "react";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { ProtectedImage } from "./ProtectedImage";
import { openConfirm } from "./ConfirmDialog";

export type CarouselItem = {
  id: number;
  url: string;
  originalName: string;
  sizeBytes?: number;
};

type Props = {
  items: CarouselItem[];
  deletingId?: number | null;
  onDelete?: (id: number) => void;
};

export function ImageViewerCarousel({ items, deletingId, onDelete }: Props) {
  const [index, setIndex] = useState(0);

  if (items.length === 0) return null;

  const safeIndex = Math.min(index, items.length - 1);
  const current = items[safeIndex];
  const count = items.length;

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : count - 1));
  const next = () => setIndex((i) => (i < count - 1 ? i + 1 : 0));

  const handleDeleteClick = async () => {
    if (!onDelete || !current) return;
    const ok = await openConfirm({
      title: "이미지 삭제",
      message: "이 이미지를 삭제하시겠습니까?",
    });
    if (!ok) return;
    const nextIndex = safeIndex >= count - 1 && safeIndex > 0 ? safeIndex - 1 : safeIndex;
    onDelete(current.id);
    setIndex(nextIndex);
  };

  return (
    <div className="ivc-wrap">
      <div className="ivc-main">
        {count > 1 && (
          <button
            type="button"
            className="ivc-nav ivc-nav-prev"
            onClick={prev}
            aria-label="이전 이미지"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <div className="ivc-img-box">
          <ProtectedImage
            src={current.url}
            alt={current.originalName}
            className="ivc-img"
          />
          {onDelete && (
            <button
              type="button"
              className={`ivc-delete-btn${deletingId === current.id ? " is-deleting" : ""}`}
              onClick={handleDeleteClick}
              disabled={deletingId === current.id}
              title="이미지 삭제"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
        {count > 1 && (
          <button
            type="button"
            className="ivc-nav ivc-nav-next"
            onClick={next}
            aria-label="다음 이미지"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      <div className="ivc-meta">
        <span className="ivc-filename">{current.originalName}</span>
        <span className="ivc-counter">{safeIndex + 1} / {count}</span>
      </div>

      {count > 1 && (
        <div className="ivc-thumbs">
          {items.map((img, idx) => (
            <button
              key={img.id}
              type="button"
              className={`ivc-thumb${idx === safeIndex ? " active" : ""}`}
              onClick={() => setIndex(idx)}
              title={img.originalName}
            >
              <ProtectedImage
                src={img.url}
                alt={img.originalName}
                className="ivc-thumb-img"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
