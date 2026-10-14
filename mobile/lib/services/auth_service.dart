import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/user.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  static const String _userPrefsKey = 'persisted_user_data_backup';
  static const String _tokenPrefsKey = 'jwt_token_backup';

  Future<User> login(String employeeCode, String password) async {
    try {
      final response = await _apiService.client.post(
        ApiConfig.login,
        data: {'username': employeeCode, 'password': password},
      );
      
      final data = response.data;
      if (data['access_token'] == null || data['user'] == null) {
        throw Exception('Invalid response from server');
      }

      final token = data['access_token'].toString();
      try {
        await _storage.write(key: 'jwt_token', value: token);
      } catch (e) {
        debugPrint("Secure storage token write error: $e");
      }
      
      final u = data['user'];
      final user = User(
        id: u['id'] ?? '',
        employeeCode: u['employee_code'] ?? employeeCode,
        fullName: u['full_name'] ?? '',
        email: u['email'] ?? '',
        role: u['role'] ?? 'Field Executive',
        department: u['department'] ?? '',
      );
      
      final userJson = jsonEncode(user.toJson());
      try {
        await _storage.write(key: 'user_data', value: userJson);
      } catch (e) {
        debugPrint("Secure storage user write error: $e");
      }

      // Also persist to SharedPreferences as high-reliability backup against Keystore issues
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_tokenPrefsKey, token);
        await prefs.setString(_userPrefsKey, userJson);
      } catch (e) {
        debugPrint("Prefs backup write error: $e");
      }

      return user;
    } catch (e) {
      debugPrint('Login Error: $e');
      throw Exception('Failed to login. Please check your credentials.');
    }
  }

  Future<void> logout() async {
    try {
      await _storage.delete(key: 'jwt_token');
      await _storage.delete(key: 'user_data');
    } catch (_) {}

    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_tokenPrefsKey);
      await prefs.remove(_userPrefsKey);
    } catch (_) {}
  }

  Future<User?> getStoredUser() async {
    // 1. Try secure storage first
    try {
      final userData = await _storage.read(key: 'user_data');
      if (userData != null && userData.isNotEmpty) {
        return User.fromJson(jsonDecode(userData));
      }
    } catch (e) {
      debugPrint("Secure storage read error (falling back to prefs): $e");
    }

    // 2. Fall back to reliable SharedPreferences backup
    try {
      final prefs = await SharedPreferences.getInstance();
      final backup = prefs.getString(_userPrefsKey);
      if (backup != null && backup.isNotEmpty) {
        return User.fromJson(jsonDecode(backup));
      }
    } catch (e) {
      debugPrint("Prefs user backup read error: $e");
    }

    return null;
  }
}
