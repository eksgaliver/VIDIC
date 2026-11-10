import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:srikaya_auth/main.dart';
import 'package:srikaya_auth/services/auth_service.dart';

void main() {
  setUp(() {
    AuthService().logout();
  });

  testWidgets('Welcome screen renders properly with branding and CTAs', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SrikayaMobileApp());

    // Memverifikasi teks judul & branding Srikaya
    expect(find.text('SRIKAYA'), findsOneWidget);
    expect(find.text('Selamat Datang'), findsOneWidget);
    expect(find.text('Masuk ke Akun'), findsOneWidget);
    expect(find.text('Mulai Cepat (Mode Tamu / Sandbox)'), findsOneWidget);
  });

  testWidgets('Navigates to Login screen on tapping Masuk ke Akun', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SrikayaMobileApp());

    final loginBtn = find.text('Masuk ke Akun');
    await tester.ensureVisible(loginBtn);
    await tester.tap(loginBtn);
    await tester.pumpAndSettle();

    // Memverifikasi tampilan login muncul
    expect(find.text('Masuk ke Sistem'), findsOneWidget);
    expect(find.text('Alamat Email'), findsOneWidget);
    expect(find.text('Kata Sandi'), findsOneWidget);
    expect(find.text('URL Gateway (Bun)'), findsOneWidget);
    expect(find.text('Masuk Sekarang'), findsOneWidget);
  });

  testWidgets('Performs mock authentication and enters Home Dashboard', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SrikayaMobileApp());

    final loginBtn = find.text('Masuk ke Akun');
    await tester.ensureVisible(loginBtn);
    await tester.tap(loginBtn);
    await tester.pumpAndSettle();

    // Aktifkan mode luring supaya pengujian tidak menyentuh jaringan
    final mockSwitch = find.byType(Switch);
    await tester.ensureVisible(mockSwitch);
    await tester.pumpAndSettle();
    await tester.tap(mockSwitch);
    await tester.pumpAndSettle();

    // Ketuk tombol masuk (dengan nilai default admin@srikaya.id)
    final submitBtn = find.text('Masuk Sekarang');
    await tester.ensureVisible(submitBtn);
    await tester.tap(submitBtn);

    // Tunggu durasi Future mock login
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 700));
    await tester.pumpAndSettle();

    // Memverifikasi navigasi ke dasbor berhasil
    expect(find.text('Dasbor Srikaya'), findsOneWidget);
    expect(find.text('Admin'), findsWidgets);
    expect(find.text('Mode Uji Mandiri • mock-01'), findsOneWidget);
  });

  testWidgets('Guest sandbox mode navigates directly to Home Dashboard', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const SrikayaMobileApp());

    final guestBtn = find.text('Mulai Cepat (Mode Tamu / Sandbox)');
    await tester.ensureVisible(guestBtn);
    await tester.tap(guestBtn);
    await tester.pumpAndSettle();

    // Memverifikasi dasbor muncul
    expect(find.text('Dasbor Srikaya'), findsOneWidget);
    expect(find.text('Shift Kerja Hari Ini'), findsOneWidget);
    expect(find.text('Uji Validasi Isolasi Multi-Tenant'), findsOneWidget);
  });
}
