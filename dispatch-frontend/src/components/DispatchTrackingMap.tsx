import { useEffect, useMemo, useRef, useState } from "react";
import type { DispatchTrackingDto } from "../api/types";

type Leaflet = any;

declare global {
  interface Window {
    L?: Leaflet;
    __dispatchLeafletPromise?: Promise<Leaflet>;
  }
}

type TrackingMapPoint = {
  key: "pickup" | "dropoff" | "driver";
  label: "상차" | "하차" | "기사";
  title: string;
  address: string | null;
  lat: number;
  lng: number;
};

type Props = {
  tracking: DispatchTrackingDto;
};

const LEAFLET_CSS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS_URL = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const DEFAULT_CENTER: [number, number] = [37.5665, 126.9780];

function escapeHtml(value: string | null) {
  return (value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isValidCoordinate(lat: number | null, lng: number | null) {
  return lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);
}

function ensureLeaflet(): Promise<Leaflet> {
  if (window.L) return Promise.resolve(window.L);
  if (window.__dispatchLeafletPromise) return window.__dispatchLeafletPromise;

  window.__dispatchLeafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS_URL}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS_URL;
      document.head.appendChild(link);
    }

    const existingScript = document.querySelector<HTMLScriptElement>(`script[src="${LEAFLET_JS_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", () => reject(new Error("지도 SDK를 불러오지 못했습니다.")));
      return;
    }

    const script = document.createElement("script");
    script.src = LEAFLET_JS_URL;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("지도 SDK를 불러오지 못했습니다."));
    document.body.appendChild(script);
  });

  return window.__dispatchLeafletPromise;
}

function markerIcon(L: Leaflet, point: TrackingMapPoint) {
  const symbol = point.label.slice(0, 1);
  return L.divIcon({
    className: "",
    html: `<div class="tracking-leaflet-marker tracking-leaflet-marker-${point.key}" aria-label="${escapeHtml(point.label)} ${escapeHtml(point.title)}">
      <svg class="tracking-leaflet-pin" viewBox="0 0 48 64" aria-hidden="true">
        <path class="tracking-leaflet-pin-shadow" d="M24 62C22 57 5 37 5 24C5 11.9 13.9 3 24 3s19 8.9 19 21c0 13-17 33-19 38Z" />
        <path class="tracking-leaflet-pin-body" d="M24 61C22.2 56.4 6 37.2 6 24C6 13 14 5 24 5s18 8 18 19c0 13.2-16.2 32.4-18 37Z" />
        <path class="tracking-leaflet-pin-gloss" d="M13 25C13 15.8 19.4 9.5 27.8 9.5C34.8 9.5 39 14 40 19.9C36.9 14.9 31.7 12.5 25.8 12.5C18.5 12.5 13.8 17.3 13 25Z" />
        <circle class="tracking-leaflet-pin-center" cx="24" cy="24" r="11" />
        <text x="24" y="28.5" text-anchor="middle" class="tracking-leaflet-pin-text">${symbol}</text>
      </svg>
      <span class="tracking-leaflet-pin-label">${point.label}</span>
    </div>`,
    iconSize: point.key === "driver" ? [46, 70] : [42, 66],
    iconAnchor: point.key === "driver" ? [23, 64] : [21, 60],
    popupAnchor: [0, -58],
  });
}

function popupHtml(point: TrackingMapPoint) {
  return `<strong>${escapeHtml(point.title)}</strong><br />${escapeHtml(point.address ?? "주소 정보 없음")}`;
}

export function DispatchTrackingMap({ tracking }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet | null>(null);
  const layerRef = useRef<Leaflet | null>(null);
  const hasInitialViewportRef = useRef(false);
  const isAutoViewportRef = useRef(false);
  const userAdjustedViewportRef = useRef(false);
  const wheelLockedUntilRef = useRef(0);
  const wheelCleanupRef = useRef<(() => void) | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const points = useMemo<TrackingMapPoint[]>(() => {
    const next: TrackingMapPoint[] = [];

    if (isValidCoordinate(tracking.pickupLat, tracking.pickupLng)) {
      next.push({
        key: "pickup",
        label: "상차",
        title: tracking.pickupName ?? "상차지",
        address: tracking.pickupAddress,
        lat: tracking.pickupLat!,
        lng: tracking.pickupLng!,
      });
    }

    if (isValidCoordinate(tracking.dropoffLat, tracking.dropoffLng)) {
      next.push({
        key: "dropoff",
        label: "하차",
        title: tracking.dropoffName ?? "하차지",
        address: tracking.dropoffAddress,
        lat: tracking.dropoffLat!,
        lng: tracking.dropoffLng!,
      });
    }

    if (tracking.hasLocation && isValidCoordinate(tracking.currentLat, tracking.currentLng)) {
      next.push({
        key: "driver",
        label: "기사",
        title: tracking.driverName ?? "기사 현재 위치",
        address: tracking.currentAddress,
        lat: tracking.currentLat!,
        lng: tracking.currentLng!,
      });
    }

    return next;
  }, [
    tracking.pickupLat,
    tracking.pickupLng,
    tracking.pickupName,
    tracking.pickupAddress,
    tracking.dropoffLat,
    tracking.dropoffLng,
    tracking.dropoffName,
    tracking.dropoffAddress,
    tracking.hasLocation,
    tracking.currentLat,
    tracking.currentLng,
    tracking.driverName,
    tracking.currentAddress,
  ]);

  const missingMessages = useMemo(() => {
    const messages: string[] = [];
    if (!isValidCoordinate(tracking.pickupLat, tracking.pickupLng)) messages.push("상차지 좌표 없음");
    if (!isValidCoordinate(tracking.dropoffLat, tracking.dropoffLng)) messages.push("하차지 좌표 없음");
    if (!tracking.hasLocation || !isValidCoordinate(tracking.currentLat, tracking.currentLng)) {
      messages.push("현재 위치 정보 없음");
    }
    return messages;
  }, [tracking]);

  useEffect(() => {
    let cancelled = false;

    const renderMap = async () => {
      try {
        const L = await ensureLeaflet();
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
            zoomDelta: 1,
            zoomSnap: 1,
            doubleClickZoom: false,
            touchZoom: "center",
            attributionControl: true,
          }).setView(DEFAULT_CENTER, 11);

          mapRef.current.on("zoomstart dragstart", () => {
            if (!isAutoViewportRef.current) {
              userAdjustedViewportRef.current = true;
            }
          });

          const handleWheel = (event: WheelEvent) => {
            if (!mapRef.current) return;
            event.preventDefault();
            event.stopPropagation();

            const now = Date.now();
            if (now < wheelLockedUntilRef.current) return;
            wheelLockedUntilRef.current = now + 280;
            userAdjustedViewportRef.current = true;

            const direction = event.deltaY > 0 ? -1 : 1;
            const currentZoom = mapRef.current.getZoom();
            const minZoom = mapRef.current.getMinZoom();
            const maxZoom = mapRef.current.getMaxZoom();
            const nextZoom = Math.max(minZoom, Math.min(maxZoom, currentZoom + direction));
            if (nextZoom !== currentZoom) {
              mapRef.current.setZoom(nextZoom, { animate: false });
            }
          };

          const mapContainer = mapRef.current.getContainer();
          mapContainer.addEventListener("wheel", handleWheel, { passive: false });
          wheelCleanupRef.current = () => {
            mapContainer.removeEventListener("wheel", handleWheel);
          };

          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors",
          }).addTo(mapRef.current);
        }

        if (layerRef.current) {
          layerRef.current.remove();
        }
        layerRef.current = L.layerGroup().addTo(mapRef.current);

        points.forEach((point) => {
          L.marker([point.lat, point.lng], { icon: markerIcon(L, point) })
            .bindPopup(popupHtml(point))
            .addTo(layerRef.current);
        });

        if (!hasInitialViewportRef.current && !userAdjustedViewportRef.current) {
          isAutoViewportRef.current = true;

          if (points.length >= 2) {
            const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
            mapRef.current.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: false });
            hasInitialViewportRef.current = true;
          } else if (points.length === 1) {
            mapRef.current.setView([points[0].lat, points[0].lng], 14, { animate: false });
            hasInitialViewportRef.current = true;
          } else {
            mapRef.current.setView(DEFAULT_CENTER, 11, { animate: false });
          }

          window.setTimeout(() => {
            isAutoViewportRef.current = false;
          }, 0);
        }

        window.setTimeout(() => mapRef.current?.invalidateSize(), 80);
        setSdkError(null);
      } catch (err: any) {
        if (!cancelled) setSdkError(err?.message ?? "지도 SDK를 불러오지 못했습니다.");
      }
    };

    void renderMap();

    return () => {
      cancelled = true;
    };
  }, [points]);

  useEffect(() => {
    return () => {
      wheelCleanupRef.current?.();
      wheelCleanupRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  return (
    <div className="tracking-map-shell">
      <div ref={containerRef} className="tracking-leaflet-map" />
      {sdkError && <div className="tracking-map-overlay tracking-map-error">{sdkError}</div>}
      {missingMessages.length > 0 && (
        <div className="tracking-map-overlay tracking-map-missing">
          {missingMessages.join(" · ")}
        </div>
      )}
    </div>
  );
}
