import 'package:flutter/material.dart';
import '../models/user.dart';
import '../services/auth_service.dart';

class AuthProvider with ChangeNotifier {
  final AuthService _authService = AuthService();
  
  User? _user;
  bool _isLoading = true;

  User? get user => _user;
  bool get isAuthenticated => _user != null;
  bool get isLoading => _isLoading;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();
    
    try {
      _user = await _authService.getStoredUser();
    } catch (e) {
      _user = null;
    }
    
    _isLoading = false;
    notifyListeners();
  }

  Future<bool> login(String employeeCode, String password) async {
    _isLoading = true;
    notifyListeners();
    
    try {
      _user = await _authService.login(employeeCode, password);
      _isLoading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await _authService.logout();
    _user = null;
    notifyListeners();
  }
}
