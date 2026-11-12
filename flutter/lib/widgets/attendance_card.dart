import 'package:flutter/material.dart';

import '../core/format.dart';
import '../models/home_data.dart';
import '../theme/app_theme.dart';
import 'section_card.dart';

/// Ringkasan presensi hari ini beserta jadwal shift yang berlaku.
class AttendanceCard extends StatelessWidget {
  const AttendanceCard({super.key, required this.attendance});

  final AttendanceToday attendance;

  @override
  Widget build(BuildContext context) {
    final status = _status();
    final late = attendance.lateMinutes;

    return SectionCard(
      title: 'Presensi hari ini',
      caption: [
        attendance.dayName,
        timezoneLabel(attendance.timezone),
      ].whereType<String>().join(' • '),
      trailing: StatusChip.tone(status.tone, status.label),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      attendance.shiftName ?? 'Belum ada shift kerja',
                      style: const TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      attendance.hasShift
                          ? '${formatScheduleRange(attendance.startTime, attendance.endTime)} • ${attendance.shiftCode ?? '-'}'
                          : 'Hubungi HRD untuk penugasan shift.',
                      style: AppTheme.meta,
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: AppTheme.surface2,
              borderRadius: BorderRadius.circular(AppTheme.radiusControl),
            ),
            child: Row(
              children: [
                Expanded(
                  child: MetaRow(label: 'Masuk', value: formatClock(attendance.checkInAt)),
                ),
                Expanded(
                  child: MetaRow(label: 'Pulang', value: formatClock(attendance.checkOutAt)),
                ),
                Expanded(
                  child: late > 0
                      ? MetaRow(
                          label: 'Terlambat',
                          value: formatDuration(late),
                          valueColor: AppTheme.warning,
                        )
                      : MetaRow(
                          label: 'Durasi',
                          value: formatDuration(attendance.workMinutes),
                        ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text(
            attendance.locations.isEmpty
                ? 'Titik presensi belum diatur HRD.'
                : 'Titik presensi: ${attendance.locations.join(', ')}',
            style: AppTheme.meta,
          ),
          if (!attendance.hasCheckedIn && attendance.hasShift && !attendance.isOff) ...[
            const SizedBox(height: 8),
            Text(
              'Presensi masuk dan pulang diverifikasi memakai lokasi GPS perangkat.',
              style: AppTheme.meta,
            ),
          ],
        ],
      ),
    );
  }

  ({String label, StatusTone tone}) _status() {
    if (attendance.isOff) return (label: 'Hari libur', tone: StatusTone.neutral);
    if (!attendance.hasShift) return (label: 'Tanpa shift', tone: StatusTone.warning);
    if (attendance.hasCheckedOut) {
      return (label: attendance.statusName ?? 'Presensi lengkap', tone: StatusTone.success);
    }
    if (attendance.hasCheckedIn) {
      return (label: attendance.statusName ?? 'Sudah masuk', tone: StatusTone.accent);
    }
    return (label: 'Belum presensi', tone: StatusTone.warning);
  }
}