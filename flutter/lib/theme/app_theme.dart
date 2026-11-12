import 'package:flutter/material.dart';

/// Token visual yang sama dengan klien web, diterjemahkan ke ThemeData.
///
/// Catatan font: proyek ini belum menyertakan berkas Inter di `assets/fonts/`.
/// Setelah berkasnya ditambahkan, cukup daftarkan pada `pubspec.yaml` lalu isi
/// `fontFamily: 'Inter'` di sini agar tipografi web dan mobile identik.
class AppTheme {
  const AppTheme._();

  static const Color app = Color(0xFFF6F7F9);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surface2 = Color(0xFFF1F3F6);
  static const Color surface3 = Color(0xFFE8EBF0);
  static const Color line = Color(0xFFE2E5EA);
  static const Color lineStrong = Color(0xFFCFD5DE);

  static const Color ink = Color(0xFF111620);
  static const Color ink2 = Color(0xFF525C6B);
  static const Color ink3 = Color(0xFF6B7482);

  static const Color primary = Color(0xFF1668E5);
  static const Color primarySubtle = Color(0xFFEAF1FD);
  static const Color primaryLine = Color(0xFFC4DBF8);

  static const Color success = Color(0xFF0D7A4F);
  static const Color successSubtle = Color(0xFFE6F5ED);
  static const Color warning = Color(0xFF8F5A04);
  static const Color warningSubtle = Color(0xFFFBF2E0);
  static const Color danger = Color(0xFFC2271F);
  static const Color dangerSubtle = Color(0xFFFCECEB);

  static const double radiusPanel = 14;
  static const double radiusControl = 10;

  static const TextStyle pageTitle = TextStyle(
    fontSize: 24,
    height: 1.25,
    fontWeight: FontWeight.w600,
    letterSpacing: -0.4,
    color: ink,
  );

  static const TextStyle sectionTitle = TextStyle(
    fontSize: 15,
    height: 1.35,
    fontWeight: FontWeight.w600,
    color: ink,
  );

  static const TextStyle body = TextStyle(fontSize: 14, height: 1.5, color: ink);

  static const TextStyle meta = TextStyle(fontSize: 12, height: 1.5, color: ink3);

  static ThemeData get light {
    const textTheme = TextTheme(
      headlineSmall: pageTitle,
      titleLarge: TextStyle(
        fontSize: 18,
        height: 1.3,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: ink,
      ),
      titleMedium: sectionTitle,
      titleSmall: TextStyle(fontSize: 13, height: 1.4, fontWeight: FontWeight.w500, color: ink2),
      bodyLarge: TextStyle(fontSize: 15, height: 1.5, color: ink),
      bodyMedium: body,
      bodySmall: meta,
      labelLarge: TextStyle(fontSize: 14, height: 1.2, fontWeight: FontWeight.w500, color: ink),
      labelMedium: TextStyle(fontSize: 12, height: 1.2, fontWeight: FontWeight.w500, color: ink2),
      labelSmall: TextStyle(fontSize: 11, height: 1.2, fontWeight: FontWeight.w500, color: ink3),
    );

    return ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: app,
      colorScheme: const ColorScheme.light(
        primary: primary,
        onPrimary: Colors.white,
        surface: surface,
        onSurface: ink,
        error: danger,
        onError: Colors.white,
        outline: line,
        outlineVariant: lineStrong,
      ),
      textTheme: textTheme,
      dividerTheme: const DividerThemeData(color: line, thickness: 1, space: 1),
      splashFactory: InkSparkle.splashFactory,
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          backgroundColor: primary,
          foregroundColor: Colors.white,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusControl),
          ),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          minimumSize: const Size.fromHeight(48),
          foregroundColor: ink,
          side: const BorderSide(color: lineStrong),
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusControl),
          ),
        ),
      ),
      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: primary,
          textStyle: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
        ),
      ),
      snackBarTheme: const SnackBarThemeData(
        behavior: SnackBarBehavior.floating,
        backgroundColor: ink,
        contentTextStyle: TextStyle(fontSize: 13, color: Colors.white),
      ),
      bottomSheetTheme: const BottomSheetThemeData(
        backgroundColor: surface,
        surfaceTintColor: Colors.transparent,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
        ),
      ),
      progressIndicatorTheme: const ProgressIndicatorThemeData(color: primary),
    );
  }
}