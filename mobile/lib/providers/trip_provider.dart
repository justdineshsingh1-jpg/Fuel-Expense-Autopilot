import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/trip_log.dart';
import '../services/trip_service.dart';
import '../services/location_service.dart';
import 'auth_provider.dart';

class TripProvider with ChangeNotifier {
  final TripService _tripService = TripService();
  final LocationService _locationService = LocationService();
  AuthProvider? _authProvider;
  
  List<TripLog> _trips = [];
  bool _isLoading = false;

  // Active Trip State
  bool _isTripActive = false;
  List<Map<String, dynamic>> _currentWaypoints = [];
  String? _activeTripId;
  String _startReading = '0';
  String _startOdometerImageUrl = '';
  double _liveDistance = 0.0;
  String _currentAddress = 'Locating...';
  double _fuelAmount = 0.0;
  double _miscAmount = 0.0;
  String _miscRemarks = '';
  String? _fuelBillUrl;
  String? _miscBillUrl;

  // Persistence Key
  static const String _activeTripPrefsKey = 'persisted_active_trip_state';

  List<TripLog> get trips => _trips;
  bool get isLoading => _isLoading;
  bool get isTripActive => _isTripActive;
  String get startReading => _startReading;
  String get startOdometerImageUrl => _startOdometerImageUrl;
  double get liveDistance => _liveDistance;
  String get currentAddress => _currentAddress;
  int get currentWaypointsCount => _currentWaypoints.length;
  double get fuelAmount => _fuelAmount;
  double get miscAmount => _miscAmount;
  String? get fuelBillUrl => _fuelBillUrl;
  String? get miscBillUrl => _miscBillUrl;
  
  // ----------------------------------------------------
  // LOCAL ACTIVE TRIP PERSISTENCE (Crash / Restart Proof)
  // ----------------------------------------------------
  Future<void> _saveActiveTripLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      if (!_isTripActive) {
        await prefs.remove(_activeTripPrefsKey);
        return;
      }
      final data = {
        'isTripActive': _isTripActive,
        'activeTripId': _activeTripId,
        'userId': _authProvider?.user?.id ?? '',
        'startReading': _startReading,
        'startOdometerImageUrl': _startOdometerImageUrl,
        'liveDistance': _liveDistance,
        'currentAddress': _currentAddress,
        'fuelAmount': _fuelAmount,
        'fuelBillUrl': _fuelBillUrl,
        'miscAmount': _miscAmount,
        'miscBillUrl': _miscBillUrl,
        'miscRemarks': _miscRemarks,
        'waypoints': _currentWaypoints,
      };
      await prefs.setString(_activeTripPrefsKey, jsonEncode(data));
    } catch (e) {
      debugPrint("Error saving active trip locally: $e");
    }
  }

  Future<bool> _restoreActiveTripLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_activeTripPrefsKey);
      if (str == null || str.isEmpty) return false;

      final data = jsonDecode(str);
      final currentUserId = _authProvider?.user?.id;
      // Ensure the saved trip belongs to the current user
      if (currentUserId != null && currentUserId.isNotEmpty && data['userId'] != currentUserId) {
        return false;
      }

      if (data['isTripActive'] == true) {
        _isTripActive = true;
        _activeTripId = data['activeTripId'];
        _startReading = data['startReading'] ?? '0';
        _startOdometerImageUrl = data['startOdometerImageUrl'] ?? '';
        _liveDistance = (data['liveDistance'] as num?)?.toDouble() ?? 0.0;
        _currentAddress = data['currentAddress'] ?? 'Locating...';
        _fuelAmount = (data['fuelAmount'] as num?)?.toDouble() ?? 0.0;
        _fuelBillUrl = data['fuelBillUrl'];
        _miscAmount = (data['miscAmount'] as num?)?.toDouble() ?? 0.0;
        _miscBillUrl = data['miscBillUrl'];
        _miscRemarks = data['miscRemarks'] ?? '';
        
        if (data['waypoints'] != null && data['waypoints'] is List) {
          _currentWaypoints = List<Map<String, dynamic>>.from(
            (data['waypoints'] as List).map((w) => Map<String, dynamic>.from(w))
          );
        }

        // Resume GPS Tracking seamlessly
        _startGpsTracker();
        notifyListeners();
        return true;
      }
    } catch (e) {
      debugPrint("Error restoring active trip locally: $e");
    }
    return false;
  }

  void _startGpsTracker() {
    _locationService.startBackgroundTracking((Position pos, String mode, String? address) {
      if (_currentWaypoints.isNotEmpty) {
        final last = _currentWaypoints.last;
        final dist = Geolocator.distanceBetween(
          (last['lat'] as num).toDouble(), 
          (last['lng'] as num).toDouble(), 
          pos.latitude, 
          pos.longitude
        );
        _liveDistance += (dist / 1000.0);
      }
      if (address != null && address.isNotEmpty) {
        _currentAddress = address;
      }
      _currentWaypoints.add({
        'lat': pos.latitude,
        'lng': pos.longitude,
        'mode': mode,
        if (address != null) 'address': address,
        'timestamp': DateTime.now().toIso8601String(),
        'accuracy': pos.accuracy,
        'speed': pos.speed,
      });

      // Save updated distance and waypoints locally
      _saveActiveTripLocally();
      notifyListeners();
    });
  }

  Future<bool> addExpense(String type, double amount, String remarks, String imageUrl) async {
    if (type.toLowerCase().contains('fuel') || type.toLowerCase().contains('petrol')) {
      _fuelAmount += amount;
      _fuelBillUrl = imageUrl;
    } else {
      _miscAmount += amount;
      _miscRemarks += '$type: $remarks ($amount) | ';
      _miscBillUrl = imageUrl;
    }
    
    // Save locally IMMEDIATELY so app closure never loses the expense
    await _saveActiveTripLocally();
    notifyListeners();
    
    // Sync to backend in background
    if (_isTripActive && _activeTripId != null) {
      try {
        final payload = {
          'trip_id': _activeTripId,
          'user_id': _authProvider?.user?.id ?? '',
          'approval_status': 'active',
          'fuel_amount': _fuelAmount,
          'fuel_bill_url': _fuelBillUrl,
          'misc_amount': _miscAmount,
          'misc_bill_url': _miscBillUrl,
          'misc_particulars': _miscRemarks,
        };
        await _tripService.saveTrip(payload);
        return true;
      } catch (e) {
        debugPrint("addExpense backend sync deferred: $e");
        // Still return true because it is safely persisted locally and in offline queue!
        return true;
      }
    }
    return true;
  }

  void updateAuth(AuthProvider auth) {
    _authProvider = auth;
    if (auth.isAuthenticated) {
      // 1. Instantly restore from local storage so UI doesn't reset to "START SHIFT"
      _restoreActiveTripLocally();
      // 2. Fetch server history and verify sync
      loadTrips();
    } else {
      _trips = [];
      _isTripActive = false;
      _activeTripId = null;
      _saveActiveTripLocally();
    }
  }

  Future<void> loadTrips() async {
    _isLoading = true;
    notifyListeners();
    try {
      final currentUserId = _authProvider?.user?.id;
      _trips = await _tripService.getTrips(userId: currentUserId);
      
      // If we don't have an active trip locally, check if server has an active trip
      if (!_isTripActive && _trips.isNotEmpty) {
        try {
          final serverActiveTrip = _trips.firstWhere(
            (t) => t.status.toLowerCase() == 'active' && 
                   (currentUserId == null || currentUserId.isEmpty || t.employeeId == currentUserId),
          );
          _isTripActive = true;
          _activeTripId = serverActiveTrip.id;
          _startReading = serverActiveTrip.startReading.toString();
          _startOdometerImageUrl = serverActiveTrip.startOdometerImageUrl;
          
          if (serverActiveTrip.fuelBill != null && serverActiveTrip.fuelBill!.amount > 0) {
            _fuelAmount = serverActiveTrip.fuelBill!.amount;
            _fuelBillUrl = serverActiveTrip.fuelBill!.imageUrl;
          }
          if (serverActiveTrip.miscAmount > 0) {
            _miscAmount = serverActiveTrip.miscAmount;
            _miscBillUrl = serverActiveTrip.miscBillUrl;
            _miscRemarks = serverActiveTrip.miscRemarks;
          }
          
          _startGpsTracker();
          await _saveActiveTripLocally();
        } catch (_) {
          // No active trip on server
        }
      }

    } catch (e) {
      debugPrint("loadTrips error: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> startTrip(String startReading, String imageUrl) async {
    _isLoading = true;
    notifyListeners();
    try {
      _startReading = startReading;
      _startOdometerImageUrl = imageUrl;
      _fuelAmount = 0.0;
      _miscAmount = 0.0;
      _miscRemarks = '';
      _fuelBillUrl = null;
      _miscBillUrl = null;
      _currentWaypoints = [];
      _liveDistance = 0.0;
      _currentAddress = 'Locating...';
      _isTripActive = true;

      // Temporary local active ID
      _activeTripId = 'trip_${DateTime.now().millisecondsSinceEpoch}';

      // Save locally FIRST
      await _saveActiveTripLocally();
      
      // Start GPS Engine
      _startGpsTracker();

      final payload = {
        'user_id': _authProvider?.user?.id ?? '',
        'approval_status': 'active',
        'start_reading': startReading,
        'start_odometer_image_url': imageUrl,
        'start_capture_timestamp': DateTime.now().toIso8601String(),
      };
      
      final activeTrip = await _tripService.saveTrip(payload);
      if (activeTrip.id != null && !activeTrip.id!.startsWith('offline_')) {
        _activeTripId = activeTrip.id;
        await _saveActiveTripLocally();
      }
      
      // Add to local trips list
      _trips.insert(0, activeTrip);

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint("startTrip error: $e");
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> endTrip(String endReading, String imageUrl, double fallbackFuel, double fallbackMisc, String fallbackRemarks) async {
    _isLoading = true;
    notifyListeners();
    try {
      _locationService.stopTracking();

      final payload = {
        'trip_id': _activeTripId,
        'user_id': _authProvider?.user?.id ?? '',
        'approval_status': 'pending',
        'start_reading': _startReading,
        'start_odometer_image_url': _startOdometerImageUrl,
        'end_reading': endReading,
        'end_odometer_image_url': imageUrl,
        'end_capture_timestamp': DateTime.now().toIso8601String(),
        'waypoints': _currentWaypoints,
        'fuel_amount': _fuelAmount,
        'fuel_bill_url': _fuelBillUrl,
        'misc_amount': _miscAmount,
        'misc_bill_url': _miscBillUrl,
        'misc_particulars': _miscRemarks.isEmpty ? 'Ended via app' : _miscRemarks,
      };

      final completedTrip = await _tripService.saveTrip(payload);
      
      // Mark trip inactive and clear local active storage
      _isTripActive = false;
      await _saveActiveTripLocally();

      _trips.removeWhere((t) => t.id == _activeTripId || (t.id != null && t.id == completedTrip.id));
      _trips.insert(0, completedTrip);
      
      _currentWaypoints = [];
      _liveDistance = 0.0;
      _currentAddress = 'Locating...';
      _fuelAmount = 0.0;
      _miscAmount = 0.0;
      _miscRemarks = '';
      _fuelBillUrl = null;
      _miscBillUrl = null;
      _activeTripId = null;
      _isLoading = false;
      notifyListeners();

      // Refresh from server
      loadTrips();
      return true;
    } catch (e) {
      debugPrint("endTrip error: $e");
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
