import 'package:flutter/foundation.dart';

/// Satu tempat untuk alamat gateway dan identitas yang dipakai beranda.
///
/// Semuanya bisa ditimpa tanpa mengubah kode, misalnya saat dijalankan di
/// perangkat fisik:
///
///     flutter run --dart-define=API_BASE_URL=http://192.168.1.8:3000
class AppConfig {
  const AppConfig._();

  static const String _baseUrlOverride = String.fromEnvironment('API_BASE_URL');

  /// Beranda tidak punya layar login. Identitas diambil dari akun uji yang
  /// sudah tersemai di layanan auth, supaya data yang tampil tetap data nyata.
  static const String demoEmail = String.fromEnvironment(
    'DEMO_EMAIL',
    defaultValue: 'budi.santoso@srikaya.id',
  );

  static const String demoPassword = String.fromEnvironment(
    'DEMO_PASSWORD',
    defaultValue: 'rahasia123',
  );

  /// Emulator Android memetakan host fisik ke 10.0.2.2, bukan localhost.
  static String get gatewayBaseUrl {
    if (_baseUrlOverride.isNotEmpty) return _baseUrlOverride;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }
}