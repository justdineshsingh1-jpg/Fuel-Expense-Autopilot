class TripLocation {
  final String id;
  final String clientName;
  final String purpose;
  final double lat;
  final double lng;
  final String address;
  final DateTime timestamp;

  TripLocation({
    required this.id,
    required this.clientName,
    required this.purpose,
    required this.lat,
    required this.lng,
    required this.address,
    required this.timestamp,
  });

  factory TripLocation.fromJson(Map<String, dynamic> json) {
    return TripLocation(
      id: json['id'] as String,
      clientName: json['clientName'] as String,
      purpose: json['purpose'] as String,
      lat: (json['lat'] as num).toDouble(),
      lng: (json['lng'] as num).toDouble(),
      address: json['address'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'clientName': clientName,
      'purpose': purpose,
      'lat': lat,
      'lng': lng,
      'address': address,
      'timestamp': timestamp.toIso8601String(),
    };
  }
}
