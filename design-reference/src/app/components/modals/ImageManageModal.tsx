import { X, Plus, Trash2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ImageManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    name: string;
    images: string[];
  } | null;
  onSave: (images: string[]) => void;
}

export function ImageManageModal({ isOpen, onClose, item, onSave }: ImageManageModalProps) {
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (item) {
      setCurrentImages(item.images || []);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const remainingSlots = 5 - currentImages.length;
    const filesToAdd = Math.min(files.length, remainingSlots);

    const newImages: string[] = [];
    for (let i = 0; i < filesToAdd; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
          if (newImages.length === filesToAdd) {
            setCurrentImages([...currentImages, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDeleteImage = (index: number) => {
    setCurrentImages(currentImages.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(currentImages);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-lg w-full max-w-[600px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--black)' }}>이미지 관리</h3>
            <p className="text-sm mt-0.5" style={{ color: 'var(--gray)' }}>{item.name}</p>
          </div>
          <button 
            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
            onClick={onClose}
          >
            <X size={20} style={{ stroke: 'var(--gray)' }} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-medium" style={{ color: 'var(--black)' }}>
              등록된 이미지 <span style={{ color: 'var(--blue)' }}>{currentImages.length}</span>/5
            </div>
            {currentImages.length < 5 && (
              <button
                className="h-9 px-4 rounded flex items-center gap-1.5 text-sm font-medium text-white transition-colors hover:bg-[#78B6FF]"
                style={{ background: 'var(--blue)' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Plus size={14} />
                이미지 추가
              </button>
            )}
          </div>

          {/* Image Grid */}
          {currentImages.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 max-[768px]:grid-cols-1">
              {currentImages.map((image, index) => (
                <div 
                  key={index}
                  className="relative rounded-lg overflow-hidden group"
                  style={{ border: '1px solid var(--border)' }}
                >
                  <img 
                    src={image} 
                    alt={`이미지 ${index + 1}`}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <button
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow-md transition-all opacity-0 group-hover:opacity-100"
                    onClick={() => handleDeleteImage(index)}
                    title="삭제"
                  >
                    <Trash2 size={14} style={{ stroke: '#ef4444' }} />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
                    <div className="text-xs text-white font-medium">이미지 {index + 1}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div 
              className="rounded-lg p-12 text-center cursor-pointer transition-colors hover:bg-gray-50"
              style={{ border: '2px dashed var(--border)', background: 'var(--bg2)' }}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--blue)', opacity: 0.1 }}>
                  <Plus size={24} style={{ stroke: 'var(--blue)' }} />
                </div>
                <div className="text-sm font-medium" style={{ color: 'var(--gray)' }}>
                  이미지를 추가해주세요
                </div>
                <div className="text-xs" style={{ color: 'var(--gray)' }}>
                  최대 5장까지 등록 가능
                </div>
              </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex items-center justify-end gap-2" style={{ borderColor: 'var(--border)' }}>
          <button 
            className="h-10 px-6 rounded text-sm font-medium transition-colors hover:bg-gray-100"
            style={{ background: 'var(--bg2)', color: 'var(--black)' }}
            onClick={onClose}
          >
            취소
          </button>
          <button 
            className="h-10 px-6 rounded text-sm font-medium text-white transition-colors hover:bg-[#78B6FF]"
            style={{ background: 'var(--blue)' }}
            onClick={handleSave}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}