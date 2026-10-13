'use client';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet's default icon path issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function calculateHaversineDistance(waypoints: { lat: number; lng: number }[]): number {
  if (waypoints.length < 2) return 0;
  const R = 6371; // Earth radius in km
  let totalKm = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const p1 = waypoints[i - 1];
    const p2 = waypoints[i];
    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    totalKm += R * c;
  }
  return Number(totalKm.toFixed(1));
}

export default function RouteMap({
  waypoints,
  distanceKm,
}: {
  waypoints: { lat: number; lng: number; timestamp?: string }[];
  distanceKm?: number;
}) {
  if (!waypoints || waypoints.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl">
        No GPS data available
      </div>
    );
  }

  const positions: [number, number][] = waypoints.map((wp) => [wp.lat, wp.lng]);
  const center = positions[Math.floor(positions.length / 2)];

  // Fallback to computed GPS path distance if distanceKm is 0 or undefined
  let effectiveDistance = (distanceKm !== undefined && distanceKm > 0)
    ? Number(distanceKm.toFixed(1))
    : calculateHaversineDistance(waypoints);

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 1 }}
    >
      <TileLayer
        attribution='&copy; Google'
        url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
      />
      <Polyline positions={positions} color="#0ea5e9" weight={5} opacity={0.8}>
        <Popup>Total Distance: {effectiveDistance > 0 ? `${effectiveDistance} KM` : 'Tracking route'}</Popup>
      </Polyline>

      {/* Start Marker */}
      <Marker position={positions[0]}>
        <Popup>Start: {waypoints[0].timestamp || 'Origin'}</Popup>
      </Marker>

      {/* End Marker */}
      {positions.length > 1 && (
        <Marker position={positions[positions.length - 1]}>
          <Popup>End: {waypoints[waypoints.length - 1].timestamp || 'Destination'}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
