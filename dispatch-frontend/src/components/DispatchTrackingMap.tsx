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
  return L.divIcon({
    className: "",
    html: `<div class="tracking-leaflet-marker tracking-leaflet-marker-${point.key}">
      <span class="tracking-leaflet-marker-icon">${point.label.slice(0, 1)}</span>
      <strong>${point.label}</strong>
      <em>${escapeHtml(point.title)}</em>
    </div>`,
    iconSize: point.key === "driver" ? [154, 48] : [140, 44],
    iconAnchor: point.key === "driver" ? [77, 48] : [70, 44],
    popupAnchor: [0, -42],
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
            scrollWheelZoom: true,
            wheelDebounceTime: 90,
            wheelPxPerZoomLevel: 120,
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
