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
      // Mocking login for the sake of completeness if backend isn't ready
      if (employeeCode == 'EMP001' && password == 'password') {
        final user = User(
          id: '1',
          employeeCode: 'EMP001',
          fullName: 'John Doe',
          email: 'john.doe@company.com',
          role: 'Field Executive',
          department: 'Sales',
        );
        await _storage.write(key: 'jwt_token', value: 'mock_token_123');
        await _storage.write(key: 'user_data', value: jsonEncode(user.toJson()));
        return user;
      }
      
      // Actual implementation
      /*
      final response = await _apiService.client.post(
        ApiConfig.login,
        data: {'employeeCode': employeeCode, 'password': password},
      );
      final data = response.data;
      await _storage.write(key: 'jwt_token', value: data['token']);
      final user = User.fromJson(data['user']);
      await _storage.write(key: 'user_data', value: jsonEncode(user.toJson()));
      return user;
      */
      throw Exception('Invalid credentials');
    } catch (e) {
      throw Exception('Failed to login: $e');
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
