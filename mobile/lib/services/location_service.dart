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
        if (initialPos.accuracy <= 80.0) {
          _processLocation(initialPos, onLocationUpdate, isInitial: true);
        }
      } catch (_) {
        // Fallback to last known position ONLY if very fresh (< 60s) and accurate (<= 50m)
        try {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown != null) {
            final ageInSec = DateTime.now().difference(lastKnown.timestamp).inSeconds.abs();
            if (ageInSec < 60 && lastKnown.accuracy <= 50.0) {
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
    // Realistic outdoor mobile accuracy in Indian field environments is up to 100m.
    // Discard only clear cell-tower triangulation spikes (> 100m).
    final maxAllowedAccuracy = isInitial ? 120.0 : 100.0;
    if (pos.accuracy > maxAllowedAccuracy) return;

    DateTime now = DateTime.now();

    // 2. Teleportation sanity check:
    if (_lastSavedPos != null && !isInitial) {
      final distFromLast = Geolocator.distanceBetween(
        _lastSavedPos!.latitude,
        _lastSavedPos!.longitude,
        pos.latitude,
        pos.longitude,
      );

      final elapsedSec = now.difference(_lastSavedTime ?? now).inSeconds.abs();
      // Teleportation sanity: if distance > 100m and speed > 35 m/s (126 km/h), reject glitch
      if (elapsedSec > 0 && distFromLast > 100.0 && (distFromLast / elapsedSec) > 35.0) {
        debugPrint("LocationService: rejected teleportation glitch: $distFromLast m in $elapsedSec s");
        return;
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
      final pos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 6),
      );
      if (pos.accuracy <= 80.0) return pos;
    } catch (_) {}

    // Only accept last known position if very fresh (< 60s) and accurate (<= 50m)
    try {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        final ageInSec = DateTime.now().difference(lastKnown.timestamp).inSeconds.abs();
        if (ageInSec < 60 && lastKnown.accuracy <= 50.0) {
          return lastKnown;
        }
      }
    } catch (_) {}
    return null;
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
