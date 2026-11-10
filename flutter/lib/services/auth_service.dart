import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/user_session.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  UserSession? _currentSession;
  UserSession? get currentSession => _currentSession;
  bool get isAuthenticated => _currentSession != null;

  // URL backend default untuk testing
  String gatewayBaseUrl = 'http://localhost:3000';

  // Daftar akun pengujian bawaan (kredensial mandiri)
  static final List<Map<String, dynamic>> mockAccounts = [
    {
      'email': 'admin@srikaya.id',
      'password': 'rahasia123',
      'name': 'Raihan Rivana (Super Admin)',
      'role': 'ADMIN',
      'companyId': 'cid-srikaya-01',
      'companyName': 'PT Srikaya Mandiri',
    },
    {
      'email': 'hrd@nusantara.id',
      'password': 'rahasia123',
      'name': 'Budi Santoso (HR Manager)',
      'role': 'HRD',
      'companyId': 'cid-nusantara-02',
      'companyName': 'PT Nusantara Sakti',
    },
    {
      'email': 'staff@srikaya.id',
      'password': 'rahasia123',
      'name': 'Dewi Lestari (Staff Operasional)',
      'role': 'STAFF',
      'companyId': 'cid-srikaya-01',
      'companyName': 'PT Srikaya Mandiri',
    },
  ];

  Future<UserSession> login({
    required String email,
    required String password,
    String? companyId,
    bool isMock = true,
  }) async {
    final cleanEmail = email.trim().toLowerCase();

    if (isMock) {
      // Simulasi latensi jaringan pengujian
      await Future.delayed(const Duration(milliseconds: 650));

      final matched = mockAccounts.firstWhere(
        (acc) => acc['email'] == cleanEmail && acc['password'] == password,
        orElse: () => <String, dynamic>{},
      );

      if (matched.isNotEmpty) {
        _currentSession = UserSession(
          id: 'usr-mock-${DateTime.now().millisecondsSinceEpoch % 10000}',
          name: matched['name'] as String,
          email: matched['email'] as String,
          role: matched['role'] as String,
          companyId: (companyId != null && companyId.isNotEmpty)
              ? companyId
              : matched['companyId'] as String,
          companyName: matched['companyName'] as String,
          token: 'mock-jwt-token-testing-independent-session',
          loggedInAt: DateTime.now(),
        );
        return _currentSession!;
      }

      // Validasi generik akun pengujian baru jika password minimal 6 karakter
      if (password.length >= 6) {
        _currentSession = UserSession(
          id: 'usr-custom-${DateTime.now().millisecondsSinceEpoch % 10000}',
          name: cleanEmail.split('@').first.toUpperCase(),
          email: cleanEmail,
          role: 'STAFF',
          companyId: (companyId != null && companyId.isNotEmpty)
              ? companyId
              : 'cid-srikaya-01',
          companyName: (companyId == 'cid-nusantara-02')
              ? 'PT Nusantara Sakti'
              : 'PT Srikaya Mandiri',
          token: 'mock-jwt-token-custom-user',
          loggedInAt: DateTime.now(),
        );
        return _currentSession!;
      }

      throw Exception('Kredensial tidak valid. Gunakan kata sandi minimal 6 karakter.');
    }

    // Alur live API ke gateway
    try {
      final response = await http
          .post(
            Uri.parse('$gatewayBaseUrl/api/auth/login'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': cleanEmail,
              'password': password,
              if (companyId != null && companyId.isNotEmpty) 'companyId': companyId,
            }),
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final body = jsonDecode(response.body) as Map<String, dynamic>;
        final data = body['data'] as Map<String, dynamic>? ?? body;
        _currentSession = UserSession.fromJson(data);
        return _currentSession!;
      } else {
        String errMessage = 'Autentikasi gagal (Kode: ${response.statusCode})';
        try {
          final errBody = jsonDecode(response.body);
          if (errBody is Map && errBody['message'] != null) {
            errMessage = errBody['message'].toString();
          }
        } catch (_) {}
        throw Exception(errMessage);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Live login error: $e');
      }
      throw Exception(
        'Gagal terhubung ke Gateway ($gatewayBaseUrl). Pastikan gateway aktif atau aktifkan Mode Pengujian Independen.',
      );
    }
  }

  void loginAsGuest() {
    _currentSession = UserSession(
      id: 'usr-guest-001',
      name: 'Tamu Uji Coba',
      email: 'guest@srikaya.id',
      role: 'GUEST',
      companyId: 'cid-srikaya-01',
      companyName: 'PT Srikaya Mandiri (Sandbox)',
      token: 'mock-jwt-guest-token',
      loggedInAt: DateTime.now(),
    );
  }

  void logout() {
    _currentSession = null;
  }

  // Simulasi verifikasi isolasi multi-tenant
  Map<String, dynamic> checkTenantAccess({required String targetCompanyId}) {
    if (_currentSession == null) {
      return {
        'allowed': false,
        'message': 'Sesi tidak aktif.',
      };
    }

    final isSameTenant = _currentSession!.companyId == targetCompanyId;
    return {
      'allowed': isSameTenant,
      'currentCompanyId': _currentSession!.companyId,
      'targetCompanyId': targetCompanyId,
      'message': isSameTenant
          ? 'Akses diizinkan: Tenant sesuai (${_currentSession!.companyId})'
          : 'Akses ditolak: Perlindungan isolasi multi-tenant aktif (CID mismatch)',
    };
  }
}
