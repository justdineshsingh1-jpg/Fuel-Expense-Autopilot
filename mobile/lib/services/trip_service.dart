import '../models/trip_log.dart';
import 'api_service.dart';
import '../config/api_config.dart';

class TripService {
  final ApiService _apiService = ApiService();

  Future<List<TripLog>> getTrips() async {
    try {
      final response = await _apiService.client.get(ApiConfig.trips);
      if (response.data != null) {
        // Assuming response.data is a list
        return (response.data as List).map((t) => TripLog(
          id: t['id'],
          employeeId: t['user_id'] ?? '',
          date: t['created_at']?.substring(0, 10) ?? '',
          startReading: t['start_reading']?.toString() ?? '',
          startOdometerImageUrl: t['start_odometer_image_url'],
          endReading: t['end_reading']?.toString(),
          endOdometerImageUrl: t['end_odometer_image_url'],
          distanceKm: t['distance_km']?.toDouble(),
          locations: [], // Avoid parsing massive array for list view
          status: t['approval_status'] ?? 'pending',
          flags: t['fraud_flags'] ?? [],
        )).toList();
      }
      return [];
    } catch (e) {
      print("Get Trips Error: $e");
      return [];
    }
  }

  Future<TripLog> saveTrip(Map<String, dynamic> payload) async {
    try {
      final response = await _apiService.client.post(
        ApiConfig.trips,
        data: payload,
      );
      
      final t = response.data;
      return TripLog(
        id: t['id'],
        employeeId: t['user_id'] ?? '',
        date: t['created_at']?.substring(0, 10) ?? '',
        startReading: t['start_reading']?.toString() ?? '',
        startOdometerImageUrl: t['start_odometer_image_url'],
        endReading: t['end_reading']?.toString(),
        endOdometerImageUrl: t['end_odometer_image_url'],
        distanceKm: t['distance_km']?.toDouble(),
        locations: [],
        status: t['approval_status'] ?? 'pending',
        flags: t['fraud_flags'] ?? [],
      );
    } catch (e) {
      print("Save Trip Error: $e");
      throw Exception('Failed to save trip to backend');
    }
  }
}
