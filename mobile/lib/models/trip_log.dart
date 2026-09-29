import 'trip_location.dart';
import 'fuel_bill.dart';
import 'fraud_flag.dart';

class TripLog {
  final String? id;
  final String employeeId;
  final DateTime date;
  final double startReading;
  final String startOdometerImageUrl;
  final double? startOcrReading;
  final double endReading;
  final String endOdometerImageUrl;
  final double? endOcrReading;
  final double distanceKm;
  final List<TripLocation> locations;
  final FuelBill? fuelBill;
  final String status; // 'Draft', 'Pending', 'Approved', 'Rejected', 'Flagged'
  final List<FraudFlag> flags;

  TripLog({
    this.id,
    required this.employeeId,
    required this.date,
    required this.startReading,
    required this.startOdometerImageUrl,
    this.startOcrReading,
    required this.endReading,
    required this.endOdometerImageUrl,
    this.endOcrReading,
    required this.distanceKm,
    required this.locations,
    this.fuelBill,
    required this.status,
    required this.flags,
  });

  factory TripLog.fromJson(Map<String, dynamic> json) {
    return TripLog(
      id: json['id'] as String?,
      employeeId: json['employeeId'] as String,
      date: DateTime.parse(json['date'] as String),
      startReading: (json['startReading'] as num).toDouble(),
      startOdometerImageUrl: json['startOdometerImageUrl'] as String,
      startOcrReading: json['startOcrReading'] != null ? (json['startOcrReading'] as num).toDouble() : null,
      endReading: (json['endReading'] as num).toDouble(),
      endOdometerImageUrl: json['endOdometerImageUrl'] as String,
      endOcrReading: json['endOcrReading'] != null ? (json['endOcrReading'] as num).toDouble() : null,
      distanceKm: (json['distanceKm'] as num).toDouble(),
      locations: (json['locations'] as List<dynamic>?)?.map((e) => TripLocation.fromJson(e as Map<String, dynamic>)).toList() ?? [],
      fuelBill: json['fuelBill'] != null ? FuelBill.fromJson(json['fuelBill'] as Map<String, dynamic>) : null,
      status: json['status'] as String,
      flags: (json['flags'] as List<dynamic>?)?.map((e) => FraudFlag.fromJson(e as Map<String, dynamic>)).toList() ?? [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employeeId': employeeId,
      'date': date.toIso8601String(),
      'startReading': startReading,
      'startOdometerImageUrl': startOdometerImageUrl,
      'startOcrReading': startOcrReading,
      'endReading': endReading,
      'endOdometerImageUrl': endOdometerImageUrl,
      'endOcrReading': endOcrReading,
      'distanceKm': distanceKm,
      'locations': locations.map((e) => e.toJson()).toList(),
      'fuelBill': fuelBill?.toJson(),
      'status': status,
      'flags': flags.map((e) => e.toJson()).toList(),
    };
  }
}
