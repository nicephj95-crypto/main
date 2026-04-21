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
  label: string;
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
      <span>${point.label}</span><strong>${point.title}</strong>
    </div>`,
    iconAnchor: [18, 40],
    popupAnchor: [0, -36],
  });
}

function popupHtml(point: TrackingMapPoint) {
  return `<strong>${point.title}</strong><br />${point.address ?? "주소 정보 없음"}`;
}

export function DispatchTrackingMap({ tracking }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Leaflet | null>(null);
  const layerRef = useRef<Leaflet | null>(null);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const points = useMemo<TrackingMapPoint[]>(() => {
    const next: TrackingMapPoint[] = [];

    if (isValidCoordinate(tracking.pickupLat, tracking.pickupLng)) {
      next.push({
        key: "pickup",
        label: "상",
        title: tracking.pickupName ?? "상차지",
        address: tracking.pickupAddress,
        lat: tracking.pickupLat!,
        lng: tracking.pickupLng!,
      });
    }

    if (isValidCoordinate(tracking.dropoffLat, tracking.dropoffLng)) {
      next.push({
        key: "dropoff",
        label: "하",
        title: tracking.dropoffName ?? "하차지",
        address: tracking.dropoffAddress,
        lat: tracking.dropoffLat!,
        lng: tracking.dropoffLng!,
      });
    }

    if (tracking.hasLocation && isValidCoordinate(tracking.currentLat, tracking.currentLng)) {
      next.push({
        key: "driver",
        label: "차",
        title: tracking.driverName ?? "기사 현재 위치",
        address: tracking.currentAddress,
        lat: tracking.currentLat!,
        lng: tracking.currentLng!,
      });
    }

    return next;
  }, [tracking]);

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
            attributionControl: true,
          }).setView(DEFAULT_CENTER, 11);

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

        if (points.length >= 2) {
          const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
          mapRef.current.fitBounds(bounds, { padding: [44, 44], maxZoom: 15 });
        } else if (points.length === 1) {
          mapRef.current.setView([points[0].lat, points[0].lng], 14);
        } else {
          mapRef.current.setView(DEFAULT_CENTER, 11);
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
