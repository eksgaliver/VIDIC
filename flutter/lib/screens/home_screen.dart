import 'package:flutter/material.dart';

import '../core/api_client.dart';
import '../core/app_config.dart';
import '../core/format.dart';
import '../models/home_data.dart';
import '../theme/app_theme.dart';
import '../widgets/announcement_section.dart';
import '../widgets/attendance_card.dart';
import '../widgets/kpi_card.dart';
import '../widgets/section_card.dart';

/// Sumber data beranda. Dipisah dari widget agar dapat diuji tanpa jaringan.
abstract class HomeRepository {
  Future<HomeData> load();
}

/// Membaca beranda langsung dari gateway Bun memakai sesi akun uji.
class ApiHomeRepository implements HomeRepository {
  ApiHomeRepository({ApiClient? client}) : _client = client ?? ApiClient();

  final ApiClient _client;

  @override
  Future<HomeData> load() async {
    final user = _client.profile ?? await _client.signIn();
    final companyId = user['companyId']?.toString() ?? '';

    final todayRaw = await _client.get('/api/shifting/attendance/today');
    final kpiRaw = await _readObject('/api/kpi/my-score');
    final announcements = await _readAnnouncements(companyId);

    final employee = kpiRaw == null
        ? const <String, dynamic>{}
        : (kpiRaw['employee'] as Map<String, dynamic>? ?? const <String, dynamic>{});

    final profile = EmployeeProfile(
      name: user['name']?.toString() ?? 'Pengguna',
      email: user['email']?.toString() ?? '',
      position: employee['position']?.toString() ??
          (user['role']?.toString() == 'admin' ? 'Administrator' : 'Karyawan'),
      department: employee['departmentName']?.toString() ?? 'Tanpa departemen',
      company: user['companyName']?.toString() ?? 'Perusahaan',
    );

    return HomeData(
      profile: profile,
      attendance: AttendanceToday.fromJson(
        todayRaw is Map<String, dynamic> ? todayRaw : const <String, dynamic>{},
      ),
      kpi: kpiRaw == null ? null : KpiSummary.fromJson(kpiRaw),
      announcements: announcements,
      loadedAt: DateTime.now(),
    );
  }

  /// Seksi opsional: bila gagal, beranda tetap tampil tanpa seksi tersebut.
  Future<Map<String, dynamic>?> _readObject(String path) async {
    try {
      final data = await _client.get(path);
      return data is Map<String, dynamic> ? data : null;
    } on ApiException {
      return null;
    }
  }

  Future<List<Announcement>> _readAnnouncements(String companyId) async {
    try {
      final data = await _client.get(
        '/api/posts',
        query: companyId.isEmpty ? null : {'companyId': companyId},
      );
      if (data is! List) return const [];

      return data
          .whereType<Map<String, dynamic>>()
          .take(3)
          .map(Announcement.fromJson)
          .toList();
    } on ApiException {
      return const [];
    }
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key, this.repository});

  final HomeRepository? repository;

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  late final HomeRepository _repository = widget.repository ?? ApiHomeRepository();
  late Future<HomeData> _future = _repository.load();

  Future<void> _reload() async {
    final future = _repository.load();
    setState(() {
      _future = future;
    });
    try {
      await future;
    } catch (_) {
      // Kegagalan ditampilkan oleh FutureBuilder, bukan dilempar ke pemanggil.
    }
  }

  void _openAnnouncement(Announcement item) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (_) => AnnouncementDetail(item: item),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        bottom: false,
        child: RefreshIndicator(
          onRefresh: _reload,
          color: AppTheme.primary,
          backgroundColor: AppTheme.surface,
          child: FutureBuilder<HomeData>(
            future: _future,
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const _CenteredScrollable(child: _LoadingState());
              }

              if (snapshot.hasError) {
                final error = snapshot.error;
                return _CenteredScrollable(
                  child: _ErrorState(
                    message: error is ApiException
                        ? error.message
                        : 'Terjadi kesalahan yang tidak dikenali.',
                    onRetry: _reload,
                  ),
                );
              }

              final data = snapshot.data!;
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                children: [
                  _ProfileHeader(profile: data.profile),
                  const SizedBox(height: 18),
                  AttendanceCard(attendance: data.attendance),
                  const SizedBox(height: 14),
                  KpiCard(summary: data.kpi),
                  const SizedBox(height: 14),
                  AnnouncementSection(
                    items: data.announcements,
                    onOpen: _openAnnouncement,
                  ),
                  const SizedBox(height: 20),
                  Text(
                    'Diperbarui ${formatClock(data.loadedAt)} • ${AppConfig.gatewayBaseUrl}',
                    textAlign: TextAlign.center,
                    style: AppTheme.meta,
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.profile});

  final EmployeeProfile profile;

  String get _initials {
    final parts = profile.name.split(' ').where((part) => part.isNotEmpty).toList();
    if (parts.isEmpty) return 'SK';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts.first.substring(0, 1) + parts.last.substring(0, 1)).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              height: 46,
              width: 46,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppTheme.primarySubtle,
                shape: BoxShape.circle,
                border: Border.all(color: AppTheme.primaryLine),
              ),
              child: Text(
                _initials,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primary,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(greeting(now), style: AppTheme.meta),
                  const SizedBox(height: 2),
                  Text(
                    profile.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 20,
                      height: 1.2,
                      fontWeight: FontWeight.w600,
                      letterSpacing: -0.3,
                      color: AppTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    '${profile.position} • ${profile.department}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: AppTheme.meta,
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        Row(
          children: [
            StatusChip.tone(StatusTone.neutral, profile.company),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                formatLongDate(now),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: AppTheme.meta,
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class _LoadingState extends StatelessWidget {
  const _LoadingState();

  @override
  Widget build(BuildContext context) {
    return const Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 22,
          width: 22,
          child: CircularProgressIndicator(strokeWidth: 2.2),
        ),
        SizedBox(height: 14),
        Text('Memuat beranda', style: AppTheme.sectionTitle),
        SizedBox(height: 4),
        Text('Menyiapkan sesi, presensi, dan capaian KPI Anda.', style: AppTheme.meta),
      ],
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusPanel),
        border: Border.all(color: AppTheme.line),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Beranda tidak dapat dimuat', style: AppTheme.sectionTitle),
          const SizedBox(height: 6),
          Text(message, style: AppTheme.meta),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: () => onRetry(),
              child: const Text('Coba lagi'),
            ),
          ),
        ],
      ),
    );
  }
}

/// Membuat keadaan kosong tetap dapat ditarik untuk menyegarkan.
class _CenteredScrollable extends StatelessWidget {
  const _CenteredScrollable({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        return SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: ConstrainedBox(
            constraints: BoxConstraints(minHeight: constraints.maxHeight),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Center(child: child),
            ),
          ),
        );
      },
    );
  }
}