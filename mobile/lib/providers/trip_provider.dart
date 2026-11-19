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
  DateTime? _activeTripStartedAt;
  String? _justEndedTripId;

  List<TripLog> get trips => _trips;
  bool get isLoading => _isLoading;
  bool get isTripActive => _isTripActive;
  String? get activeTripId => _activeTripId;
  DateTime? get activeTripStartedAt => _activeTripStartedAt;
  String get startReading => _startReading;
  String get startOdometerImageUrl => _startOdometerImageUrl;
  double get liveDistance => _liveDistance;
  String get currentAddress => _currentAddress;
  int get currentWaypointsCount => _currentWaypoints.length;
  List<Map<String, dynamic>> get currentWaypoints => _currentWaypoints;
  double get fuelAmount => _fuelAmount;
  double get miscAmount => _miscAmount;
  String? get fuelBillUrl => _fuelBillUrl;
  String? get miscBillUrl => _miscBillUrl;
  String get miscRemarks => _miscRemarks;

  // Check if active trip is stale (from yesterday or >16 hours old)
  bool get isActiveTripStale {
    if (!_isTripActive || _activeTripStartedAt == null) return false;
    final now = DateTime.now();
    final isToday = _activeTripStartedAt!.year == now.year &&
        _activeTripStartedAt!.month == now.month &&
        _activeTripStartedAt!.day == now.day;
    return !isToday || now.difference(_activeTripStartedAt!).inHours >= 16;
  }
  
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
        'startedAt': _activeTripStartedAt?.toIso8601String() ?? DateTime.now().toIso8601String(),
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
        DateTime? started;
        if (data['startedAt'] != null) {
          started = DateTime.tryParse(data['startedAt'].toString());
        }

        // Check if stored trip is stale (from prior calendar date or >16 hours old)
        if (started != null) {
          final now = DateTime.now();
          final isSameDay = started.year == now.year &&
              started.month == now.month &&
              started.day == now.day;
          if (!isSameDay || now.difference(started).inHours >= 16) {
            debugPrint("Discarding stale active trip from local prefs (${started.toIso8601String()})");
            await prefs.remove(_activeTripPrefsKey);
            _isTripActive = false;
            return false;
          }
        }

        _isTripActive = true;
        _activeTripStartedAt = started ?? DateTime.now();
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
      if (address != null && address.isNotEmpty) {
        _currentAddress = address;
      }

      // If this is the very first waypoint
      if (_currentWaypoints.isEmpty) {
        _currentWaypoints.add({
          'lat': pos.latitude,
          'lng': pos.longitude,
          'mode': mode,
          if (address != null) 'address': address,
          'timestamp': DateTime.now().toIso8601String(),
          'accuracy': pos.accuracy,
          'speed': pos.speed,
        });
        _liveDistance = 0.0;
        _ensureActiveTripInList();
        _saveActiveTripLocally();
        notifyListeners();
        return;
      }

      final last = _currentWaypoints.last;
      final lastLat = (last['lat'] as num).toDouble();
      final lastLng = (last['lng'] as num).toDouble();

      final distMeters = Geolocator.distanceBetween(
        lastLat,
        lastLng,
        pos.latitude,
        pos.longitude,
      );

      // Parse time delta
      DateTime lastTime = DateTime.tryParse(last['timestamp']?.toString() ?? '') ?? DateTime.now();
      final deltaSec = DateTime.now().difference(lastTime).inSeconds.abs();

      // 1. REJECT TELEPORTATION / CELL TOWER SPIKES:
      // If implied speed > 120 km/h (33.3 m/s), reject as cellular tower switch or GPS glitch
      if (deltaSec > 0 && (distMeters / deltaSec) > 33.3) {
        debugPrint("Rejected teleportation spike: $distMeters m in $deltaSec s");
        return;
      }

      // 2. REJECT INDOOR / STATIONARY OFFICE DRIFT:
      // Walking in office or sitting down produces drift. Require real travel:
      // either dist >= 15m AND speed >= 0.8 m/s (~2.8 km/h), OR dist >= 35m (vehicle moving forward).
      final isRealMovement = (distMeters >= 15.0 && pos.speed >= 0.8) || distMeters >= 35.0;

      // 3. HARDWARE ACCURACY FILTER:
      // Accumulate distance ONLY if accuracy is good (<= 45m).
      if (isRealMovement && pos.accuracy <= 45.0) {
        _liveDistance += (distMeters / 1000.0);
        _currentWaypoints.add({
          'lat': pos.latitude,
          'lng': pos.longitude,
          'mode': mode,
          if (address != null) 'address': address,
          'timestamp': DateTime.now().toIso8601String(),
          'accuracy': pos.accuracy,
          'speed': pos.speed,
        });
      } else if (_currentWaypoints.length == 1 && distMeters < 15.0) {
        // Just sitting at start point: update address/accuracy without adding distance
        _currentWaypoints[0]['accuracy'] = pos.accuracy;
        _currentWaypoints[0]['lat'] = pos.latitude;
        _currentWaypoints[0]['lng'] = pos.longitude;
      }

      _ensureActiveTripInList();
      _saveActiveTripLocally();
      notifyListeners();

      // Periodically sync waypoints to server every 15 waypoints so server always has live track
      if (_isTripActive && _activeTripId != null && _currentWaypoints.length % 15 == 0) {
        _syncActiveWaypointsToServer();
      }
    });
  }

  Future<void> _syncActiveWaypointsToServer() async {
    if (!_isTripActive || _activeTripId == null || _activeTripId!.startsWith('offline_')) return;
    try {
      await _tripService.saveTrip({
        'trip_id': _activeTripId,
        'user_id': _authProvider?.user?.id ?? '',
        'approval_status': 'active',
        'distance_km': _liveDistance,
        'waypoints': _currentWaypoints,
      });
    } catch (_) {}
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

  bool _isTripStale(TripLog trip) {
    final now = DateTime.now();
    final tripDate = trip.date;
    final isToday = tripDate.year == now.year &&
        tripDate.month == now.month &&
        tripDate.day == now.day;
    return !isToday || now.difference(tripDate).inHours >= 16;
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
          // If this trip was just ended by user locally, do NOT re-activate it
          if (_justEndedTripId != null && (t.id == _justEndedTripId || t.id == null)) {
            continue;
          }
          // If this trip is from yesterday or >16 hours old, it is STALE
          if (_isTripStale(t)) {
            debugPrint("Auto-retiring stale server active trip: ${t.id} from ${t.date}");
            // Close it on server so it doesn't linger forever
            if (t.id != null && !t.id!.startsWith('offline_')) {
              try {
                _tripService.saveTrip({
                  'trip_id': t.id,
                  'user_id': currentUserId ?? '',
                  'approval_status': 'abandoned',
                });
              } catch (_) {}
            }
            continue;
          }
          serverActiveTrip = t;
          break;
        }
      }

      if (serverActiveTrip != null && !_isTripActive) {
        _isTripActive = true;
        _activeTripStartedAt = serverActiveTrip.date;
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

  Future<void> abandonActiveOrStaleTrip() async {
    _isLoading = true;
    notifyListeners();
    try {
      final tripIdToAbandon = _activeTripId;
      _locationService.stopTracking();
      _isTripActive = false;
      _activeTripId = null;
      _activeTripStartedAt = null;
      _currentWaypoints = [];
      _liveDistance = 0.0;
      _currentAddress = 'Locating...';
      _startReading = '0';
      _startOdometerImageUrl = '';
      _fuelAmount = 0.0;
      _miscAmount = 0.0;
      _miscRemarks = '';
      _fuelBillUrl = null;
      _miscBillUrl = null;
      
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_activeTripPrefsKey);

      if (tripIdToAbandon != null && !tripIdToAbandon.startsWith('offline_')) {
        try {
          await _tripService.saveTrip({
            'trip_id': tripIdToAbandon,
            'user_id': _authProvider?.user?.id ?? '',
            'approval_status': 'abandoned',
          });
        } catch (_) {}
      }
      
      _trips.removeWhere((t) => t.status.toLowerCase() == 'active' || t.id == tripIdToAbandon);
    } catch (e) {
      debugPrint("Error abandoning trip: $e");
    } finally {
      _isLoading = false;
      notifyListeners();
      loadTrips();
    }
  }

  Future<bool> startTrip(String startReading, String imageUrl) async {
    _isLoading = true;
    notifyListeners();
    try {
      _justEndedTripId = null;
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
      _activeTripStartedAt = DateTime.now();

      // Local active trip ID
      _activeTripId = 'trip_${DateTime.now().millisecondsSinceEpoch}';

      // Immediately capture start GPS coordinates
      Position? startPos = await _locationService.getCurrentPositionSafe();
      if (startPos != null) {
        _currentWaypoints.add({
          'lat': startPos.latitude,
          'lng': startPos.longitude,
          'mode': 'start',
          'timestamp': DateTime.now().toIso8601String(),
          'accuracy': startPos.accuracy,
          'speed': startPos.speed,
        });
      }

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
        if (startPos != null) 'start_lat': startPos.latitude,
        if (startPos != null) 'start_lng': startPos.longitude,
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
      // Capture end GPS coordinate before stopping tracking
      Position? endPos = await _locationService.getCurrentPositionSafe();
      if (endPos != null) {
        _currentWaypoints.add({
          'lat': endPos.latitude,
          'lng': endPos.longitude,
          'mode': 'end',
          'timestamp': DateTime.now().toIso8601String(),
          'accuracy': endPos.accuracy,
          'speed': endPos.speed,
        });
      }
      _locationService.stopTracking();

      _justEndedTripId = _activeTripId;

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
        if (endPos != null) 'end_lat': endPos.latitude,
        if (endPos != null) 'end_lng': endPos.longitude,
        if (_currentWaypoints.isNotEmpty) 'start_lat': _currentWaypoints.first['lat'],
        if (_currentWaypoints.isNotEmpty) 'start_lng': _currentWaypoints.first['lng'],
        'fuel_amount': _fuelAmount,
        'fuel_bill_url': _fuelBillUrl,
        'misc_amount': _miscAmount,
        'misc_bill_url': _miscBillUrl,
        'misc_particulars': _miscRemarks.isEmpty ? 'Ended via app' : _miscRemarks,
      };

      // Mark trip inactive locally FIRST to guarantee UI never resurrects it
      _isTripActive = false;
      _activeTripStartedAt = null;
      await _saveActiveTripLocally();

      final completedTrip = await _tripService.saveTrip(payload);
      
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
      _activeTripStartedAt = null;
      await _saveActiveTripLocally();
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
