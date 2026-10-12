import '../models/trip_log.dart';
import '../models/fuel_bill.dart';
import 'api_service.dart';
import 'offline_sync_service.dart';
import '../config/api_config.dart';

class TripService {
  final ApiService _apiService = ApiService();
  final OfflineSyncService _syncService = OfflineSyncService();

  Future<List<TripLog>> getTrips() async {
    try {
      // Opportunistic sync on fetch
      await _syncService.syncPendingTrips(_apiService);

      final response = await _apiService.client.get(ApiConfig.trips);
      if (response.data != null && response.data is List) {
        return (response.data as List).map((t) => _parseTripLog(t)).toList();
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
        distanceKm: double.tryParse(payload['distance_km']?.toString() ?? '') ?? 0.0,
        locations: [],
        fuelBill: (payload['fuel_amount'] != null && (double.tryParse(payload['fuel_amount'].toString()) ?? 0) > 0)
            ? FuelBill(
                amount: double.tryParse(payload['fuel_amount'].toString()) ?? 0,
                imageUrl: payload['fuel_bill_url'] ?? '',
                fuelType: 'Petrol',
                remarks: '',
              )
            : null,
        miscAmount: double.tryParse(payload['misc_amount']?.toString() ?? '') ?? 0.0,
        miscBillUrl: payload['misc_bill_url'],
        miscRemarks: payload['misc_particulars'] ?? '',
        status: payload['approval_status'] ?? 'pending',
        flags: [],
      );
    }
  }

  TripLog _parseTripLog(Map<String, dynamic> t) {
    FuelBill? parsedFuelBill;
    final fuelAmt = double.tryParse(t['fuel_amount']?.toString() ?? '') ?? 0.0;
    final fuelUrl = t['fuel_bill_url']?.toString();
    if (fuelAmt > 0 && fuelUrl != null && fuelUrl.isNotEmpty) {
      double? ocrAmt;
      if (t['ocr_data'] != null && t['ocr_data']['detected_amount'] != null) {
        ocrAmt = double.tryParse(t['ocr_data']['detected_amount'].toString());
      }
      parsedFuelBill = FuelBill(
        amount: fuelAmt,
        imageUrl: fuelUrl,
        fuelType: 'Petrol',
        remarks: '',
        ocrAmount: ocrAmt,
      );
    }

    final miscAmt = double.tryParse(t['misc_amount']?.toString() ?? '') ?? 0.0;
    final miscUrl = t['misc_bill_url']?.toString();
    final miscRemarks = t['misc_particulars']?.toString() ?? '';

    return TripLog(
      id: t['id']?.toString(),
      employeeId: t['user_id'] ?? '',
      date: DateTime.tryParse(t['created_at'] ?? '') ?? DateTime.now(),
      startReading: double.tryParse(t['start_reading']?.toString() ?? '') ?? 0.0,
      startOdometerImageUrl: t['start_odometer_image_url'] ?? '',
      endReading: double.tryParse(t['end_reading']?.toString() ?? '') ?? 0.0,
      endOdometerImageUrl: t['end_odometer_image_url'] ?? '',
      distanceKm: double.tryParse(t['distance_km']?.toString() ?? '') ?? 0.0,
      locations: [],
      fuelBill: parsedFuelBill,
      miscAmount: miscAmt,
      miscBillUrl: (miscUrl != null && miscUrl.isNotEmpty) ? miscUrl : null,
      miscRemarks: miscRemarks,
      status: t['approval_status'] ?? 'pending',
      flags: [],
    );
  }
}
