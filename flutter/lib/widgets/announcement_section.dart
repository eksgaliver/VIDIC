import 'package:flutter/material.dart';

import '../core/format.dart';
import '../models/home_data.dart';
import '../theme/app_theme.dart';
import 'section_card.dart';

/// Kabar internal terbaru untuk beranda. Membuka satu kabar memanggil [onOpen].
class AnnouncementSection extends StatelessWidget {
  const AnnouncementSection({super.key, required this.items, required this.onOpen});

  final List<Announcement> items;
  final ValueChanged<Announcement> onOpen;

  @override
  Widget build(BuildContext context) {
    return SectionCard(
      title: 'Kabar & pengumuman',
      caption: items.isEmpty ? null : '${items.length} kabar terbaru dari perusahaan',
      child: items.isEmpty
          ? const Text('Belum ada kabar yang dibagikan.', style: AppTheme.meta)
          : Column(
              children: [
                for (var index = 0; index < items.length; index++) ...[
                  if (index > 0) const Divider(height: 20),
                  _AnnouncementTile(item: items[index], onTap: () => onOpen(items[index])),
                ],
              ],
            ),
    );
  }
}

class _AnnouncementTile extends StatelessWidget {
  const _AnnouncementTile({required this.item, required this.onTap});

  final Announcement item;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 2),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                StatusChip.tone(_tone(item.category), item.categoryLabel),
                const Spacer(),
                Text(formatRelative(item.createdAt), style: AppTheme.meta),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              item.title,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 14,
                height: 1.4,
                fontWeight: FontWeight.w500,
                color: AppTheme.ink,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              item.content.replaceAll('\n', ' '),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: AppTheme.meta,
            ),
          ],
        ),
      ),
    );
  }

  StatusTone _tone(String category) {
    switch (category) {
      case 'announcement':
        return StatusTone.accent;
      case 'achievement':
        return StatusTone.success;
      case 'operational':
        return StatusTone.warning;
      default:
        return StatusTone.neutral;
    }
  }
}

/// Isi lengkap satu kabar, ditampilkan dari bawah layar.
class AnnouncementDetail extends StatelessWidget {
  const AnnouncementDetail({super.key, required this.item});

  final Announcement item;

  @override
  Widget build(BuildContext context) {
    final media = MediaQuery.of(context);

    return Padding(
      padding: EdgeInsets.only(bottom: media.viewInsets.bottom),
      child: ConstrainedBox(
        constraints: BoxConstraints(maxHeight: media.size.height * 0.82),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      StatusChip.tone(StatusTone.accent, item.categoryLabel),
                      const Spacer(),
                      Text(formatRelative(item.createdAt), style: AppTheme.meta),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    item.title,
                    style: const TextStyle(
                      fontSize: 18,
                      height: 1.35,
                      fontWeight: FontWeight.w600,
                      color: AppTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    item.authorName == null ? 'Manajemen' : 'Dibagikan oleh ${item.authorName}',
                    style: AppTheme.meta,
                  ),
                  const SizedBox(height: 14),
                  const Divider(height: 1),
                ],
              ),
            ),
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 12),
                child: Text(item.content, style: AppTheme.body),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Tutup'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}