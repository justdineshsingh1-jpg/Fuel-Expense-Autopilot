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

export function calculateHaversineDistance(waypoints: { lat: number; lng: number }[]): number {
  if (!waypoints || waypoints.length < 2) return 0;
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
  return Number(totalKm.toFixed(2));
}

export interface RouteMapProps {
  waypoints: { lat: number; lng: number; timestamp?: string }[];
  distanceKm?: number;
  claimedDistanceKm?: number;
  osrmDistanceKm?: number;
}

export default function RouteMap({
  waypoints,
  distanceKm,
  claimedDistanceKm,
  osrmDistanceKm,
}: RouteMapProps) {
  if (!waypoints || waypoints.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl">
        No GPS data available
      </div>
    );
  }

  const positions: [number, number][] = waypoints.map((wp) => [wp.lat, wp.lng]);
  const center = positions[Math.floor(positions.length / 2)];

  // ACTUAL distance computed along the polyline path
  const actualPolylineDistance = calculateHaversineDistance(waypoints);
  
  // Odometer distance claimed (if provided)
  const effectiveClaimedKm = claimedDistanceKm ?? distanceKm;

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
      <Polyline positions={positions} color="#0284c7" weight={5} opacity={0.85}>
        <Popup>
          <div className="p-2 space-y-2 font-sans min-w-[210px] text-slate-800">
            <div className="border-b border-slate-200 pb-1.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                GPS Polyline Route
              </div>
              <div className="text-lg font-bold text-sky-600 flex items-baseline gap-1">
                <span>{actualPolylineDistance}</span>
                <span className="text-xs font-semibold text-slate-500">KM (Actual Drawn Map)</span>
              </div>
            </div>

            {effectiveClaimedKm !== undefined && effectiveClaimedKm > 0 && (
              <div className="space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Odometer Claimed:</span>
                  <span className="font-bold text-slate-900">{effectiveClaimedKm.toFixed(1)} KM</span>
                </div>
                {osrmDistanceKm !== undefined && osrmDistanceKm > 0 && (
                  <div className="flex justify-between items-center text-slate-500 text-[11px]">
                    <span>OSRM Road Match:</span>
                    <span className="font-medium">{osrmDistanceKm.toFixed(1)} KM</span>
                  </div>
                )}
                {actualPolylineDistance > 0 && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-100 font-semibold">
                    <span>Variance:</span>
                    <span className={Math.abs(effectiveClaimedKm - actualPolylineDistance) > (actualPolylineDistance * 0.18) ? 'text-red-600' : 'text-emerald-600'}>
                      {effectiveClaimedKm > actualPolylineDistance ? '+' : ''}{(effectiveClaimedKm - actualPolylineDistance).toFixed(1)} KM ({(((effectiveClaimedKm - actualPolylineDistance) / actualPolylineDistance) * 100).toFixed(0)}%)
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="text-[10px] text-slate-400 pt-1 flex justify-between items-center border-t border-slate-100">
              <span>{waypoints.length} GPS pings recorded</span>
              <span className="text-[9px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded font-medium">GPS Track</span>
            </div>
          </div>
        </Popup>
      </Polyline>

      {/* Start Marker */}
      <Marker position={positions[0]}>
        <Popup>
          <div className="text-xs p-1">
            <strong>Trip Start</strong>
            <p className="text-slate-500 mt-0.5">{waypoints[0].timestamp || 'Origin'}</p>
          </div>
        </Popup>
      </Marker>

      {/* End Marker */}
      {positions.length > 1 && (
        <Marker position={positions[positions.length - 1]}>
          <Popup>
            <div className="text-xs p-1">
              <strong>Trip End</strong>
              <p className="text-slate-500 mt-0.5">{waypoints[waypoints.length - 1].timestamp || 'Destination'}</p>
              <p className="text-sky-600 font-semibold mt-1">Total Path: {actualPolylineDistance} KM</p>
            </div>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
