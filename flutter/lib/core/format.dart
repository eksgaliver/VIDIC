const List<String> _dayNames = [
  'Senin',
  'Selasa',
  'Rabu',
  'Kamis',
  'Jumat',
  'Sabtu',
  'Minggu',
];

const List<String> _monthNames = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

String _two(int value) => value.toString().padLeft(2, '0');

/// "Kamis, 12 November 2026"
String formatLongDate(DateTime date) {
  final day = _dayNames[(date.weekday - 1).clamp(0, 6)];
  return '$day, ${date.day} ${_monthNames[date.month - 1]} ${date.year}';
}

/// "12 Nov 2026"
String formatShortDate(DateTime date) {
  final month = _monthNames[date.month - 1];
  return '${date.day} ${month.substring(0, 3)} ${date.year}';
}

/// "08:12"
String formatClock(DateTime? time, {String fallback = '-'}) {
  if (time == null) return fallback;
  return '${_two(time.hour)}:${_two(time.minute)}';
}

/// "08:00 – 17:00"
String formatScheduleRange(String? start, String? end) {
  if (start == null && end == null) return 'Tidak ada jadwal';
  return '${_clockFromServer(start)} – ${_clockFromServer(end)}';
}

String _clockFromServer(String? value) {
  if (value == null || value.isEmpty) return '-';
  return value.length >= 5 ? value.substring(0, 5) : value;
}

/// "1j 45m", atau "-" bila belum ada durasi.
String formatDuration(int minutes) {
  if (minutes <= 0) return '-';
  final hours = minutes ~/ 60;
  final rest = minutes % 60;
  if (hours == 0) return '${rest}m';
  if (rest == 0) return '${hours}j';
  return '${hours}j ${rest}m';
}

/// Angka dengan pemisah desimal Indonesia: 0 -> "0", 99.8 -> "99,8".
String formatNumber(double value, {int decimals = 2}) {
  final rounded = value.toStringAsFixed(decimals);
  final trimmed = rounded
      .replaceAll(RegExp(r'0+$'), '')
      .replaceAll(RegExp(r'\.$'), '');
  return trimmed.replaceAll('.', ',');
}

String formatRelative(DateTime? time) {
  if (time == null) return 'Tanpa tanggal';

  final diff = DateTime.now().difference(time);
  if (diff.inMinutes < 1) return 'Baru saja';
  if (diff.inMinutes < 60) return '${diff.inMinutes} menit lalu';
  if (diff.inHours < 24) return '${diff.inHours} jam lalu';
  if (diff.inDays < 7) return '${diff.inDays} hari lalu';
  return formatShortDate(time);
}

/// Label zona waktu Indonesia dari nama IANA pada basis data.
String timezoneLabel(String iana) {
  switch (iana) {
    case 'Asia/Jakarta':
    case 'Asia/Pontianak':
      return 'WIB';
    case 'Asia/Makassar':
      return 'WITA';
    case 'Asia/Jayapura':
      return 'WIT';
    default:
      return iana;
  }
}

/// Sapaan menurut jam pada perangkat.
String greeting(DateTime time) {
  final hour = time.hour;
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 19) return 'Selamat sore';
  return 'Selamat malam';
}