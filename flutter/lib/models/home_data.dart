String? _text(dynamic value) {
  if (value == null) return null;
  final text = value.toString().trim();
  return text.isEmpty ? null : text;
}

double _number(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString() ?? '') ?? 0;
}

int _integer(dynamic value) {
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}

DateTime? _moment(dynamic value) {
  final raw = _text(value);
  if (raw == null) return null;
  return DateTime.tryParse(raw)?.toLocal();
}

Map<String, dynamic> _object(dynamic value) =>
    value is Map<String, dynamic> ? value : const <String, dynamic>{};

/// Identitas yang tampil di kepala beranda.
class EmployeeProfile {
  const EmployeeProfile({
    required this.name,
    required this.email,
    required this.position,
    required this.department,
    required this.company,
  });

  final String name;
  final String email;
  final String position;
  final String department;
  final String company;
}

/// Ringkasan presensi satu hari, termasuk jadwal shift dan titik geofence.
class AttendanceToday {
  const AttendanceToday({
    required this.date,
    required this.timezone,
    required this.isOff,
    required this.lateMinutes,
    required this.workMinutes,
    required this.canClockIn,
    required this.canClockOut,
    required this.locations,
    this.shiftName,
    this.shiftCode,
    this.dayName,
    this.startTime,
    this.endTime,
    this.checkInAt,
    this.checkOutAt,
    this.statusName,
    this.statusColor,
  });

  final DateTime date;
  final String timezone;
  final bool isOff;
  final int lateMinutes;
  final int workMinutes;
  final bool canClockIn;
  final bool canClockOut;
  final List<String> locations;
  final String? shiftName;
  final String? shiftCode;
  final String? dayName;
  final String? startTime;
  final String? endTime;
  final DateTime? checkInAt;
  final DateTime? checkOutAt;
  final String? statusName;
  final String? statusColor;

  bool get hasShift => shiftName != null;
  bool get hasCheckedIn => checkInAt != null;
  bool get hasCheckedOut => checkOutAt != null;

  factory AttendanceToday.fromJson(Map<String, dynamic> json) {
    final shift = _object(json['shift']);
    final schedule = _object(json['schedule']);
    final row = json['row'] == null ? const <String, dynamic>{} : _object(json['row']);
    final status = _object(row['status']);

    return AttendanceToday(
      date: _moment(json['date']) ?? DateTime.now(),
      timezone: _text(json['timezone']) ?? 'Asia/Jakarta',
      isOff: schedule['isOff'] == true,
      lateMinutes: _integer(row['lateMinutes']),
      workMinutes: _integer(row['workMinutes']),
      canClockIn: json['canClockIn'] == true,
      canClockOut: json['canClockOut'] == true,
      locations: (json['locations'] as List<dynamic>? ?? const [])
          .map((item) => _object(item))
          .map((item) => [_text(item['name']), _text(item['city'])].whereType<String>().join(', '))
          .where((label) => label.isNotEmpty)
          .toList(),
      shiftName: _text(shift['name']),
      shiftCode: _text(shift['code']),
      dayName: _text(schedule['dayName']),
      startTime: _text(schedule['startTime']),
      endTime: _text(schedule['endTime']),
      checkInAt: _moment(row['checkInAt']),
      checkOutAt: _moment(row['checkOutAt']),
      statusName: _text(status['name']),
      statusColor: _text(status['color']),
    );
  }
}

/// Satu butir sasaran pada lembar KPI karyawan.
class KpiIndicator {
  const KpiIndicator({
    required this.title,
    required this.category,
    required this.unit,
    required this.target,
    required this.actual,
    required this.weight,
    required this.achievement,
  });

  final String title;
  final String category;
  final String unit;
  final double target;
  final double actual;
  final double weight;
  final double achievement;

  factory KpiIndicator.fromJson(Map<String, dynamic> json) {
    return KpiIndicator(
      title: _text(json['title']) ?? 'Tanpa judul',
      category: _text(json['category']) ?? 'umum',
      unit: _text(json['measurementUnit']) ?? '-',
      target: _number(json['targetValue']),
      actual: _number(json['actualValue']),
      weight: _number(json['weight']),
      achievement: _number(json['achievementPercentage']),
    );
  }
}

/// Lembar KPI pribadi pada periode evaluasi yang sedang aktif.
class KpiSummary {
  const KpiSummary({
    required this.periodName,
    required this.score,
    required this.totalWeight,
    required this.indicators,
    this.grade,
  });

  final String periodName;
  final double score;
  final double totalWeight;
  final List<KpiIndicator> indicators;
  final String? grade;

  factory KpiSummary.fromJson(Map<String, dynamic> json) {
    final period = _object(json['period']);
    final assessment = _object(json['assessment']);

    return KpiSummary(
      periodName: _text(period['name']) ?? 'Periode aktif',
      score: _number(assessment['finalScore']),
      totalWeight: _number(assessment['totalWeight']),
      grade: _text(assessment['grade']),
      indicators: (json['items'] as List<dynamic>? ?? const [])
          .map((item) => KpiIndicator.fromJson(_object(item)))
          .toList(),
    );
  }
}

/// Satu kabar dari linimasa internal perusahaan.
class Announcement {
  const Announcement({
    required this.id,
    required this.title,
    required this.content,
    required this.category,
    required this.categoryLabel,
    this.createdAt,
    this.authorName,
  });

  final String id;
  final String title;
  final String content;
  final String category;
  final String categoryLabel;
  final DateTime? createdAt;
  final String? authorName;

  static const Map<String, String> categoryLabels = {
    'announcement': 'Pengumuman Resmi',
    'news': 'Berita Internal',
    'operational': 'Operasional',
    'achievement': 'Prestasi Tim',
    'general': 'Umum',
  };

  factory Announcement.fromJson(Map<String, dynamic> json) {
    final category = _text(json['category']) ?? 'general';
    final author = _object(json['author']);

    return Announcement(
      id: _text(json['id']) ?? '',
      title: _text(json['title']) ?? 'Tanpa judul',
      content: _text(json['content']) ?? '',
      category: category,
      categoryLabel: categoryLabels[category] ?? category,
      createdAt: _moment(json['createdAt']),
      authorName: _text(author['name']),
    );
  }
}

/// Seluruh isi beranda dalam satu muatan.
class HomeData {
  const HomeData({
    required this.profile,
    required this.attendance,
    required this.announcements,
    required this.loadedAt,
    this.kpi,
  });

  final EmployeeProfile profile;
  final AttendanceToday attendance;
  final List<Announcement> announcements;
  final DateTime loadedAt;
  final KpiSummary? kpi;
}