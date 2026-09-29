class FuelBill {
  final double amount;
  final String imageUrl;
  final double? ocrAmount;
  final String fuelType;
  final String? pumpName;
  final String remarks;

  FuelBill({
    required this.amount,
    required this.imageUrl,
    this.ocrAmount,
    required this.fuelType,
    this.pumpName,
    required this.remarks,
  });

  factory FuelBill.fromJson(Map<String, dynamic> json) {
    return FuelBill(
      amount: (json['amount'] as num).toDouble(),
      imageUrl: json['imageUrl'] as String,
      ocrAmount: json['ocrAmount'] != null ? (json['ocrAmount'] as num).toDouble() : null,
      fuelType: json['fuelType'] as String,
      pumpName: json['pumpName'] as String?,
      remarks: json['remarks'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'amount': amount,
      'imageUrl': imageUrl,
      'ocrAmount': ocrAmount,
      'fuelType': fuelType,
      'pumpName': pumpName,
      'remarks': remarks,
    };
  }
}
