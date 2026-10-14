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
    // 1. Opportunistic background sync of pending offline trips
    _syncService.syncPendingTrips(_apiService).catchError((e) {
      debugPrint("Background sync error: $e");
      return false;
    });

    try {
      final response = await _apiService.client.get(
        ApiConfig.trips,
        queryParameters: userId != null && userId.isNotEmpty ? {'user_id': userId} : null,
      );

      dynamic rawData = response.data;
      if (rawData is String) {
        try {
          rawData = jsonDecode(rawData);
        } catch (_) {}
      }

      if (rawData != null && rawData is List) {
        final List<TripLog> list = [];
        for (final item in rawData) {
          try {
            list.add(_parseTripLog(item));
          } catch (itemErr) {
            debugPrint("Error parsing single trip item: $itemErr");
          }
        }
        
        // Cache trips locally in background
        _cacheTripsLocally(rawData);
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
        final decoded = jsonDecode(str);
        if (decoded is List) {
          final List<TripLog> list = [];
          for (final item in decoded) {
            try {
              list.add(_parseTripLog(item));
            } catch (err) {
              debugPrint("Error parsing cached trip item: $err");
            }
          }
          return list;
        }
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
      
      dynamic rawData = response.data;
      if (rawData is String) {
        try {
          rawData = jsonDecode(rawData);
        } catch (_) {}
      }
      
      if (rawData is Map) {
        return _parseTripLog(rawData);
      }
      return _buildFallbackLocalTripLog(payload);
    } catch (e) {
      debugPrint("Network Error during saveTrip, queueing offline: $e");
      await _syncService.enqueuePayload(payload);
      return _buildFallbackLocalTripLog(payload);
    }
  }

  TripLog _buildFallbackLocalTripLog(Map<String, dynamic> payload) {
    final startR = double.tryParse(payload['start_reading']?.toString() ?? '') ?? 0.0;
    final endR = double.tryParse(payload['end_reading']?.toString() ?? '') ?? startR;
    final dist = (endR > startR) ? (endR - startR) : 0.0;

    return TripLog(
      id: payload['trip_id']?.toString() ?? ('offline_${DateTime.now().millisecondsSinceEpoch}'),
      employeeId: payload['user_id']?.toString() ?? '',
      date: DateTime.now(),
      startReading: startR,
      startOdometerImageUrl: payload['start_odometer_image_url']?.toString() ?? '',
      endReading: endR,
      endOdometerImageUrl: payload['end_odometer_image_url']?.toString() ?? '',
      distanceKm: dist,
      locations: [],
      fuelBill: (payload['fuel_bill_url'] != null && payload['fuel_bill_url'].toString().isNotEmpty)
          ? FuelBill(
              amount: double.tryParse(payload['fuel_amount']?.toString() ?? '') ?? 0.0,
              imageUrl: payload['fuel_bill_url'].toString(),
              fuelType: 'Petrol',
              remarks: '',
            )
          : null,
      miscAmount: double.tryParse(payload['misc_amount']?.toString() ?? '') ?? 0.0,
      miscBillUrl: payload['misc_bill_url']?.toString(),
      miscRemarks: payload['misc_particulars']?.toString() ?? '',
      status: payload['approval_status']?.toString() ?? 'pending',
      flags: [],
    );
  }

  TripLog _parseTripLog(dynamic raw) {
    final Map<String, dynamic> t = (raw is Map) ? Map<String, dynamic>.from(raw) : {};

    FuelBill? parsedFuelBill;
    final fuelAmt = double.tryParse(t['fuel_amount']?.toString() ?? '') ?? 0.0;
    final fuelUrl = t['fuel_bill_url']?.toString();
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

    final rawDateStr = t['created_at']?.toString() ?? t['log_date']?.toString();
    DateTime parsedDate = DateTime.now();
    if (rawDateStr != null && rawDateStr.isNotEmpty) {
      parsedDate = DateTime.tryParse(rawDateStr) ?? DateTime.now();
    }

    return TripLog(
      id: t['id']?.toString(),
      employeeId: t['user_id']?.toString() ?? '',
      date: parsedDate,
      startReading: startR,
      startOdometerImageUrl: t['start_odometer_image_url']?.toString() ?? '',
      endReading: endR,
      endOdometerImageUrl: t['end_odometer_image_url']?.toString() ?? '',
      distanceKm: dist,
      locations: [],
      fuelBill: parsedFuelBill,
      miscAmount: miscAmt,
      miscBillUrl: (miscUrl != null && miscUrl.isNotEmpty) ? miscUrl : null,
      miscRemarks: miscRemarks,
      status: t['approval_status']?.toString() ?? 'pending',
      flags: [],
    );
  }
}
