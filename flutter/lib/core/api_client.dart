import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'app_config.dart';

/// Kegagalan pemanggilan gateway yang pesannya sudah layak ditampilkan.
class ApiException implements Exception {
  ApiException(this.message);

  final String message;

  @override
  String toString() => message;
}

/// Klien HTTP tipis untuk gateway Bun.
///
/// Sesi dibuat sekali di latar belakang memakai akun uji, sehingga tidak ada
/// layar login: beranda langsung memuat data milik pengguna tersebut.
class ApiClient {
  ApiClient({http.Client? httpClient, String? baseUrl})
      : _http = httpClient ?? http.Client(),
        baseUrl = baseUrl ?? AppConfig.gatewayBaseUrl;

  final http.Client _http;
  final String baseUrl;

  static const Duration _timeout = Duration(seconds: 12);

  String? _token;
  Map<String, dynamic>? _profile;

  Map<String, dynamic>? get profile => _profile;

  Future<Map<String, dynamic>> signIn() async {
    final body = await _send(
      'POST',
      '/api/auth/login',
      body: {
        'email': AppConfig.demoEmail,
        'password': AppConfig.demoPassword,
      },
    );

    final token = body['token']?.toString();
    final user = body['user'];

    if (token == null || token.isEmpty || user is! Map<String, dynamic>) {
      throw ApiException('Layanan auth tidak mengirim sesi yang sah.');
    }

    _token = token;
    _profile = user;
    return user;
  }

  /// Mengambil `data` dari balasan gateway, membuat sesi lebih dulu bila perlu.
  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    if (_token == null) await signIn();

    final body = await _send('GET', path, query: query);
    return body['data'];
  }

  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, String>? query,
    Map<String, dynamic>? body,
  }) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: query);
    final headers = <String, String>{
      'Content-Type': 'application/json',
      if (_token != null) 'Authorization': 'Bearer $_token',
    };

    late final http.Response response;
    try {
      response = method == 'POST'
          ? await _http
              .post(uri, headers: headers, body: jsonEncode(body ?? const {}))
              .timeout(_timeout)
          : await _http.get(uri, headers: headers).timeout(_timeout);
    } on TimeoutException {
      throw ApiException(
        'Gateway tidak merespons dalam ${_timeout.inSeconds} detik ($baseUrl).',
      );
    } catch (_) {
      throw ApiException('Tidak dapat menghubungi gateway di $baseUrl.');
    }

    Map<String, dynamic> json = const {};
    if (response.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) json = decoded;
      } catch (_) {
        // Balasan bukan JSON: pesan status di bawah yang dipakai.
      }
    }

    if (response.statusCode >= 400) {
      throw ApiException(
        json['message']?.toString() ??
            'Permintaan ke $path gagal (kode ${response.statusCode}).',
      );
    }

    return json;
  }
}