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

  Future<void> startBackgroundTracking(Function(Position, String) onLocationUpdate) async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) throw Exception('Location services disabled.');

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) throw Exception('Location permissions denied');
    }
    if (permission == LocationPermission.deniedForever) throw Exception('Permissions permanently denied.');

    // Start with Survey configuration (highest granularity)
    _startStream(10, onLocationUpdate);
  }

  void _startStream(int distanceFilter, Function(Position, String) onLocationUpdate) {
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

  void _processLocation(Position pos, Function(Position, String) onLocationUpdate) {
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

    // Pass validated point to UI/Provider
    _lastSavedPos = pos;
    onLocationUpdate(pos, _currentMode);
  }

  void stopTracking() {
    _positionStream?.cancel();
    _positionStream = null;
    _stationaryStartTime = null;
    _modeDebounceStart = null;
    _lastSavedPos = null;
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
        return '${place.street}, ${place.subLocality}, ${place.locality}, ${place.postalCode}, ${place.country}';
      }
      return 'Address not found';
    } catch (e) {
      return 'Failed to get address';
    }
  }
}
