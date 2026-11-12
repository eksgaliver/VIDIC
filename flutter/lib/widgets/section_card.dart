import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Kartu seksi beranda: judul, keterangan singkat, satu garis pemisah, lalu isi.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    required this.child,
    this.caption,
    this.trailing,
  });

  final String title;
  final Widget child;
  final String? caption;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppTheme.surface,
        borderRadius: BorderRadius.circular(AppTheme.radiusPanel),
        border: Border.all(color: AppTheme.line),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(title, style: AppTheme.sectionTitle),
                      if (caption != null)
                        Padding(
                          padding: const EdgeInsets.only(top: 2),
                          child: Text(caption!, style: AppTheme.meta),
                        ),
                    ],
                  ),
                ),
                ?trailing,
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
            child: child,
          ),
        ],
      ),
    );
  }
}

/// Label status kecil berwarna. Warnanya berasal dari data, bukan dari tema.
class StatusChip extends StatelessWidget {
  const StatusChip({
    super.key,
    required this.label,
    required this.foreground,
    required this.background,
    this.border,
  });

  final String label;
  final Color foreground;
  final Color background;
  final Color? border;

  factory StatusChip.tone(StatusTone tone, String label) {
    switch (tone) {
      case StatusTone.success:
        return StatusChip(
          label: label,
          foreground: AppTheme.success,
          background: AppTheme.successSubtle,
        );
      case StatusTone.warning:
        return StatusChip(
          label: label,
          foreground: AppTheme.warning,
          background: AppTheme.warningSubtle,
        );
      case StatusTone.danger:
        return StatusChip(
          label: label,
          foreground: AppTheme.danger,
          background: AppTheme.dangerSubtle,
        );
      case StatusTone.accent:
        return StatusChip(
          label: label,
          foreground: AppTheme.primary,
          background: AppTheme.primarySubtle,
        );
      case StatusTone.neutral:
        return StatusChip(
          label: label,
          foreground: AppTheme.ink2,
          background: AppTheme.surface2,
        );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border ?? Colors.transparent),
      ),
      child: Text(
        label,
        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: foreground),
      ),
    );
  }
}

enum StatusTone { success, warning, danger, accent, neutral }

/// Baris label-nilai untuk data ringkas.
class MetaRow extends StatelessWidget {
  const MetaRow({super.key, required this.label, required this.value, this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: AppTheme.meta),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w500, color: valueColor ?? AppTheme.ink),
        ),
      ],
    );
  }
}