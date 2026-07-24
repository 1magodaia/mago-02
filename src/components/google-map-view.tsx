/// <reference types="google.maps" />
import { useEffect, useRef } from "react";
import type { ScoredLead } from "@/lib/scoring";

declare global {
  interface Window {
    google?: typeof google;
    __bmInitMap?: () => void;
    __bmMapReady?: boolean;
  }
}

const SCRIPT_ID = "bm-google-maps-js";

function loadMapsApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("SSR"));
  if (window.google?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (document.getElementById(SCRIPT_ID)) {
      const check = () => {
        if (window.google?.maps) resolve();
        else setTimeout(check, 100);
      };
      check();
      return;
    }
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      reject(new Error("VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY ausente"));
      return;
    }
    window.__bmInitMap = () => {
      window.__bmMapReady = true;
      resolve();
    };
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__bmInitMap${channel ? `&channel=${channel}` : ""}`;
    script.onerror = () => reject(new Error("Falha ao carregar Google Maps"));
    document.head.appendChild(script);
  });
}

const DARK_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a0a0a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000" }] },
  // Hide administrative labels to avoid duplicated city names overlapping
  // the native locality label (Google renders both at some zoom levels in dark styles).
  { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "on" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1c1c1c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6b6b6b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#050505" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
];

const STATUS_COLOR: Record<ScoredLead["status"], string> = {
  hot: "#7C4DFF",
  warm: "#E4A94A",
  cold: "#6b7280",
};

interface Props {
  center: { lat: number; lng: number };
  radiusKm: number;
  leads: ScoredLead[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

export default function GoogleMapView({ center, radiusKm, leads, selectedId, onSelect, onMapClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const infoRef = useRef<google.maps.InfoWindow | null>(null);

  const onMapClickRef = useRef(onMapClick);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);

  useEffect(() => {
    let cancelled = false;
    loadMapsApi()
      .then(() => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center,
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
          styles: DARK_STYLE,
          backgroundColor: "#000",
          clickableIcons: false,
          draggableCursor: "crosshair",
          draggingCursor: "grabbing",
        });
        infoRef.current = new google.maps.InfoWindow();
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          const ll = e.latLng;
          if (!ll || !onMapClickRef.current) return;
          onMapClickRef.current({ lat: ll.lat(), lng: ll.lng() });
        });
      })
      .catch((err) => console.error("[map] load", err));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // center + radius
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    map.setCenter(center);
    userMarkerRef.current?.setMap(null);
    userMarkerRef.current = new google.maps.Marker({
      position: center,
      map,
      draggable: true,
      cursor: "grab",
      title: "Arraste para ajustar o centro da busca",
      animation: google.maps.Animation.DROP,
      zIndex: 9999,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#7C4DFF",
        fillOpacity: 1,
        strokeColor: "#fff",
        strokeWeight: 3,
      },
    });
    userMarkerRef.current.addListener("dragend", (e: google.maps.MapMouseEvent) => {
      const ll = e.latLng;
      if (!ll || !onMapClickRef.current) return;
      onMapClickRef.current({ lat: ll.lat(), lng: ll.lng() });
    });
    circleRef.current?.setMap(null);
    circleRef.current = new google.maps.Circle({
      map,
      center,
      radius: radiusKm * 1000,
      strokeColor: "#7C4DFF",
      strokeOpacity: 0.8,
      strokeWeight: 1.5,
      fillColor: "#7C4DFF",
      fillOpacity: 0.05,
    });
    const bounds = circleRef.current.getBounds();
    if (bounds) map.fitBounds(bounds);
  }, [center.lat, center.lng, radiusKm]);

  // markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !window.google?.maps) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current.clear();
    leads.forEach((lead) => {
      if (lead.lat == null || lead.lng == null) return;
      const marker = new google.maps.Marker({
        position: { lat: lead.lat, lng: lead.lng },
        map,
        title: lead.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: STATUS_COLOR[lead.status],
          fillOpacity: 1,
          strokeColor: "#000",
          strokeWeight: 2,
        },
      });
      marker.addListener("click", () => {
        onSelect?.(lead.place_id);
        infoRef.current?.setContent(
          `<div style="color:#000;font-family:system-ui;font-size:12px;padding:4px"><strong>${lead.name}</strong><br/>Score: ${lead.opportunity_score}</div>`,
        );
        infoRef.current?.open({ map, anchor: marker });
      });
      markersRef.current.set(lead.place_id, marker);
    });
  }, [leads, onSelect]);

  // pan to selected
  useEffect(() => {
    if (!selectedId) return;
    const marker = markersRef.current.get(selectedId);
    const map = mapRef.current;
    if (marker && map) {
      const pos = marker.getPosition();
      if (pos) map.panTo(pos);
    }
  }, [selectedId]);

  return <div ref={containerRef} className="h-full w-full" style={{ background: "#000" }} />;
}
