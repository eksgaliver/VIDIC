/// Sesi pengguna hasil autentikasi layanan auth (Bun) atau mode uji mandiri.
///
/// Payload nyata dari gateway berbentuk:
/// `{ success, token, user: { id, companyId, companyName, name, email, role } }`
/// sehingga konstruktor [UserSession.fromLoginResponse] membaca objek `user`.
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

  /// Label peran yang dipakai antarmuka untuk peran bawaan basis data.
  static const Map<String, String> roleLabels = {
    'admin': 'ADMIN',
    'superadmin': 'SUPER ADMIN',
    'member': 'STAFF',
    'guest': 'GUEST',
  };

  /// Menyeragamkan peran mentah (`admin`, `member`, ...) menjadi label tampilan.
  static String normalizeRole(String? raw) {
    final value = (raw ?? 'member').trim().toLowerCase();
    final label = roleLabels[value];
    if (label != null) return label;
    return value.isEmpty ? 'STAFF' : value.toUpperCase();
  }

  /// Membaca respons `POST /api/auth/login` milik layanan auth Bun.
  factory UserSession.fromLoginResponse(Map<String, dynamic> body) {
    final data = body['data'] as Map<String, dynamic>? ?? body;
    final user = data['user'] as Map<String, dynamic>? ?? data;

    return UserSession(
      id: user['id']?.toString() ?? '',
      name: user['name']?.toString() ?? '',
      email: user['email']?.toString() ?? '',
      role: normalizeRole(user['role']?.toString()),
      companyId: user['companyId']?.toString() ?? '',
      companyName: user['companyName']?.toString() ?? '',
      token: data['token']?.toString(),
      loggedInAt: DateTime.now(),
    );
  }

  /// Membaca sesi yang disimpan lokal (format [toJson]).
  factory UserSession.fromJson(Map<String, dynamic> json) {
    return UserSession(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      email: json['email'] as String? ?? '',
      role: json['role'] as String? ?? 'STAFF',
      companyId: json['companyId'] as String? ?? '',
      companyName: json['companyName'] as String? ?? '',
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
