import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:srikaya_auth/core/api_client.dart';
import 'package:srikaya_auth/models/home_data.dart';
import 'package:srikaya_auth/screens/home_screen.dart';
import 'package:srikaya_auth/theme/app_theme.dart';

class _FakeRepository implements HomeRepository {
  _FakeRepository(this._loader);

  final Future<HomeData> Function() _loader;
  int calls = 0;

  @override
  Future<HomeData> load() {
    calls += 1;
    return _loader();
  }
}

HomeData _homeData() {
  return HomeData(
    profile: const EmployeeProfile(
      name: 'Budi Santoso',
      email: 'budi.santoso@srikaya.id',
      position: 'Staff Rekayasa Perangkat Lunak',
      department: 'Teknologi Informasi & Rekayasa',
      company: 'PT Srikaya Digital Solusindo',
    ),
    attendance: AttendanceToday(
      date: DateTime(2026, 11, 12),
      timezone: 'Asia/Jakarta',
      isOff: false,
      lateMinutes: 0,
      workMinutes: 0,
      canClockIn: true,
      canClockOut: false,
      locations: const ['KANTOR PUSAT, Kota Pekanbaru'],
      shiftName: 'STAFF',
      shiftCode: 'STAFF-PAGI',
      dayName: 'Kamis',
      startTime: '08:00:00',
      endTime: '17:00:00',
    ),
    kpi: const KpiSummary(
      periodName: 'Kuartal I 2026',
      score: 0,
      totalWeight: 100,
      indicators: [
        KpiIndicator(
          title: 'Ketuntasan Tiket & Sprint Backlog',
          category: 'operational',
          unit: 'tiket',
          target: 100,
          actual: 0,
          weight: 30,
          achievement: 0,
        ),
      ],
    ),
    announcements: [
      Announcement(
        id: 'post-1',
        title: 'Pengumuman Kalender Kerja 2026',
        content: 'Manajemen merilis kalender operasional resmi untuk tahun 2026.',
        category: 'announcement',
        categoryLabel: 'Pengumuman Resmi',
        createdAt: DateTime(2026, 11, 11),
        authorName: 'Departemen HR',
      ),
    ],
    loadedAt: DateTime(2026, 11, 12, 8, 30),
  );
}

Widget _wrap(HomeRepository repository) {
  return MaterialApp(
    theme: AppTheme.light,
    home: HomeScreen(repository: repository),
  );
}

/// Beranda memang lebih panjang dari layar uji bawaan (800x600), jadi setiap
/// pengujian memakai kanvas setinggi ponsel agar seluruh seksi ikut dibangun.
void _useTallSurface(WidgetTester tester) {
  tester.view.physicalSize = const Size(420, 1600);
  tester.view.devicePixelRatio = 1.0;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  testWidgets('beranda memuat data pengguna, presensi, KPI, dan kabar', (tester) async {
    _useTallSurface(tester);
    final repository = _FakeRepository(() async => _homeData());

    await tester.pumpWidget(_wrap(repository));

    expect(find.text('Memuat beranda'), findsOneWidget);

    await tester.pumpAndSettle();

    expect(find.text('Budi Santoso'), findsOneWidget);
    expect(find.text('PT Srikaya Digital Solusindo'), findsOneWidget);
    expect(find.text('Presensi hari ini'), findsOneWidget);
    expect(find.text('STAFF'), findsOneWidget);
    expect(find.text('Belum presensi'), findsOneWidget);
    expect(find.text('Capaian KPI'), findsOneWidget);
    expect(find.text('Kuartal I 2026'), findsOneWidget);
    expect(find.text('Pengumuman Kalender Kerja 2026'), findsOneWidget);
  });

  testWidgets('kegagalan memuat menampilkan pesan dan tombol coba lagi', (tester) async {
    _useTallSurface(tester);
    final repository = _FakeRepository(
      () async => throw ApiException('Tidak dapat menghubungi gateway di http://localhost:3000.'),
    );

    await tester.pumpWidget(_wrap(repository));
    await tester.pumpAndSettle();

    expect(find.text('Beranda tidak dapat dimuat'), findsOneWidget);
    expect(
      find.text('Tidak dapat menghubungi gateway di http://localhost:3000.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Coba lagi'));
    await tester.pumpAndSettle();

    expect(repository.calls, 2);
    expect(find.text('Beranda tidak dapat dimuat'), findsOneWidget);
  });

  testWidgets('kabar dibuka pada lembar bawah dengan isi lengkap', (tester) async {
    _useTallSurface(tester);
    final repository = _FakeRepository(() async => _homeData());

    await tester.pumpWidget(_wrap(repository));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Pengumuman Kalender Kerja 2026'));
    await tester.pumpAndSettle();

    expect(
      find.text('Manajemen merilis kalender operasional resmi untuk tahun 2026.'),
      findsNWidgets(2),
    );
    expect(find.text('Tutup'), findsOneWidget);
  });
}