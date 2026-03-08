"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// ── Types ──
interface Stop {
    index: number;
    name: string;
    time: string;
    description: string;
    lat: number;
    lng: number;
    mapQuery?: string;
    place?: string;
    category: string;
}

interface DayMapProps {
    stops: Stop[];
    highlightedIndex: number | null;
}

// ── Color palette for numbered markers ──
const MARKER_COLORS = [
    "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4",
    "#8b5cf6", "#ef4444", "#14b8a6", "#f97316", "#3b82f6",
];

function createNumberedIcon(index: number) {
    const color = MARKER_COLORS[index % MARKER_COLORS.length];
    return L.divIcon({
        className: "custom-numbered-marker",
        html: `<div style="
            background: ${color};
            color: white;
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 14px;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            font-family: system-ui, sans-serif;
        ">${index + 1}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
    });
}

// ── Sub-component that pans the map when highlightedIndex changes ──
function MapController({ stops, highlightedIndex, markerRefs }: {
    stops: Stop[];
    highlightedIndex: number | null;
    markerRefs: React.MutableRefObject<(L.Marker | null)[]>;
}) {
    const map = useMap();

    useEffect(() => {
        if (highlightedIndex != null && stops[highlightedIndex]) {
            const s = stops[highlightedIndex];
            map.panTo([s.lat, s.lng], { animate: true, duration: 0.4 });
            const marker = markerRefs.current[highlightedIndex];
            if (marker) {
                marker.openPopup();
            }
        }
    }, [highlightedIndex, stops, map, markerRefs]);

    return null;
}

// ── Layer toggle button ──
function LayerToggle({ isSatellite, onToggle }: { isSatellite: boolean; onToggle: () => void }) {
    return (
        <button
            onClick={onToggle}
            style={{
                position: "absolute",
                top: 10,
                right: 10,
                zIndex: 1000,
                background: "rgba(30, 30, 46, 0.85)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                backdropFilter: "blur(8px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
        >
            {isSatellite ? "🗺️ Street" : "🛰️ Satellite"}
        </button>
    );
}

// ── Main component ──
export default function DayMap({ stops, highlightedIndex }: DayMapProps) {
    const [isSatellite, setIsSatellite] = useState(true);
    const markerRefs = useRef<(L.Marker | null)[]>([]);

    const setMarkerRef = useCallback((index: number) => (ref: L.Marker | null) => {
        markerRefs.current[index] = ref;
    }, []);

    if (stops.length === 0) return null;

    // Build bounds
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]));

    // Route polyline points
    const routePoints: [number, number][] = stops.map((s) => [s.lat, s.lng]);

    return (
        <div className="relative overflow-hidden border-4 border-foreground" style={{ height: 400 }}>
            <LayerToggle isSatellite={isSatellite} onToggle={() => setIsSatellite((v) => !v)} />
            <MapContainer
                bounds={bounds}
                boundsOptions={{ padding: [50, 50] }}
                style={{ height: "100%", width: "100%" }}
                zoomControl={true}
                scrollWheelZoom={true}
            >
                {/* Tile layers */}
                {isSatellite ? (
                    <>
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                            attribution="Tiles &copy; Esri"
                        />
                        <TileLayer
                            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                            attribution=""
                        />
                    </>
                ) : (
                    <TileLayer
                        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                        attribution="Tiles &copy; Esri"
                    />
                )}

                {/* Route polylines — white outline, purple center, glow */}
                <Polyline
                    positions={routePoints}
                    pathOptions={{ color: "#818cf8", weight: 12, opacity: 0.2 }}
                />
                <Polyline
                    positions={routePoints}
                    pathOptions={{ color: "white", weight: 7, opacity: 0.5 }}
                />
                <Polyline
                    positions={routePoints}
                    pathOptions={{ color: "#6366f1", weight: 4, opacity: 1 }}
                />

                {/* Markers */}
                {stops.map((stop, i) => (
                    <Marker
                        key={i}
                        position={[stop.lat, stop.lng]}
                        icon={createNumberedIcon(i)}
                        ref={setMarkerRef(i)}
                    >
                        <Popup>
                            <div style={{ minWidth: 180 }}>
                                <strong style={{ fontSize: 14 }}>{stop.name}</strong>
                                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{stop.time}</div>
                                <p style={{ fontSize: 12, marginTop: 4, color: "#374151" }}>{stop.description}</p>
                                {stop.mapQuery && (
                                    <a
                                        href={`https://www.google.com/maps/search/?api=1&query=${stop.mapQuery}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            display: "inline-block",
                                            marginTop: 6,
                                            fontSize: 12,
                                            color: "#6366f1",
                                            fontWeight: 600,
                                            textDecoration: "none",
                                        }}
                                    >
                                        📍 Open in Google Maps →
                                    </a>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapController
                    stops={stops}
                    highlightedIndex={highlightedIndex}
                    markerRefs={markerRefs}
                />
            </MapContainer>
        </div>
    );
}
