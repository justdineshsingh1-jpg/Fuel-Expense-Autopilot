import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';

class LocationService {
  StreamSubscription<Position>? _positionStream;
  
  // Tracker State
  Position? _lastSavedPos;
  DateTime? _lastSavedTime;
  Position? _lastGeocodedPos;

  Future<bool> startBackgroundTracking(Function(Position, String, String?) onLocationUpdate) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled on device.');
        // Request enabling
        serviceEnabled = await Geolocator.openLocationSettings();
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }

      // Reset geocode tracker on new shift
      _lastGeocodedPos = null;
      _lastSavedPos = null;
      _lastSavedTime = null;

      // Immediately get fresh current position
      try {
        final initialPos = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 6),
        );
        _processLocation(initialPos, onLocationUpdate, isInitial: true);
      } catch (_) {
        // Fallback to last known position if recent
        try {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown != null) {
            final ageInMins = DateTime.now().difference(lastKnown.timestamp).inMinutes;
            if (ageInMins < 15) {
              _processLocation(lastKnown, onLocationUpdate, isInitial: true);
            }
          }
        } catch (_) {}
      }

      // Start continuous high-fidelity stream (8m filter, 5s interval for smooth route lines)
      _startStream(8, onLocationUpdate);
      return true;
    } catch (e) {
      debugPrint("startBackgroundTracking error: $e");
      return false;
    }
  }

  void _startStream(int distanceFilter, Function(Position, String, String?) onLocationUpdate) {
    _positionStream?.cancel();
    
    LocationSettings locationSettings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: distanceFilter, // 8 meters ensures accurate street turns without straight-line shortcuts
      intervalDuration: const Duration(seconds: 5),
      forceLocationManager: false, // FusedLocationProvider for seamless battery-friendly GPS
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationText: "Tracking your trip route in the background.",
        notificationTitle: "Fuel Expense Autopilot Active",
        enableWakeLock: true,
      ),
    );

    _positionStream = Geolocator.getPositionStream(locationSettings: locationSettings)
        .listen(
          (Position position) {
            _processLocation(position, onLocationUpdate);
          },
          onError: (err) {
            debugPrint("GPS stream error: $err");
          },
        );
  }

  void _processLocation(Position pos, Function(Position, String, String?) onLocationUpdate, {bool isInitial = false}) {
    // 1. Hardware Accuracy Filter:
    // Realistic outdoor mobile accuracy in field environments is up to 150m.
    // Discard only clear cell-tower triangulation spikes (> 150m).
    final maxAllowedAccuracy = isInitial ? 200.0 : 150.0;
    if (pos.accuracy > maxAllowedAccuracy) return;

    DateTime now = DateTime.now();

    // 2. Anti-drift check:
    // If phone is stationary (moved less than 5m and speed < 1.5 km/h), skip recording to avoid phantom KM
    if (_lastSavedPos != null && !isInitial) {
      final distFromLast = Geolocator.distanceBetween(
        _lastSavedPos!.latitude,
        _lastSavedPos!.longitude,
        pos.latitude,
        pos.longitude,
      );

      final speedKmh = pos.speed * 3.6;
      if (distFromLast < 6.0 && speedKmh < 1.5) {
        // Stationary: only heartbeat every 3 minutes if stopped
        if (_lastSavedTime != null && now.difference(_lastSavedTime!).inMinutes < 3) {
          return;
        }
      }
    }

    _lastSavedPos = pos;
    _lastSavedTime = now;

    // 3. Reverse Geocode Address Check (Trigger on initial point or every 3 kilometers)
    double distanceSinceLastGeocode = 99999;
    if (_lastGeocodedPos != null) {
      distanceSinceLastGeocode = Geolocator.distanceBetween(
        _lastGeocodedPos!.latitude, 
        _lastGeocodedPos!.longitude, 
        pos.latitude, 
        pos.longitude
      );
    }

    final mode = (pos.speed * 3.6 > 20) ? 'transit' : 'survey';

    if (isInitial || distanceSinceLastGeocode >= 3000) {
      _lastGeocodedPos = pos;
      getAddressFromLatLng(pos.latitude, pos.longitude).then((address) {
        onLocationUpdate(pos, mode, address);
      }).catchError((_) {
        onLocationUpdate(pos, mode, null);
      });
    } else {
      onLocationUpdate(pos, mode, null);
    }
  }

  void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
    _lastSavedPos = null;
    _lastSavedTime = null;
    _lastGeocodedPos = null;
  }

  Future<Position?> getCurrentPositionSafe() async {
    try {
      return await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
    } catch (_) {
      try {
        return await Geolocator.getLastKnownPosition();
      } catch (_) {
        return null;
      }
    }
  }

  Future<Position> getCurrentLocation() async {
    return await Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.high,
    );
  }

  Future<String> getAddressFromLatLng(double lat, double lng) async {
    try {
      List<Placemark> placemarks = await placemarkFromCoordinates(lat, lng);
      if (placemarks.isNotEmpty) {
        Placemark place = placemarks[0];
        // Clean address formatting (e.g. GS Road, Ganeshguri, Assam)
        List<String> parts = [];
        if (place.street != null && place.street!.isNotEmpty) parts.add(place.street!);
        if (place.subLocality != null && place.subLocality!.isNotEmpty) parts.add(place.subLocality!);
        if (place.locality != null && place.locality!.isNotEmpty) parts.add(place.locality!);
        return parts.join(', ');
      }
      return 'Address not found';
    } catch (e) {
      return 'Failed to get address';
    }
  }
}
