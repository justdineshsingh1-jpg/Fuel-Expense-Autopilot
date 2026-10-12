import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
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
  
  Future<bool> addExpense(String type, double amount, String remarks, String imageUrl) async {
    if (type.toLowerCase().contains('fuel') || type.toLowerCase().contains('petrol')) {
      _fuelAmount += amount;
      _fuelBillUrl = imageUrl;
    } else {
      _miscAmount += amount;
      _miscRemarks += '$type: $remarks ($amount) | ';
      _miscBillUrl = imageUrl;
    }
    notifyListeners();
    
    // Instantly sync to backend so it's not lost on app crash and shows in Admin Portal
    if (_isTripActive && _activeTripId != null) {
      try {
        final payload = {
          'trip_id': _activeTripId,
          'user_id': _authProvider?.user?.id ?? '',
          'approval_status': 'active', // Indicates active trip
          'fuel_amount': _fuelAmount,
          'fuel_bill_url': _fuelBillUrl,
          'misc_amount': _miscAmount,
          'misc_bill_url': _miscBillUrl,
          'misc_particulars': _miscRemarks,
        };
        await _tripService.saveTrip(payload);
        // Refresh local trips list so it appears in the UI immediately
        await loadTrips();
        return true;
      } catch (e) {
        print("addExpense sync error: $e");
        return false;
      }
    }
    return true;
  }

  void updateAuth(AuthProvider auth) {
    _authProvider = auth;
    if (auth.isAuthenticated) {
      loadTrips();
    } else {
      _trips = [];
      _isTripActive = false;
      _activeTripId = null;
    }
  }

  Future<void> loadTrips() async {
    _isLoading = true;
    notifyListeners();
    try {
      _trips = await _tripService.getTrips();
      
      // RESTORE ACTIVE TRIP STATE ON APP RESTART OR RELOAD
      try {
        final activeTrip = _trips.firstWhere((t) => t.status.toLowerCase() == 'active');
        _isTripActive = true;
        _activeTripId = activeTrip.id;
        _startReading = activeTrip.startReading.toString();
        _startOdometerImageUrl = activeTrip.startOdometerImageUrl;
        
        // Restore expenses if they exist on the server
        if (activeTrip.fuelBill != null && activeTrip.fuelBill!.amount > 0) {
          _fuelAmount = activeTrip.fuelBill!.amount;
          _fuelBillUrl = activeTrip.fuelBill!.imageUrl;
        }
        if (activeTrip.miscAmount > 0) {
          _miscAmount = activeTrip.miscAmount;
          _miscBillUrl = activeTrip.miscBillUrl;
          _miscRemarks = activeTrip.miscRemarks;
        }
        
        // Resume background GPS tracking if not already tracking
        _locationService.startBackgroundTracking((Position pos, String mode, String? address) {
          if (_currentWaypoints.isNotEmpty) {
            final last = _currentWaypoints.last;
            final dist = Geolocator.distanceBetween(last['lat'], last['lng'], pos.latitude, pos.longitude);
            _liveDistance += (dist / 1000.0);
          }
          if (address != null) {
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
          notifyListeners();
        });
      } catch (e) {
        // No active trip found in list
        _isTripActive = false;
        _activeTripId = null;
      }

    } catch (e) {
      print("loadTrips error: $e");
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

      final payload = {
        'user_id': _authProvider?.user?.id ?? '',
        'approval_status': 'active',
        'start_reading': startReading,
        'start_odometer_image_url': imageUrl,
        'start_capture_timestamp': DateTime.now().toIso8601String(),
      };
      
      final activeTrip = await _tripService.saveTrip(payload);
      _activeTripId = activeTrip.id;
      _isTripActive = true;
      
      // Update local trips list with new active trip
      _trips.insert(0, activeTrip);
      
      // Start Background GPS Engine
      await _locationService.startBackgroundTracking((Position pos, String mode, String? address) {
        if (_currentWaypoints.isNotEmpty) {
          final last = _currentWaypoints.last;
          final dist = Geolocator.distanceBetween(last['lat'], last['lng'], pos.latitude, pos.longitude);
          _liveDistance += (dist / 1000.0);
        }
        if (address != null) {
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
        notifyListeners();
      });

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      print("startTrip error: $e");
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
        'approval_status': 'pending', // Marks for checkout routing on backend
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
      
      _isTripActive = false;
      _trips.removeWhere((t) => t.id == _activeTripId || (t.id != null && t.id == completedTrip.id));
      _trips.insert(0, completedTrip); // Add completed trip to top of local state
      
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

      // Refresh from server to ensure complete sync
      loadTrips();
      return true;
    } catch (e) {
      print("endTrip error: $e");
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}
