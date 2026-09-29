import '../models/trip_log.dart';
import 'api_service.dart';

class TripService {
  final ApiService _apiService = ApiService();

  Future<List<TripLog>> getTrips() async {
    // Mock data
    await Future.delayed(const Duration(seconds: 1));
    return [];
  }

  Future<TripLog> saveTrip(TripLog trip) async {
    // Mock save
    await Future.delayed(const Duration(seconds: 1));
    return TripLog(
      id: 'mock_trip_${DateTime.now().millisecondsSinceEpoch}',
      employeeId: trip.employeeId,
      date: trip.date,
      startReading: trip.startReading,
      startOdometerImageUrl: trip.startOdometerImageUrl,
      startOcrReading: trip.startOcrReading,
      endReading: trip.endReading,
      endOdometerImageUrl: trip.endOdometerImageUrl,
      endOcrReading: trip.endOcrReading,
      distanceKm: trip.distanceKm,
      locations: trip.locations,
      fuelBill: trip.fuelBill,
      status: 'Submitted',
      flags: trip.flags,
    );
  }
}
