import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'dart:async';

class LocationService {
  StreamSubscription<Position>? _positionStream;
  
  // Adaptive Tracker State
  String _currentMode = 'survey'; // 'transit' or 'survey'
  DateTime? _modeDebounceStart;
  DateTime? _stationaryStartTime;
  Position? _lastSavedPos;
  DateTime? _lastSavedTime;
  Position? _lastGeocodedPos;

  Future<void> startBackgroundTracking(Function(Position, String, String?) onLocationUpdate) async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) throw Exception('Location services disabled.');

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) throw Exception('Location permissions denied');
    }
    if (permission == LocationPermission.deniedForever) throw Exception('Permissions permanently denied.');

    // Reset geocode tracker on new shift
    _lastGeocodedPos = null;
    _lastSavedPos = null;
    _lastSavedTime = null;

    // Immediately get and emit initial position so waypoint 0 is never missing
    try {
      final initialPos = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 8),
      );
      _processLocation(initialPos, onLocationUpdate, isInitial: true);
    } catch (_) {
      try {
        final lastKnown = await Geolocator.getLastKnownPosition();
        if (lastKnown != null) {
          _processLocation(lastKnown, onLocationUpdate, isInitial: true);
        }
      } catch (_) {}
    }

    // Start with Survey configuration (highest granularity)
    _startStream(10, onLocationUpdate);
  }

  void _startStream(int distanceFilter, Function(Position, String, String?) onLocationUpdate) {
    _positionStream?.cancel();
    
    LocationSettings locationSettings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: distanceFilter, // Dynamically changes between 10m and 100m
      intervalDuration: const Duration(seconds: 15),
      forceLocationManager: false, // Use FusedLocationProvider for reliable background GPS
      foregroundNotificationConfig: const ForegroundNotificationConfig(
        notificationText: "Tracking your trip route in the background.",
        notificationTitle: "Fuel Expense Autopilot Active",
        enableWakeLock: true,
      ),
    );

    _positionStream = Geolocator.getPositionStream(locationSettings: locationSettings)
        .listen((Position position) {
      _processLocation(position, onLocationUpdate);
    });
  }

  void _processLocation(Position pos, Function(Position, String, String?) onLocationUpdate, {bool isInitial = false}) {
    // 1. Hardware Accuracy Filter:
    // For initial point or when no points recorded yet, accept up to 100m to never miss start coordinate.
    // For ongoing points, accept up to 65m (outdoor realistic field conditions).
    final maxAllowedAccuracy = (_lastSavedPos == null || isInitial) ? 100.0 : 65.0;
    if (pos.accuracy > maxAllowedAccuracy) return;

    double speedKmh = pos.speed * 3.6; // m/s to km/h
    DateTime now = DateTime.now();

    // 2. Dwell / Stationary check:
    // If stationary for > 3 minutes, only record a heartbeat point every 5 minutes to avoid ghost drift
    if (_lastSavedPos != null && !isInitial) {
      final distFromLast = Geolocator.distanceBetween(
        _lastSavedPos!.latitude,
        _lastSavedPos!.longitude,
        pos.latitude,
        pos.longitude,
      );

      if (speedKmh < 2.0 && distFromLast < 10.0) {
        _stationaryStartTime ??= now;
        final minsStationary = now.difference(_stationaryStartTime!).inMinutes;
        // If stationary > 3 mins, only record a heartbeat every 5 minutes
        if (minsStationary >= 3) {
          if (_lastSavedTime != null && now.difference(_lastSavedTime!).inMinutes < 5) {
            return; // Drop drift jitter while stopped at a site
          }
        }
      } else {
        _stationaryStartTime = null; // Moving again
      }
    }

    // 3. Adaptive Mode Shifting with 45s Debounce
    String targetMode = _currentMode;
    if (speedKmh > 20.0) {
      targetMode = 'transit';
    } else if (speedKmh <= 15.0) {
      targetMode = 'survey';
    }

    if (targetMode != _currentMode && !isInitial) {
      _modeDebounceStart ??= now;
      if (now.difference(_modeDebounceStart!).inSeconds >= 45) {
        // Shift confirmed after 45 seconds of sustained speed
        _currentMode = targetMode;
        _modeDebounceStart = null;
        
        // Restart stream with new physical distance filter to save battery
        _startStream(_currentMode == 'transit' ? 100 : 10, onLocationUpdate);
        return; // Restarting stream will capture the point naturally
      }
    } else {
      _modeDebounceStart = null; // Cancel debounce if speed fluctuates back
    }

    _lastSavedPos = pos;
    _lastSavedTime = now;

    // 4. Reverse Geocode Address Check (Trigger on initial point or every 5 kilometers)
    double distanceSinceLastGeocode = 99999;
    if (_lastGeocodedPos != null) {
      distanceSinceLastGeocode = Geolocator.distanceBetween(
        _lastGeocodedPos!.latitude, 
        _lastGeocodedPos!.longitude, 
        pos.latitude, 
        pos.longitude
      );
    }

    if (isInitial || distanceSinceLastGeocode >= 5000) { // 5 KM or initial start
      _lastGeocodedPos = pos;
      getAddressFromLatLng(pos.latitude, pos.longitude).then((address) {
        onLocationUpdate(pos, _currentMode, address);
      }).catchError((_) {
        onLocationUpdate(pos, _currentMode, null);
      });
    } else {
      onLocationUpdate(pos, _currentMode, null);
    }
  }

  void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
    _stationaryStartTime = null;
    _modeDebounceStart = null;
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
