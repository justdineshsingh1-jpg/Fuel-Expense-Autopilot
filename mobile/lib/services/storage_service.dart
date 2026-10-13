import 'dart:io';
import 'package:dio/dio.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class StorageService {
  final ApiService _apiService = ApiService();

  Future<String> uploadImage(File imageFile) async {
    try {
      String fileName = imageFile.path.split(Platform.pathSeparator).last;
      FormData formData = FormData.fromMap({
        "file": await MultipartFile.fromFile(imageFile.path, filename: fileName),
      });

      final response = await _apiService.client.post(
        ApiConfig.upload,
        data: formData,
      );

      if (response.statusCode == 200 && response.data != null && response.data['url'] != null) {
        return response.data['url'];
      }
      throw Exception('Failed to upload image: Invalid response');
    } catch (e) {
      throw Exception('Upload failed: $e');
    }
  }
}
