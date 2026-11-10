import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../theme/app_theme.dart';
import 'login_screen.dart';
import 'home_screen.dart';

class WelcomeScreen extends StatelessWidget {
  const WelcomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.slate50,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Lencana Status Testing
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                      decoration: BoxDecoration(
                        color: AppTheme.emeraldLight,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFA7F3D0)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            Icons.check_circle_rounded,
                            size: 14,
                            color: AppTheme.emeraldGreen,
                          ),
                          SizedBox(width: 6),
                          Text(
                            'Lingkungan Uji Coba Independen',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: AppTheme.emeraldGreen,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Brand Icon & Judul
                  Row(
                    children: [
                      Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AppTheme.slate900,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.grid_view_rounded,
                          color: Colors.white,
                          size: 28,
                        ),
                      ),
                      const SizedBox(width: 16),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'SRIKAYA',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 0.5,
                                color: AppTheme.slate900,
                              ),
                            ),
                            Text(
                              'Platform Manajemen Shift & Personalia',
                              style: TextStyle(
                                fontSize: 13,
                                color: AppTheme.slate600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Hero Card Sambutan
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppTheme.slate200),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Selamat Datang',
                              style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.slate900,
                            letterSpacing: -0.3,
                          ),
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          'Aplikasi mobile independen ini dirancang khusus untuk memvalidasi alur autentikasi, isolasi data multi-tenant, dan pengelolaan jadwal kerja.',
                          style: TextStyle(
                            fontSize: 14,
                            height: 1.5,
                            color: AppTheme.slate600,
                          ),
                        ),
                        const SizedBox(height: 20),
                        const Divider(height: 1, color: AppTheme.slate100),
                        const SizedBox(height: 16),

                        // Item Fitur Inti
                        _buildFeatureRow(
                          icon: Icons.shield_outlined,
                          title: 'Isolasi Multi-Tenant',
                          description: 'Perusahaan A tidak dapat mengakses data Perusahaan B.',
                        ),
                        const SizedBox(height: 14),
                        _buildFeatureRow(
                          icon: Icons.schedule_outlined,
                          title: 'Manajemen Shift & Tugas',
                          description: 'Penugasan jam kerja dinamis dengan status visual.',
                        ),
                        const SizedBox(height: 14),
                        _buildFeatureRow(
                          icon: Icons.offline_bolt_outlined,
                          title: 'Mandiri & Bebas Dependensi',
                          description: 'Dapat diuji langsung tanpa perlu menyalakan backend gateway.',
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Tombol Aksi Utama: Ke Layar Login
                  ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const LoginScreen(),
                        ),
                      );
                    },
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Masuk ke Akun'),
                        SizedBox(width: 8),
                        Text(
                          '→',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Tombol Aksi Kedua: Mode Tamu Langsung
                  OutlinedButton(
                    onPressed: () {
                      AuthService().loginAsGuest();
                      Navigator.pushReplacement(
                        context,
                        MaterialPageRoute(
                          builder: (context) => const HomeScreen(),
                        ),
                      );
                    },
                    child: const Text('Mulai Cepat (Mode Tamu / Sandbox)'),
                  ),
                  const SizedBox(height: 32),

                  // Catatan Footer
                  const Center(
                    child: Text(
                      'Srikaya Mobile Test Build • Versi 1.0.0 • 2026',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppTheme.slate400,
                      ),
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

  Widget _buildFeatureRow({
    required IconData icon,
    required String title,
    required String description,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppTheme.slate100,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: AppTheme.slate700),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.slate800,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                description,
                style: const TextStyle(
                  fontSize: 12,
                  color: AppTheme.slate500,
                  height: 1.3,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
