class User {
  final String id;
  final String employeeCode;
  final String fullName;
  final String email;
  final String role;
  final String department;

  User({
    required this.id,
    required this.employeeCode,
    required this.fullName,
    required this.email,
    required this.role,
    required this.department,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      employeeCode: json['employeeCode'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      department: json['department'] as String,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'employeeCode': employeeCode,
      'fullName': fullName,
      'email': email,
      'role': role,
      'department': department,
    };
  }
}
