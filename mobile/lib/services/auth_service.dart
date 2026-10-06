import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../models/user.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class AuthService {
  final ApiService _apiService = ApiService();
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  Future<User> login(String employeeCode, String password) async {
    try {
      final response = await _apiService.client.post(
        ApiConfig.login,
        data: {'username': employeeCode, 'password': password}, // Next.js expects username/email
      );
      
      final data = response.data;
      if (data['access_token'] == null || data['user'] == null) {
        throw Exception('Invalid response from server');
      }

      await _storage.write(key: 'jwt_token', value: data['access_token']);
      
      final u = data['user'];
      final user = User(
        id: u['id'] ?? '',
        employeeCode: u['employee_code'] ?? employeeCode,
        fullName: u['full_name'] ?? '',
        email: u['email'] ?? '',
        role: u['role'] ?? 'Field Executive',
        department: u['department'] ?? '',
      );
      
      await _storage.write(key: 'user_data', value: jsonEncode(user.toJson()));
      return user;
    } catch (e) {
      print('Login Error: $e');
      throw Exception('Failed to login. Please check your credentials.');
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
    await _storage.delete(key: 'user_data');
  }

  Future<User?> getStoredUser() async {
    final userData = await _storage.read(key: 'user_data');
    if (userData != null) {
      return User.fromJson(jsonDecode(userData));
    }
    return null;
  }
}
