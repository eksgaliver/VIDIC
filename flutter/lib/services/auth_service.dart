import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/user_session.dart';

/// Kegagalan autentikasi yang pesannya sudah layak ditampilkan di layar login.
class AuthFailure implements Exception {
  AuthFailure(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Akun contoh yang tersemai di layanan auth, dipakai tombol isi cepat.
class DemoAccount {
  const DemoAccount({
    required this.email,
    required this.label,
    required this.role,
  });

  final String email;
  final String label;
  final String role;

  static const String password = 'rahasia123';
}

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  UserSession? _currentSession;
  UserSession? get currentSession => _currentSession;
  bool get isAuthenticated => _currentSession != null;

  /// Menandai sesi terakhir berasal dari gateway, bukan mode uji mandiri.
  bool _isLiveSession = false;
  bool get isLiveSession => _isLiveSession;

  static const String _envBaseUrl = String.fromEnvironment('API_BASE_URL');
  static const Duration _timeout = Duration(seconds: 10);

  /// Alamat gateway Bun. Emulator Android memetakan host fisik ke 10.0.2.2,
  /// sehingga `localhost` justru menunjuk emulator itu sendiri.
  /// Timpa lewat `--dart-define=API_BASE_URL=http://192.168.1.10:3000`.
  static String get defaultGatewayUrl {
    if (_envBaseUrl.isNotEmpty) return _envBaseUrl;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  String gatewayBaseUrl = defaultGatewayUrl;

  /// Header siap pakai untuk permintaan berikutnya setelah login berhasil.
  Map<String, String> get authHeaders {
    final token = _currentSession?.token;
    if (token == null || token.isEmpty) return const {};
    return {'Authorization': 'Bearer $token'};
  }

  /// Akun contoh yang benar-benar ada di tabel `users` setelah seeder berjalan.
  static const List<DemoAccount> demoAccounts = [
    DemoAccount(email: 'admin@srikaya.id', label: 'Admin', role: 'ADMIN'),
    DemoAccount(email: 'budi.santoso@srikaya.id', label: 'Budi (Staff)', role: 'STAFF'),
    DemoAccount(email: 'siti.rahma@srikaya.id', label: 'Siti (HR)', role: 'STAFF'),
  ];

  /// [isMock] hanya untuk pengembangan tanpa backend. Default-nya sesi nyata
  /// ke layanan auth lewat gateway, sama seperti klien web.
  Future<UserSession> login({
    required String email,
    required String password,
    bool isMock = false,
  }) async {
    final cleanEmail = email.trim().toLowerCase();
    if (isMock) return _mockLogin(cleanEmail, password);

    final uri = Uri.parse('$gatewayBaseUrl/api/auth/login');
    late final http.Response response;

    try {
      response = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': cleanEmail, 'password': password}),
          )
          .timeout(_timeout);
    } on TimeoutException {
      throw AuthFailure(
        'Gateway tidak merespons dalam ${_timeout.inSeconds} detik ($gatewayBaseUrl).',
      );
    } catch (error) {
      if (kDebugMode) {
        debugPrint('Login ke $uri gagal: $error');
      }
      throw AuthFailure(
        'Tidak dapat menghubungi gateway di $gatewayBaseUrl. '
        'Jalankan layanan Bun dan periksa alamat gateway.',
      );
    }

    Map<String, dynamic> body = const {};
    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) body = decoded;
      } catch (_) {
        // Balasan bukan JSON: pesan status di bawah yang dipakai.
      }
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw AuthFailure(
        body['message']?.toString() ??
            'Autentikasi ditolak gateway (kode ${response.statusCode}).',
      );
    }

    final session = UserSession.fromLoginResponse(body);
    if (session.token == null || session.token!.isEmpty) {
      throw AuthFailure('Layanan auth tidak mengirim token sesi.');
    }

    _currentSession = session;
    _isLiveSession = true;
    return session;
  }

  /// Mode luring: meniru akun demo tanpa menyentuh jaringan.
  Future<UserSession> _mockLogin(String cleanEmail, String password) async {
    await Future.delayed(const Duration(milliseconds: 400));

    DemoAccount? matched;
    for (final account in demoAccounts) {
      if (account.email == cleanEmail) {
        matched = account;
        break;
      }
    }
    if (matched == null || password != DemoAccount.password) {
      throw AuthFailure(
        'Kredensial tidak valid. Kata sandi akun contoh: ${DemoAccount.password}',
      );
    }

    final name = cleanEmail
        .split('@')
        .first
        .split(RegExp(r'[._]'))
        .map((part) => part.isEmpty ? part : part[0].toUpperCase() + part.substring(1))
        .join(' ');

    _currentSession = UserSession(
      id: 'mock-$cleanEmail',
      name: name,
      email: cleanEmail,
      role: matched.role,
      companyId: 'mock-01',
      companyName: 'Mode Uji Mandiri',
      token: 'mock-token-offline',
      loggedInAt: DateTime.now(),
    );
    _isLiveSession = false;
    return _currentSession!;
  }

  void loginAsGuest() {
    _currentSession = UserSession(
      id: 'guest',
      name: 'Tamu Uji Coba',
      email: 'guest@srikaya.id',
      role: 'GUEST',
      companyId: '',
      companyName: 'Sandbox Lokal',
      token: 'mock-token-guest',
      loggedInAt: DateTime.now(),
    );
    _isLiveSession = false;
  }

  void logout() {
    _currentSession = null;
    _isLiveSession = false;
  }

  /// Simulasi verifikasi isolasi multi-tenant.
  Map<String, dynamic> checkTenantAccess({required String targetCompanyId}) {
    final session = _currentSession;
    if (session == null) {
      return {
        'allowed': false,
        'message': 'Sesi tidak aktif.',
      };
    }

    final currentId = session.companyId;
    if (currentId.isEmpty) {
      return {
        'allowed': false,
        'currentCompanyId': currentId,
        'targetCompanyId': targetCompanyId,
        'message': 'Akun ini tidak terikat ke perusahaan mana pun.',
      };
    }

    final isSameTenant = currentId == targetCompanyId;
    return {
      'allowed': isSameTenant,
      'currentCompanyId': currentId,
      'targetCompanyId': targetCompanyId,
      'message': isSameTenant
          ? 'Akses diizinkan: Tenant sesuai (${_shortId(currentId)})'
          : 'Akses ditolak: Perlindungan isolasi multi-tenant aktif (CID mismatch)',
    };
  }

  static String _shortId(String value) =>
      value.length <= 8 ? value : '${value.substring(0, 8)}...';
}
