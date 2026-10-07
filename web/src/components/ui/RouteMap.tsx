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

export default function RouteMap({ waypoints, distanceKm }: { waypoints: {lat: number, lng: number, timestamp: string}[], distanceKm?: number }) {
  if (!waypoints || waypoints.length === 0) {
    return <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl">No GPS data available</div>;
  }

  const positions: [number, number][] = waypoints.map(wp => [wp.lat, wp.lng]);
  const center = positions[Math.floor(positions.length / 2)];

  return (
    <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '0.75rem', zIndex: 1 }}>
      <TileLayer
        attribution='&copy; Google'
        url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
      />
            <Polyline positions={positions} color="#0ea5e9" weight={5} opacity={0.8}>
        {distanceKm !== undefined && <Popup>Total Distance: {distanceKm} KM</Popup>}
      </Polyline>
      
      {/* Start Marker */}
      <Marker position={positions[0]}>
        <Popup>Start: {waypoints[0].timestamp}</Popup>
      </Marker>
      
      {/* End Marker */}
      {positions.length > 1 && (
        <Marker position={positions[positions.length - 1]}>
          <Popup>End: {waypoints[waypoints.length - 1].timestamp}</Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
