import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'welcome_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _authService = AuthService();
  Map<String, dynamic>? _tenantTestResult;
  bool _shiftCheckedIn = false;

  void _runTenantIsolationAudit(String targetCompanyId) {
    setState(() {
      _tenantTestResult = _authService.checkTenantAccess(
        targetCompanyId: targetCompanyId,
      );
    });
  }

  void _handleLogout() {
    _authService.logout();
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const WelcomeScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final session = _authService.currentSession;
    final userName = session?.name ?? 'Pengguna Uji Coba';
    final userRole = session?.role ?? 'STAFF';
    final companyName = session?.companyName ?? 'Perusahaan belum ditetapkan';
    final rawCompanyId = session?.companyId ?? '';
    final companyId = rawCompanyId.isEmpty
        ? 'tanpa perusahaan'
        : (rawCompanyId.length <= 8
            ? rawCompanyId
            : '${rawCompanyId.substring(0, 8)}...');

    // Tenant pembanding untuk menguji aturan isolasi antar-perusahaan.
    const foreignTenantId = 'cid-nusantara-02';
    const foreignTenantName = 'PT Nusantara Sakti';

    return Scaffold(
      backgroundColor: AppTheme.slate50,
      appBar: AppBar(
        title: const Text('Dasbor Srikaya'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, size: 20),
            tooltip: 'Keluar Akun',
            onPressed: _handleLogout,
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 480),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Banner Profil Pengguna
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.slate900,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppTheme.slate800,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                userRole,
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFF93C5FD),
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            Row(
                              children: [
                                Icon(
                                  Icons.fiber_manual_record_rounded,
                                  size: 10,
                                  color: _authService.isLiveSession
                                      ? AppTheme.emeraldGreen
                                      : AppTheme.slate400,
                                ),
                                const SizedBox(width: 6),
                                Text(
                                  _authService.isLiveSession
                                      ? 'Sesi Gateway'
                                      : 'Sesi Luring',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: Colors.white70,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                        const SizedBox(height: 14),
                        Text(
                          userName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: Colors.white,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$companyName • $companyId',
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(0xFFCBD5E1),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Card Shift Aktif
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.slate200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                'Shift Kerja Hari Ini',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.slate900,
                                ),
                              ),
                            ),
                            Text(
                              '08:00 – 17:00 WIB',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.slate500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: _shiftCheckedIn
                                    ? AppTheme.emeraldLight
                                    : AppTheme.slate100,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                _shiftCheckedIn
                                    ? Icons.check_circle_rounded
                                    : Icons.schedule_rounded,
                                color: _shiftCheckedIn
                                    ? AppTheme.emeraldGreen
                                    : AppTheme.slate600,
                                size: 22,
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _shiftCheckedIn
                                        ? 'Status: Sudah Masuk Presensi ✓'
                                        : 'Status: Ditugaskan (Menunggu Presensi)',
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w600,
                                      color: _shiftCheckedIn
                                          ? AppTheme.emeraldGreen
                                          : AppTheme.slate800,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    _shiftCheckedIn
                                        ? 'Jam tercatat: ${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')} WIB'
                                        : 'Shift Operasional Standar (Reguler)',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: AppTheme.slate500,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            style: OutlinedButton.styleFrom(
                              backgroundColor: _shiftCheckedIn
                                  ? AppTheme.emeraldLight
                                  : Colors.white,
                              side: BorderSide(
                                color: _shiftCheckedIn
                                    ? AppTheme.emeraldGreen
                                    : AppTheme.slate200,
                              ),
                            ),
                            onPressed: () {
                              setState(() {
                                _shiftCheckedIn = !_shiftCheckedIn;
                              });
                            },
                            child: Text(
                              _shiftCheckedIn
                                  ? 'Batalkan Presensi (Reset Uji Coba)'
                                  : 'Simulasikan Presensi Masuk Shift →',
                              style: TextStyle(
                                color: _shiftCheckedIn
                                    ? AppTheme.emeraldGreen
                                    : AppTheme.slate900,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Card Audit Isolasi Multi-Tenant
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.slate200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(
                              Icons.security_rounded,
                              size: 18,
                              color: AppTheme.primaryBlue,
                            ),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Uji Validasi Isolasi Multi-Tenant',
                                style: TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w700,
                                  color: AppTheme.slate900,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'Memverifikasi aturan: Perusahaan $companyName ($companyId) tidak boleh mengakses data $foreignTenantName ($foreignTenantId).',
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppTheme.slate600,
                            height: 1.4,
                          ),
                        ),
                        const SizedBox(height: 14),

                        // Tombol Tes 1: Coba Akses Perusahaan Lain (Harus Ditolak)
                        OutlinedButton(
                          onPressed: () => _runTenantIsolationAudit(foreignTenantId),
                          child: Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 6,
                            children: [
                              const Text('Uji Akses Data Tenant Lain'),
                              Text(
                                '($foreignTenantId)',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.slate500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 8),

                        // Tombol Tes 2: Akses Tenant Sendiri (Harus Berhasil)
                        OutlinedButton(
                          onPressed: () => _runTenantIsolationAudit(rawCompanyId),
                          child: Wrap(
                            alignment: WrapAlignment.center,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 6,
                            children: [
                              const Text('Uji Akses Data Tenant Sendiri'),
                              Text(
                                '($companyId)',
                                style: const TextStyle(
                                  fontSize: 11,
                                  color: AppTheme.slate500,
                                ),
                              ),
                            ],
                          ),
                        ),

                        // Hasil Uji Isolasi
                        if (_tenantTestResult != null) ...[
                          const SizedBox(height: 14),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: _tenantTestResult!['allowed'] == true
                                  ? AppTheme.emeraldLight
                                  : AppTheme.redLight,
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(
                                color: _tenantTestResult!['allowed'] == true
                                    ? const Color(0xFFA7F3D0)
                                    : const Color(0xFFFECACA),
                              ),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  _tenantTestResult!['allowed'] == true
                                      ? Icons.check_circle_rounded
                                      : Icons.cancel_rounded,
                                  size: 18,
                                  color: _tenantTestResult!['allowed'] == true
                                      ? AppTheme.emeraldGreen
                                      : AppTheme.redError,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _tenantTestResult!['allowed'] == true
                                            ? 'Verifikasi Lolos: Domain Sesuai'
                                            : 'Perlindungan Berhasil: Akses Diblokir',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w700,
                                          color: _tenantTestResult!['allowed'] == true
                                              ? AppTheme.emeraldGreen
                                              : AppTheme.redError,
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        _tenantTestResult!['message'] as String,
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: _tenantTestResult!['allowed'] == true
                                              ? const Color(0xFF065F46)
                                              : const Color(0xFF991B1B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Tombol Logout Bawah
                  ElevatedButton(
                    onPressed: _handleLogout,
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.logout_rounded, size: 16),
                        SizedBox(width: 8),
                        Text('Ganti Akun / Keluar'),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
