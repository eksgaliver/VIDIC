class UserSession {
  final String id;
  final String name;
  final String email;
  final String role;
  final String companyId;
  final String companyName;
  final String? token;
  final DateTime loggedInAt;

  const UserSession({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.companyId,
    required this.companyName,
    this.token,
    required this.loggedInAt,
  });

  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      id: json['id'] as String? ?? 'usr-test-01',
      name: json['name'] as String? ?? 'Pengguna Uji Coba',
      email: json['email'] as String? ?? 'test@srikaya.id',
      role: json['role'] as String? ?? 'STAFF',
      companyId: json['companyId'] as String? ?? 'cid-srikaya-01',
      companyName: json['companyName'] as String? ?? 'PT Srikaya Mandiri',
      token: json['token'] as String?,
      loggedInAt: json['loggedInAt'] != null
          ? DateTime.tryParse(json['loggedInAt'] as String) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'companyId': companyId,
      'companyName': companyName,
      'token': token,
      'loggedInAt': loggedInAt.toIso8601String(),
    };
  }
}
