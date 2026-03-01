import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { apiFetch } from "../api/_core";

function toAbsoluteUrl(url: string): string {
  if (!url) return "";
  return url.startsWith("/") ? url : `/${url}`;
}

async function fetchImageObjectUrl(url: string, signal?: AbortSignal): Promise<string> {
  const res = await apiFetch(toAbsoluteUrl(url), { signal });
  if (!res.ok) {
    throw new Error(`이미지 불러오기 실패 (${res.status})`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

type ProtectedImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
};

export function ProtectedImage({ src, alt, className, style }: ProtectedImageProps) {
  const [objectUrl, setObjectUrl] = useState<string>("");

  useEffect(() => {
    if (!src) {
      setObjectUrl("");
      return;
    }

    const controller = new AbortController();
    let mounted = true;
    let currentUrl = "";

    fetchImageObjectUrl(src, controller.signal)
      .then((nextUrl) => {
        if (!mounted) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        currentUrl = nextUrl;
        setObjectUrl(nextUrl);
      })
      .catch(() => {
        if (mounted) setObjectUrl("");
      });

    return () => {
      mounted = false;
      controller.abort();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [src]);

  if (!objectUrl) {
    return <div style={{ ...style, background: "#f5f5f5" }} className={className} aria-hidden="true" />;
  }

  return <img src={objectUrl} alt={alt} className={className} style={style} />;
}

type ProtectedImageOpenButtonProps = {
  src: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function ProtectedImageOpenButton({
  src,
  className,
  style,
  children,
}: ProtectedImageOpenButtonProps) {
  const [opening, setOpening] = useState(false);

  const openImage = async () => {
    if (!src || opening) return;
    try {
      setOpening(true);
      const objectUrl = await fetchImageObjectUrl(src);
      window.open(objectUrl, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      alert("이미지를 열 수 없습니다.");
    } finally {
      setOpening(false);
    }
  };

  return (
    <button type="button" className={className} style={style} onClick={() => void openImage()}>
      {opening ? "열는 중..." : children}
    </button>
  );
}
