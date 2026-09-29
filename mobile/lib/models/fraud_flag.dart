class FraudFlag {
  final String type;
  final String severity;
  final String description;
  final String? executiveExplanation;

  FraudFlag({
    required this.type,
    required this.severity,
    required this.description,
    this.executiveExplanation,
  });

  factory FraudFlag.fromJson(Map<String, dynamic> json) {
    return FraudFlag(
      type: json['type'] as String,
      severity: json['severity'] as String,
      description: json['description'] as String,
      executiveExplanation: json['executiveExplanation'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'type': type,
      'severity': severity,
      'description': description,
      'executiveExplanation': executiveExplanation,
    };
  }
}
