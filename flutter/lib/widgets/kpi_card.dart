import 'package:flutter/material.dart';

import '../core/format.dart';
import '../models/home_data.dart';
import '../theme/app_theme.dart';
import 'section_card.dart';

/// Lembar KPI pribadi: skor akhir periode aktif dan butir sasarannya.
class KpiCard extends StatelessWidget {
  const KpiCard({super.key, required this.summary});

  final KpiSummary? summary;

  @override
  Widget build(BuildContext context) {
    final data = summary;

    if (data == null) {
      return const SectionCard(
        title: 'Capaian KPI',
        child: Text(
          'Belum ada lembar evaluasi KPI untuk akun ini pada periode aktif.',
          style: AppTheme.meta,
        ),
      );
    }

    return SectionCard(
      title: 'Capaian KPI',
      caption: data.periodName,
      trailing: data.grade == null
          ? StatusChip.tone(StatusTone.neutral, 'Belum dinilai')
          : StatusChip.tone(StatusTone.success, 'Predikat ${data.grade}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatNumber(data.score),
                style: const TextStyle(
                  fontSize: 28,
                  height: 1,
                  fontWeight: FontWeight.w600,
                  letterSpacing: -0.6,
                  color: AppTheme.ink,
                ),
              ),
              const SizedBox(width: 6),
              Padding(
                padding: const EdgeInsets.only(bottom: 3),
                child: Text('dari 100', style: AppTheme.meta),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: (data.score / 100).clamp(0, 1),
              minHeight: 6,
              backgroundColor: AppTheme.surface3,
              valueColor: const AlwaysStoppedAnimation<Color>(AppTheme.primary),
            ),
          ),
          const SizedBox(height: 14),
          if (data.indicators.isEmpty)
            const Text(
              'Divisi ini belum memiliki indikator sasaran.',
              style: AppTheme.meta,
            )
          else
            for (var index = 0; index < data.indicators.length; index++) ...[
              if (index > 0) const Divider(height: 22),
              _IndicatorRow(indicator: data.indicators[index]),
            ],
        ],
      ),
    );
  }
}

class _IndicatorRow extends StatelessWidget {
  const _IndicatorRow({required this.indicator});

  final KpiIndicator indicator;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Text(
                indicator.title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.ink,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Text(
              '${formatNumber(indicator.achievement)}%',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: indicator.achievement > 0
                    ? AppTheme.primary
                    : AppTheme.ink3,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        Text(
          'Realisasi ${formatNumber(indicator.actual)} dari ${formatNumber(indicator.target)} ${indicator.unit} • bobot ${formatNumber(indicator.weight)}%',
          style: AppTheme.meta,
        ),
      ],
    );
  }
}
