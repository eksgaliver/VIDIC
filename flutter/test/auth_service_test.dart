import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:srikaya_auth/models/user_session.dart';
import 'package:srikaya_auth/services/auth_service.dart';

/// Balasan asli `POST /api/auth/login` layanan auth Bun melalui gateway.
const String realLoginResponse = '''
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiJ9.payload.signature",
  "user": {
    "id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "companyId": "c6c76e1e-8747-4018-a13d-771cc9f5ac32",
    "companyName": "PT Srikaya Digital Solusindo",
    "name": "Srikaya Enterprise Operator",
    "email": "admin@srikaya.id",
    "role": "admin",
    "avatarUrl": null,
    "createdAt": "2026-11-09T07:59:38.316Z"
  },
  "message": "Autentikasi berhasil"
}
''';

void main() {
  group('UserSession.fromLoginResponse', () {
    test('membaca token dan objek user dari layanan auth', () {
      final session = UserSession.fromLoginResponse(
        jsonDecode(realLoginResponse) as Map<String, dynamic>,
      );

      expect(session.id, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(session.email, 'admin@srikaya.id');
      expect(session.name, 'Srikaya Enterprise Operator');
      expect(session.role, 'ADMIN');
      expect(session.companyId, 'c6c76e1e-8747-4018-a13d-771cc9f5ac32');
      expect(session.companyName, 'PT Srikaya Digital Solusindo');
      expect(session.token, 'eyJhbGciOiJIUzI1NiJ9.payload.signature');
    });

    test('tetap membaca payload yang dibungkus kunci data', () {
      final session = UserSession.fromLoginResponse({
        'data': jsonDecode(realLoginResponse) as Map<String, dynamic>,
      });

      expect(session.email, 'admin@srikaya.id');
      expect(session.companyName, 'PT Srikaya Digital Solusindo');
    });

    test('akun tanpa perusahaan tetap menghasilkan sesi yang sah', () {
      final session = UserSession.fromLoginResponse({
        'token': 'token-tanpa-tenant',
        'user': {
          'id': 'super-1',
          'name': 'Super Admin',
          'email': 'super@srikaya.id',
          'role': 'superadmin',
          'companyId': null,
          'companyName': null,
        },
      });

      expect(session.companyId, isEmpty);
      expect(session.role, 'SUPER ADMIN');
    });
  });

  group('UserSession.normalizeRole', () {
    test('memetakan peran basis data ke label tampilan', () {
      expect(UserSession.normalizeRole('admin'), 'ADMIN');
      expect(UserSession.normalizeRole('member'), 'STAFF');
      expect(UserSession.normalizeRole('guest'), 'GUEST');
      expect(UserSession.normalizeRole('SuperAdmin'), 'SUPER ADMIN');
      expect(UserSession.normalizeRole(null), 'STAFF');
    });
  });

  group('AuthService', () {
    tearDown(AuthService().logout);

    test('mode luring memakai akun contoh yang tersemai', () async {
      final session = await AuthService().login(
        email: 'budi.santoso@srikaya.id',
        password: DemoAccount.password,
        isMock: true,
      );

      expect(session.email, 'budi.santoso@srikaya.id');
      expect(session.role, 'STAFF');
      expect(AuthService().isLiveSession, isFalse);
      expect(AuthService().isAuthenticated, isTrue);
    });

    test('kredensial luring yang salah ditolak', () async {
      expect(
        () => AuthService().login(
          email: 'admin@srikaya.id',
          password: 'kata-sandi-salah',
          isMock: true,
        ),
        throwsA(isA<AuthFailure>()),
      );
    });

    test('header otorisasi mengikuti token sesi aktif', () async {
      await AuthService().login(
        email: 'admin@srikaya.id',
        password: DemoAccount.password,
        isMock: true,
      );

      expect(
        AuthService().authHeaders['Authorization'],
        'Bearer mock-token-offline',
      );

      AuthService().logout();
      expect(AuthService().authHeaders, isEmpty);
    });

    test('isolasi tenant menolak perusahaan lain', () async {
      await AuthService().login(
        email: 'admin@srikaya.id',
        password: DemoAccount.password,
        isMock: true,
      );

      final same = AuthService().checkTenantAccess(targetCompanyId: 'mock-01');
      final other = AuthService().checkTenantAccess(targetCompanyId: 'cid-nusantara-02');

      expect(same['allowed'], isTrue);
      expect(other['allowed'], isFalse);
    });
  });
}
