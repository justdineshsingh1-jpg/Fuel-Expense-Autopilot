import 'package:shared_preferences/shared_preferences.dart';
import 'package:dio/dio.dart';
import 'dart:convert';
import 'dart:io';
import 'api_service.dart';
import '../config/api_config.dart';

class OfflineSyncService {
  static const String _queueKey = 'offline_trips_queue';

  Future<void> enqueuePayload(Map<String, dynamic> payload) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];
    queue.add(jsonEncode(payload));
    await prefs.setStringList(_queueKey, queue);
  }

  Future<int> getPendingCount() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getStringList(_queueKey) ?? []).length;
  }

  Future<bool> syncPendingTrips(ApiService apiService) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList(_queueKey) ?? [];
    
    if (queue.isEmpty) return true;

    List<String> failedQueue = [];
    bool allSuccess = true;

    for (String item in queue) {
      try {
        Map<String, dynamic> payload = jsonDecode(item);
        
        // 1. Upload any local images first
        payload = await uploadLocalImages(payload, apiService);
        
        // 2. Submit the trip
        await apiService.client.post(ApiConfig.trips, data: payload);
      } catch (e) {
        print('Sync Error for item: ' + e.toString());
        failedQueue.add(item);
        allSuccess = false;
      }
    }

    await prefs.setStringList(_queueKey, failedQueue);
    return allSuccess;
  }

  Future<Map<String, dynamic>> uploadLocalImages(Map<String, dynamic> payload, ApiService apiService) async {
    final fields = ['start_odometer_image_url', 'end_odometer_image_url', 'fuel_bill_url', 'misc_bill_url'];
    
    for (String field in fields) {
      if (payload[field] != null && payload[field].toString().isNotEmpty) {
        String path = payload[field];
        if (!path.startsWith('http')) {
          // It's a local file path! Upload it.
          File file = File(path);
          if (await file.exists()) {
            var formData = FormData.fromMap({
              'file': await MultipartFile.fromFile(file.path, filename: 'upload.jpg')
            });
            var response = await apiService.client.post(
              ApiConfig.baseUrl.replaceAll('/api', '') + '/api/upload', 
              data: formData
            );
            if (response.statusCode == 200 && response.data['url'] != null) {
              payload[field] = response.data['url'];
              // Delete local file after successful upload to save space
              try { await file.delete(); } catch (_) {}
            }
          }
        }
      }
    }
    return payload;
  }
}
