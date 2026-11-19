import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';

void main() {
  group('Route GPS and Distance Calculations', () {
    test('Calculates distance correctly between known GPS coordinates', () {
      // Tinsukia Station to Borguri (approx 4.1 KM)
      const start = LatLng(27.4924, 95.3468);
      const mid = LatLng(27.5000, 95.3300);
      const end = LatLng(27.5120, 95.3150);

      final d1 = Geolocator.distanceBetween(start.latitude, start.longitude, mid.latitude, mid.longitude);
      final d2 = Geolocator.distanceBetween(mid.latitude, mid.longitude, end.latitude, end.longitude);
      final totalKm = (d1 + d2) / 1000.0;

      expect(totalKm, greaterThan(3.5));
      expect(totalKm, lessThan(5.0));
    });

    test('Parses raw waypoints list correctly into LatLng coordinates', () {
      final rawWaypoints = [
        {'lat': 27.4924, 'lng': 95.3468, 'timestamp': '2026-11-18T10:00:00Z'},
        {'lat': 27.5000, 'lng': 95.3300, 'timestamp': '2026-11-18T10:05:00Z'},
        {'lat': 0.0, 'lng': 0.0, 'timestamp': '2026-11-18T10:10:00Z'}, // Invalid 0,0
        {'lat': null, 'lng': null, 'timestamp': '2026-11-18T10:15:00Z'}, // Nulls
        {'lat': 27.5120, 'lng': 95.3150, 'timestamp': '2026-11-18T10:20:00Z'},
      ];

      final List<LatLng> validPts = [];
      for (final w in rawWaypoints) {
        final lat = (w['lat'] as num?)?.toDouble();
        final lng = (w['lng'] as num?)?.toDouble();
        if (lat != null && lng != null && lat != 0.0 && lng != 0.0) {
          validPts.add(LatLng(lat, lng));
        }
      }

      expect(validPts.length, equals(3));
      expect(validPts[0].latitude, equals(27.4924));
      expect(validPts[1].latitude, equals(27.5000));
      expect(validPts[2].latitude, equals(27.5120));
    });

    test('Rejects teleportation / cellular tower spike (e.g. 2.15 KM jump in 5s)', () {
      const officePos = LatLng(26.1362, 91.7924); // Guwahati office
      const stalePos = LatLng(26.1520, 91.8050);  // ~2.15 KM away

      final dist = Geolocator.distanceBetween(
        officePos.latitude, officePos.longitude,
        stalePos.latitude, stalePos.longitude,
      );
      const deltaSec = 5; // Arrived 5 seconds apart
      final impliedSpeedMps = dist / deltaSec;

      expect(dist, greaterThan(2000)); // ~2.15 KM
      // Implied speed is ~430 m/s (~1550 km/h) -> must be rejected
      final isTeleportation = (dist > 100.0) && (impliedSpeedMps > 33.3);
      expect(isTeleportation, isTrue);
    });

    test('Rejects stationary office pacing / jitter (< 15m or speed < 0.8 m/s)', () {
      const p1 = LatLng(26.136200, 91.792400);
      // Office movement of ~4 meters
      const officePacing = LatLng(26.136230, 91.792420);
      // Real vehicular movement of ~60 meters
      const vehicleDrive = LatLng(26.136700, 91.792700);

      final paceDist = Geolocator.distanceBetween(p1.latitude, p1.longitude, officePacing.latitude, officePacing.longitude);
      final driveDist = Geolocator.distanceBetween(p1.latitude, p1.longitude, vehicleDrive.latitude, vehicleDrive.longitude);

      const speedOffice = 0.2; // 0.2 m/s
      const speedVehicle = 7.5; // ~27 km/h

      final isRealPace = (paceDist >= 15.0 && speedOffice >= 0.8) || paceDist >= 35.0;
      final isRealDrive = (driveDist >= 15.0 && speedVehicle >= 0.8) || driveDist >= 35.0;

      expect(isRealPace, isFalse); // Office pacing rejected
      expect(isRealDrive, isTrue);  // Vehicle drive accepted
    });

    test('Clustered points within office bounds (< 0.0015 deg) detected correctly', () {
      final officePoints = [
        const LatLng(26.136200, 91.792400),
        const LatLng(26.136215, 91.792410),
      ];

      final bounds = LatLngBounds.fromPoints(officePoints);
      final latDiff = (bounds.north - bounds.south).abs();
      final lngDiff = (bounds.east - bounds.west).abs();

      // Diff is tiny (~0.000015 deg), bounds clustering check must trigger
      final isClustered = latDiff < 0.0015 && lngDiff < 0.0015;
      expect(isClustered, isTrue);
    });
  });
}
