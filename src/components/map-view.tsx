import { useEffect, useRef } from "react";
import L from "leaflet";
import type { AnalyzedLead } from "@/lib/analyze-lead";

// Fix default marker icons under bundlers
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const STATUS_COLOR = {
  red: "#ef4444",
  yellow: "#f59e0b",
  green: "#10b981",
} as const;

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 0 4px ${color}33,0 0 12px ${color};border:2px solid #0F172A"></span>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

interface Props {
  center: { lat: number; lng: number };
  radiusKm: number;
  leads: AnalyzedLead[];
  selectedName?: string | null;
  onSelect?: (name: string) => void;
}

export default function MapView({
  center,
  radiusKm,
  leads,
  selectedName,
  onSelect,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const userRef = useRef<L.CircleMarker | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // init
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [center.lat, center.lng],
      zoom: 13,
      zoomControl: false,
    });
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "© OpenStreetMap © CARTO",
        subdomains: "abcd",
        maxZoom: 20,
      },
    ).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // center + radius
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setView([center.lat, center.lng], map.getZoom());

    if (userRef.current) userRef.current.remove();
    userRef.current = L.circleMarker([center.lat, center.lng], {
      radius: 6,
      color: "#a78bfa",
      fillColor: "#a78bfa",
      fillOpacity: 1,
      weight: 3,
    }).addTo(map);

    if (circleRef.current) circleRef.current.remove();
    circleRef.current = L.circle([center.lat, center.lng], {
      radius: radiusKm * 1000,
      color: "#a78bfa",
      weight: 1.5,
      fillColor: "#a78bfa",
      fillOpacity: 0.06,
    }).addTo(map);
    map.fitBounds(circleRef.current.getBounds(), { padding: [40, 40] });
  }, [center.lat, center.lng, radiusKm]);

  // markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // clear
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    leads.forEach((lead) => {
      if (lead.latitude == null || lead.longitude == null) return;
      const marker = L.marker([lead.latitude, lead.longitude], {
        icon: pinIcon(STATUS_COLOR[lead.status]),
      })
        .addTo(map)
        .bindTooltip(lead.name, { direction: "top", offset: [0, -8] });
      marker.on("click", () => onSelect?.(lead.name));
      markersRef.current.set(lead.name, marker);
    });
  }, [leads, onSelect]);

  // highlight selected
  useEffect(() => {
    if (!selectedName) return;
    const marker = markersRef.current.get(selectedName);
    if (marker && mapRef.current) {
      mapRef.current.panTo(marker.getLatLng());
      marker.openTooltip();
    }
  }, [selectedName]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-2xl"
      style={{ background: "#0F172A" }}
    />
  );
}
