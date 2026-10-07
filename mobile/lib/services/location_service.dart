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

    // Start with Survey configuration (highest granularity)
    _startStream(10, onLocationUpdate);
  }

  void _startStream(int distanceFilter, Function(Position, String, String?) onLocationUpdate) {
    _positionStream?.cancel();
    
    LocationSettings locationSettings = AndroidSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: distanceFilter, // Dynamically changes between 10m and 100m
      forceLocationManager: true,
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

  void _processLocation(Position pos, Function(Position, String, String?) onLocationUpdate) {
    // 1. Strict Hardware Filter (accuracy <= 20m)
    if (pos.accuracy > 20.0) return;

    double speedKmh = pos.speed * 3.6; // m/s to km/h
    DateTime now = DateTime.now();

    // 2. Stationary Dwell Freeze (Speed < 2 km/h)
    if (speedKmh < 2.0) {
      _stationaryStartTime ??= now;
      if (now.difference(_stationaryStartTime!).inMinutes >= 3) {
        return; // Drop ghost drift points while stopped
      }
    } else {
      _stationaryStartTime = null; // Reset stationary timer
    }

    // 3. Adaptive Mode Shifting with 45s Debounce
    String targetMode = _currentMode;
    if (speedKmh > 20.0) {
      targetMode = 'transit';
    } else if (speedKmh <= 15.0) {
      targetMode = 'survey';
    }

    if (targetMode != _currentMode) {
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

    // 4. Reverse Geocode Address Check (Trigger every 5 kilometers)
    double distanceSinceLastGeocode = 99999;
    if (_lastGeocodedPos != null) {
      distanceSinceLastGeocode = Geolocator.distanceBetween(
        _lastGeocodedPos!.latitude, 
        _lastGeocodedPos!.longitude, 
        pos.latitude, 
        pos.longitude
      );
    }

    if (distanceSinceLastGeocode >= 5000) { // 5 KM
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
    _lastGeocodedPos = null;
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
