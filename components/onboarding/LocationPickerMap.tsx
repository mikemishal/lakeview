"use client";

import { useMemo } from "react";
import L from "leaflet";
import { Circle, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

type LatLng = {
  lat: number;
  lng: number;
};

type LocationPickerMapProps = {
  center: LatLng;
  markerPosition: LatLng | null;
  radiusMiles?: number | null;
  onPickLocation: (lat: number, lng: number) => void;
};

const DEFAULT_ICON = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function ClickHandler({ onPickLocation }: { onPickLocation: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onPickLocation(event.latlng.lat, event.latlng.lng);
    },
  });

  return null;
}

export default function LocationPickerMap({
  center,
  markerPosition,
  radiusMiles,
  onPickLocation,
}: LocationPickerMapProps) {
  const circleRadiusMeters = useMemo(() => {
    if (!radiusMiles || radiusMiles <= 0) {
      return null;
    }

    return radiusMiles * 1609.34;
  }, [radiusMiles]);

  return (
    <MapContainer
      center={center}
      zoom={markerPosition ? 12 : 5}
      style={{ height: "280px", width: "100%", borderRadius: "0.75rem" }}
      className="border border-slate-300"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onPickLocation={onPickLocation} />
      {markerPosition ? <Marker position={markerPosition} icon={DEFAULT_ICON} /> : null}
      {markerPosition && circleRadiusMeters ? (
        <Circle center={markerPosition} radius={circleRadiusMeters} pathOptions={{ color: "#0f172a" }} />
      ) : null}
    </MapContainer>
  );
}
