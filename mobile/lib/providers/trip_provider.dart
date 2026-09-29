import 'package:flutter/material.dart';
import '../models/trip_log.dart';
import '../services/trip_service.dart';
import 'auth_provider.dart';

class TripProvider with ChangeNotifier {
  final TripService _tripService = TripService();
  AuthProvider? _authProvider;
  
  List<TripLog> _trips = [];
  bool _isLoading = false;

  List<TripLog> get trips => _trips;
  bool get isLoading => _isLoading;

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
      // Handle error
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> saveTrip(TripLog trip) async {
    _isLoading = true;
    notifyListeners();
    try {
      final savedTrip = await _tripService.saveTrip(trip);
      _trips.add(savedTrip);
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
