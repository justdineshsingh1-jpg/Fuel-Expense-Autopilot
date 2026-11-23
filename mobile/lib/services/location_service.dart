import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';

class LocationService {
  StreamSubscription<Position>? _positionStream;
  Timer? _keepAliveTimer;
  
  // Tracker State
  Position? _lastSavedPos;
  DateTime? _lastSavedTime;
  Position? _lastGeocodedPos;

  Future<bool> startBackgroundTracking(Function(Position, String, String?) onLocationUpdate) async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        debugPrint('Location services are disabled on device.');
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
        if (initialPos.accuracy <= 160.0) {
          _processLocation(initialPos, onLocationUpdate, isInitial: true);
        }
      } catch (_) {
        try {
          final lastKnown = await Geolocator.getLastKnownPosition();
          if (lastKnown != null) {
            final ageInSec = DateTime.now().difference(lastKnown.timestamp).inSeconds.abs();
            if (ageInSec < 120 && lastKnown.accuracy <= 100.0) {
              _processLocation(lastKnown, onLocationUpdate, isInitial: true);
            }
          }
        } catch (_) {}
      }

      // Start continuous high-fidelity stream (8m filter, 5s interval for smooth route lines)
      _startStream(8, onLocationUpdate);

      // Start keep-alive periodic polling (every 12 seconds)
      // This prevents Android OS from suspending GPS when the screen is locked in the rider's pocket
      _keepAliveTimer?.cancel();
      _keepAliveTimer = Timer.periodic(const Duration(seconds: 12), (_) async {
        if (_positionStream == null) return;
        try {
          final p = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 6),
          );
          if (p.accuracy <= 160.0) {
            _processLocation(p, onLocationUpdate);
          }
        } catch (_) {}
      });

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
        notificationText: "Recording active trip route...",
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
    // Outdoor mobile accuracy in pocket/pouch or rural highway is typically up to 160m.
    // Discard only cell-tower triangulation spikes (> 160m).
    final maxAllowedAccuracy = isInitial ? 160.0 : 160.0;
    if (pos.accuracy > maxAllowedAccuracy) return;

    final posTime = pos.timestamp;

    // 2. Teleportation sanity check:
    if (_lastSavedPos != null && !isInitial) {
      final distFromLast = Geolocator.distanceBetween(
        _lastSavedPos!.latitude,
        _lastSavedPos!.longitude,
        pos.latitude,
        pos.longitude,
      );

      final elapsedSec = posTime.difference(_lastSavedTime ?? posTime).inSeconds.abs();

      // If Doppler hardware speed indicates realistic road speed (<= 45 m/s or 162 km/h), accept
      final bool hardwareSpeedValid = (pos.speed > 0 && pos.speed <= 45.0);

      // Only reject if elapsedSec is positive and calculated speed exceeds 45 m/s (162 km/h) without hardware confirmation
      if (!hardwareSpeedValid && elapsedSec > 0 && distFromLast > 150.0 && (distFromLast / elapsedSec) > 45.0) {
        debugPrint("LocationService: rejected teleportation spike: $distFromLast m in $elapsedSec s");
        // Reset reference if stale (> 5 minutes) so tracking does not lock out permanently
        if (elapsedSec > 300) {
          _lastSavedPos = pos;
          _lastSavedTime = posTime;
        }
        return;
      }
    }

    _lastSavedPos = pos;
    _lastSavedTime = posTime;

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

    final mode = (pos.speed * 3.6 > 18) ? 'transit' : 'survey';

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
    _keepAliveTimer?.cancel();
    _keepAliveTimer = null;
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
      if (pos.accuracy <= 160.0) return pos;
    } catch (_) {}

    try {
      final lastKnown = await Geolocator.getLastKnownPosition();
      if (lastKnown != null) {
        final ageInSec = DateTime.now().difference(lastKnown.timestamp).inSeconds.abs();
        if (ageInSec < 120 && lastKnown.accuracy <= 120.0) {
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
