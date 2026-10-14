import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/trip_log.dart';
import '../models/fuel_bill.dart';
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
  String? get activeTripId => _activeTripId;
  String get startReading => _startReading;
  String get startOdometerImageUrl => _startOdometerImageUrl;
  double get liveDistance => _liveDistance;
  String get currentAddress => _currentAddress;
  int get currentWaypointsCount => _currentWaypoints.length;
  double get fuelAmount => _fuelAmount;
  double get miscAmount => _miscAmount;
  String? get fuelBillUrl => _fuelBillUrl;
  String? get miscBillUrl => _miscBillUrl;
  String get miscRemarks => _miscRemarks;
  
  // ----------------------------------------------------
  // LOCAL ACTIVE TRIP PERSISTENCE (Crash & Restart Proof)
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

  Future<void> init(AuthProvider auth) async {
    _authProvider = auth;
    await _restoreActiveTripLocally();
    if (auth.isAuthenticated) {
      loadTrips();
    }
  }

  Future<bool> _restoreActiveTripLocally() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_activeTripPrefsKey);
      if (str == null || str.isEmpty) return false;

      final data = jsonDecode(str);
      if (data['isTripActive'] == true) {
        _isTripActive = true;
        _activeTripId = data['activeTripId'];
        _startReading = data['startReading']?.toString() ?? '0';
        _startOdometerImageUrl = data['startOdometerImageUrl']?.toString() ?? '';
        _liveDistance = (data['liveDistance'] as num?)?.toDouble() ?? 0.0;
        _currentAddress = data['currentAddress']?.toString() ?? 'Locating...';
        _fuelAmount = (data['fuelAmount'] as num?)?.toDouble() ?? 0.0;
        _fuelBillUrl = data['fuelBillUrl']?.toString();
        _miscAmount = (data['miscAmount'] as num?)?.toDouble() ?? 0.0;
        _miscBillUrl = data['miscBillUrl']?.toString();
        _miscRemarks = data['miscRemarks']?.toString() ?? '';
        
        if (data['waypoints'] != null && data['waypoints'] is List) {
          _currentWaypoints = List<Map<String, dynamic>>.from(
            (data['waypoints'] as List).map((w) => Map<String, dynamic>.from(w))
          );
        }

        // Resume GPS Tracking seamlessly
        _startGpsTracker();
        _ensureActiveTripInList();
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

      _ensureActiveTripInList();
      _saveActiveTripLocally();
      notifyListeners();
    });
  }

  void _ensureActiveTripInList() {
    if (!_isTripActive) return;
    final currentUserId = _authProvider?.user?.id ?? '';
    final startR = double.tryParse(_startReading) ?? 0.0;

    final activeItem = TripLog(
      id: _activeTripId ?? 'active_local',
      employeeId: currentUserId,
      date: DateTime.now(),
      startReading: startR,
      startOdometerImageUrl: _startOdometerImageUrl,
      endReading: startR,
      endOdometerImageUrl: '',
      distanceKm: _liveDistance,
      locations: [],
      fuelBill: (_fuelAmount > 0 || (_fuelBillUrl != null && _fuelBillUrl!.isNotEmpty))
          ? FuelBill(
              amount: _fuelAmount,
              imageUrl: _fuelBillUrl ?? '',
              fuelType: 'Petrol',
              remarks: '',
            )
          : null,
      miscAmount: _miscAmount,
      miscBillUrl: _miscBillUrl,
      miscRemarks: _miscRemarks,
      status: 'Active',
      flags: [],
    );

    final idx = _trips.indexWhere((t) => t.status.toLowerCase() == 'active' || (t.id != null && t.id == _activeTripId));
    if (idx >= 0) {
      _trips[idx] = activeItem;
    } else {
      _trips.insert(0, activeItem);
    }
  }

  Future<bool> addExpense(String type, double amount, String remarks, String imageUrl) async {
    try {
      if (type.toLowerCase().contains('fuel') || type.toLowerCase().contains('petrol')) {
        _fuelAmount += amount;
        _fuelBillUrl = imageUrl;
      } else {
        _miscAmount += amount;
        _miscRemarks += '$type: $remarks ($amount) | ';
        _miscBillUrl = imageUrl;
      }
      
      // Update local trips history list immediately so the user sees it in History
      _ensureActiveTripInList();

      // Save locally IMMEDIATELY so app closure or kill never loses the expense
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
          final updated = await _tripService.saveTrip(payload);
          // If backend converted to remote URL, retain it
          if (updated.fuelBill?.imageUrl != null && updated.fuelBill!.imageUrl.startsWith('http')) {
            _fuelBillUrl = updated.fuelBill!.imageUrl;
          }
          if (updated.miscBillUrl != null && updated.miscBillUrl!.startsWith('http')) {
            _miscBillUrl = updated.miscBillUrl;
          }
          _ensureActiveTripInList();
          await _saveActiveTripLocally();
          notifyListeners();
        } catch (e) {
          debugPrint("addExpense backend sync deferred: $e");
        }
      }
      return true;
    } catch (e) {
      debugPrint("addExpense error: $e");
      return false;
    }
  }

  void updateAuth(AuthProvider auth) {
    _authProvider = auth;
    if (auth.isAuthenticated) {
      _restoreActiveTripLocally().then((_) {
        loadTrips();
      });
    }
  }

  Future<void> loadTrips() async {
    _isLoading = true;
    notifyListeners();
    try {
      final currentUserId = _authProvider?.user?.id;
      final serverTrips = await _tripService.getTrips(userId: currentUserId);
      if (serverTrips.isNotEmpty) {
        _trips = serverTrips;
      }
      
      // Look for any active trip on server
      TripLog? serverActiveTrip;
      for (final t in _trips) {
        if (t.status.toLowerCase() == 'active') {
          serverActiveTrip = t;
          break;
        }
      }

      if (serverActiveTrip != null) {
        _isTripActive = true;
        if (serverActiveTrip.id != null && !serverActiveTrip.id!.startsWith('offline_')) {
          _activeTripId = serverActiveTrip.id;
        }
        if (_startReading == '0' || _startReading.isEmpty) {
          _startReading = serverActiveTrip.startReading.toString();
        }
        if (_startOdometerImageUrl.isEmpty) {
          _startOdometerImageUrl = serverActiveTrip.startOdometerImageUrl;
        }
        if (serverActiveTrip.fuelBill != null && serverActiveTrip.fuelBill!.amount > 0) {
          if (_fuelAmount == 0.0 || _fuelBillUrl == null) {
            _fuelAmount = serverActiveTrip.fuelBill!.amount;
            _fuelBillUrl = serverActiveTrip.fuelBill!.imageUrl;
          }
        }
        if (serverActiveTrip.miscAmount > 0) {
          if (_miscAmount == 0.0 || _miscBillUrl == null) {
            _miscAmount = serverActiveTrip.miscAmount;
            _miscBillUrl = serverActiveTrip.miscBillUrl;
            _miscRemarks = serverActiveTrip.miscRemarks;
          }
        }
        _startGpsTracker();
        await _saveActiveTripLocally();
      }

      // If active trip is in progress locally, guarantee it is at top of _trips
      _ensureActiveTripInList();

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

      // Local active trip ID
      _activeTripId = 'trip_${DateTime.now().millisecondsSinceEpoch}';

      // Save locally FIRST before network
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
      
      _ensureActiveTripInList();

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint("startTrip error: $e");
      _ensureActiveTripInList();
      _isLoading = false;
      notifyListeners();
      return true; // Still true locally so the user can continue their shift!
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

      _trips.removeWhere((t) => t.id == _activeTripId || (t.id != null && t.id == completedTrip.id) || t.status.toLowerCase() == 'active');
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
      _isTripActive = false;
      await _saveActiveTripLocally();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
