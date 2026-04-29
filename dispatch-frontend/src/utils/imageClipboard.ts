import type React from "react";

export function imageFilesFromClipboard(event: React.ClipboardEvent<HTMLElement>): File[] {
  return Array.from(event.clipboardData.items)
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item, index) => {
      const file = item.getAsFile();
      if (!file) return null;
      const ext = file.type.split("/")[1] || "png";
      return new File([file], file.name || `pasted-image-${Date.now()}-${index}.${ext}`, {
        type: file.type || "image/png",
      });
    })
    .filter((file): file is File => file !== null);
}

export function fileListFromFiles(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}
