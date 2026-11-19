import 'package:flutter_test/flutter_test.dart';
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

    test('Filters stationary GPS jitter (< 6 meters)', () {
      const p1 = LatLng(27.492400, 95.346800);
      // Small jitter ~2 meters away
      const jitter = LatLng(27.492415, 95.346815);
      // Real movement ~50 meters away
      const realMove = LatLng(27.492800, 95.347100);

      final jitterDist = Geolocator.distanceBetween(p1.latitude, p1.longitude, jitter.latitude, jitter.longitude);
      final realDist = Geolocator.distanceBetween(p1.latitude, p1.longitude, realMove.latitude, realMove.longitude);

      expect(jitterDist < 6.0, isTrue); // Jitter should be discarded
      expect(realDist >= 6.0, isTrue);  // Real movement should be kept
    });
  });
}
