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
  double _fuelAmount = 0.0;
  double _miscAmount = 0.0;
  String _miscRemarks = '';
  String? _fuelBillUrl;
  String? _miscBillUrl;

  List<TripLog> get trips => _trips;
  bool get isLoading => _isLoading;
  bool get isTripActive => _isTripActive;
  String get startReading => _startReading;
  int get currentWaypointsCount => _currentWaypoints.length;
  
  void addExpense(String type, double amount, String remarks, String imageUrl) {
    if (type.toLowerCase().contains('fuel') || type.toLowerCase().contains('petrol')) {
      _fuelAmount += amount;
      _fuelBillUrl = imageUrl;
    } else {
      _miscAmount += amount;
      _miscRemarks += '$type: $remarks ($amount) | ';
      _miscBillUrl = imageUrl;
    }
    notifyListeners();
  }

  void updateAuth(AuthProvider auth) {
    _authProvider = auth;
    if (auth.isAuthenticated) {
      loadTrips();
    } else {
      _trips = [];
    }
  }

  Future<void> loadTrips() async {
    _isLoading = true;
    notifyListeners();
    try {
      _trips = await _tripService.getTrips();
    } catch (e) {
      print(e);
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
      _currentWaypoints = [];
      
      // Start Background GPS Engine
      await _locationService.startBackgroundTracking((Position pos, String mode, String? address) {
        _currentWaypoints.add({
          'lat': pos.latitude,
          'lng': pos.longitude,
          'mode': mode,
            if (address != null) 'address': address,
          'timestamp': DateTime.now().toIso8601String(),
          'accuracy': pos.accuracy,
          'speed': pos.speed,
        });
        notifyListeners(); // Update UI with new points
      });

      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
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
      _isTripActive = false;

      final payload = {
        'user_id': _authProvider?.user?.id ?? '',
        'approval_status': 'pending', // Marks for checkout routing on backend
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
      _trips.insert(0, completedTrip); // Add to local state
      
      _currentWaypoints = [];
      _fuelAmount = 0.0;
      _miscAmount = 0.0;
      _miscRemarks = '';
      _fuelBillUrl = null;
      _miscBillUrl = null;
      _activeTripId = null;
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }
}

