import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/trip_log.dart';
import '../models/fuel_bill.dart';
import 'api_service.dart';
import 'offline_sync_service.dart';
import '../config/api_config.dart';

class TripService {
  final ApiService _apiService = ApiService();
  final OfflineSyncService _syncService = OfflineSyncService();
  static const String _tripsCacheKey = 'cached_trips_history_json';

  Future<List<TripLog>> getTrips({String? userId}) async {
    // 1. Trigger background opportunistic sync without blocking UI fetch
    _syncService.syncPendingTrips(_apiService).catchError((e) {
      debugPrint("Background sync error: $e");
      return false;
    });

    try {
      final response = await _apiService.client.get(
        ApiConfig.trips,
        queryParameters: userId != null && userId.isNotEmpty ? {'user_id': userId} : null,
      );

      if (response.data != null && response.data is List) {
        final list = (response.data as List).map((t) => _parseTripLog(t)).toList();
        
        // Cache trips locally in background
        _cacheTripsLocally(response.data as List);
        return list;
      }
    } catch (e) {
      debugPrint("Get Trips Network Error: $e. Falling back to local cache.");
    }

    // 2. Fallback to cached history so user NEVER sees an empty screen
    return await _loadCachedTrips();
  }

  Future<void> _cacheTripsLocally(List<dynamic> rawList) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_tripsCacheKey, jsonEncode(rawList));
    } catch (e) {
      debugPrint("Error caching trips: $e");
    }
  }

  Future<List<TripLog>> _loadCachedTrips() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final str = prefs.getString(_tripsCacheKey);
      if (str != null && str.isNotEmpty) {
        final list = jsonDecode(str) as List;
        return list.map((t) => _parseTripLog(t)).toList();
      }
    } catch (e) {
      debugPrint("Error reading cached trips: $e");
    }
    return [];
  }

  Future<TripLog> saveTrip(Map<String, dynamic> payload) async {
    try {
      // 1. Try to upload images first if they are local files
      payload = await _syncService.uploadLocalImages(payload, _apiService);

      // 2. Submit trip
      final response = await _apiService.client.post(
        ApiConfig.trips,
        data: payload,
      );
      
      final t = response.data;
      return _parseTripLog(t);
    } catch (e) {
      debugPrint("Network Error during saveTrip, queueing offline: $e");
      // Queue offline for automatic sync
      await _syncService.enqueuePayload(payload);
      
      // Calculate distance safely
      final startR = double.tryParse(payload['start_reading']?.toString() ?? '') ?? 0.0;
      final endR = double.tryParse(payload['end_reading']?.toString() ?? '') ?? startR;
      final dist = (endR > startR) ? (endR - startR) : 0.0;

      // Return a reliable local trip log so the UI doesn't break
      return TripLog(
        id: payload['trip_id'] ?? ('offline_' + DateTime.now().millisecondsSinceEpoch.toString()),
        employeeId: payload['user_id'] ?? '',
        date: DateTime.now(),
        startReading: startR,
        startOdometerImageUrl: payload['start_odometer_image_url'] ?? '',
        endReading: endR,
        endOdometerImageUrl: payload['end_odometer_image_url'] ?? '',
        distanceKm: dist,
        locations: [],
        fuelBill: (payload['fuel_bill_url'] != null && payload['fuel_bill_url'].toString().isNotEmpty)
            ? FuelBill(
                amount: double.tryParse(payload['fuel_amount']?.toString() ?? '') ?? 0,
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
    // Parse fuel bill whenever an image URL is present, or amount > 0
    if ((fuelUrl != null && fuelUrl.isNotEmpty) || fuelAmt > 0) {
      double? ocrAmt;
      if (t['ocr_data'] != null && t['ocr_data'] is Map && t['ocr_data']['detected_amount'] != null) {
        ocrAmt = double.tryParse(t['ocr_data']['detected_amount'].toString());
      }
      parsedFuelBill = FuelBill(
        amount: fuelAmt,
        imageUrl: fuelUrl ?? '',
        fuelType: 'Petrol',
        remarks: '',
        ocrAmount: ocrAmt,
      );
    }

    final miscAmt = double.tryParse(t['misc_amount']?.toString() ?? '') ?? 0.0;
    final miscUrl = t['misc_bill_url']?.toString();
    final miscRemarks = t['misc_particulars']?.toString() ?? '';

    final startR = double.tryParse(t['start_reading']?.toString() ?? '') ?? 0.0;
    final endR = double.tryParse(t['end_reading']?.toString() ?? '') ?? startR;
    double dist = double.tryParse(t['distance_km']?.toString() ?? '') ?? 0.0;
    if (dist <= 0 && endR > startR) {
      dist = endR - startR;
    }

    return TripLog(
      id: t['id']?.toString(),
      employeeId: t['user_id'] ?? '',
      date: DateTime.tryParse(t['created_at'] ?? t['log_date'] ?? '') ?? DateTime.now(),
      startReading: startR,
      startOdometerImageUrl: t['start_odometer_image_url'] ?? '',
      endReading: endR,
      endOdometerImageUrl: t['end_odometer_image_url'] ?? '',
      distanceKm: dist,
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
