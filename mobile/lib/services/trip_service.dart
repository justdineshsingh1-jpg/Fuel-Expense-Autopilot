import '../models/trip_log.dart';
import 'api_service.dart';
import 'offline_sync_service.dart';
import '../config/api_config.dart';
import 'package:dio/dio.dart';
import 'dart:io';

class TripService {
  final ApiService _apiService = ApiService();
  final OfflineSyncService _syncService = OfflineSyncService();

  Future<List<TripLog>> getTrips() async {
    try {
      // Opportunistic sync on fetch
      await _syncService.syncPendingTrips(_apiService);

      final response = await _apiService.client.get(ApiConfig.trips);
      if (response.data != null) {
        return (response.data as List).map((t) => TripLog(
          id: t['id'],
          employeeId: t['user_id'] ?? '',
          date: DateTime.tryParse(t['created_at'] ?? '') ?? DateTime.now(),
          startReading: double.tryParse(t['start_reading']?.toString() ?? '') ?? 0.0,
          startOdometerImageUrl: t['start_odometer_image_url'] ?? '',
          endReading: double.tryParse(t['end_reading']?.toString() ?? '') ?? 0.0,
          endOdometerImageUrl: t['end_odometer_image_url'] ?? '',
          distanceKm: t['distance_km']?.toDouble() ?? 0.0,
          locations: [], 
          status: t['approval_status'] ?? 'pending',
          flags: [],
        )).toList();
      }
      return [];
    } catch (e) {
      print("Get Trips Error: " + e.toString());
      return [];
    }
  }

  Future<TripLog> saveTrip(Map<String, dynamic> payload) async {
    try {
      // 1. Try to upload images first if they are local
      payload = await _syncService.uploadLocalImages(payload, _apiService);

      // 2. Submit trip
      final response = await _apiService.client.post(
        ApiConfig.trips,
        data: payload,
      );
      
      final t = response.data;
      return _parseTripLog(t);
    } catch (e) {
      print("Network Error during saveTrip, queueing offline: " + e.toString());
      // If ANY network error happens, queue it offline!
      await _syncService.enqueuePayload(payload);
      
      // Return a mocked local trip log so the UI doesn't break
      return TripLog(
        id: 'offline_' + DateTime.now().millisecondsSinceEpoch.toString(),
        employeeId: payload['user_id'] ?? '',
        date: DateTime.now(),
        startReading: double.tryParse(payload['start_reading']?.toString() ?? '') ?? 0.0,
        startOdometerImageUrl: payload['start_odometer_image_url'] ?? '',
        endReading: double.tryParse(payload['end_reading']?.toString() ?? '') ?? 0.0,
        endOdometerImageUrl: payload['end_odometer_image_url'] ?? '',
        distanceKm: 0.0,
        locations: [],
        status: 'queued',
        flags: [],
      );
    }
  }

  TripLog _parseTripLog(Map<String, dynamic> t) {
    return TripLog(
        id: t['id'],
        employeeId: t['user_id'] ?? '',
        date: DateTime.tryParse(t['created_at'] ?? '') ?? DateTime.now(),
        startReading: double.tryParse(t['start_reading']?.toString() ?? '') ?? 0.0,
        startOdometerImageUrl: t['start_odometer_image_url'] ?? '',
        endReading: double.tryParse(t['end_reading']?.toString() ?? '') ?? 0.0,
        endOdometerImageUrl: t['end_odometer_image_url'] ?? '',
        distanceKm: t['distance_km']?.toDouble() ?? 0.0,
        locations: [],
        status: t['approval_status'] ?? 'pending',
        flags: [],
    );
  }
}
