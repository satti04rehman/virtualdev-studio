import 'package:flutter/material.dart';

Color colorForStatus(String status) {
  switch (status.toLowerCase()) {
    case 'completed':
    case 'approved':
      return const Color(0xFF00D4AA);
    case 'in_progress':
    case 'running':
      return const Color(0xFF7C3AE0);
    case 'pending':
    case 'queued':
    case 'waiting_approval':
    case 'pending_approval':
      return const Color(0xFFFFC107);
    case 'failed':
    case 'rejected':
      return const Color(0xFFE53935);
    case 'decided':
      return const Color(0xFF42A5F5);
    case 'cancelled':
      return Colors.white54;
    default:
      return Colors.white54;
  }
}

String statusLabel(String status) {
  return status
      .split('_')
      .where((s) => s.isNotEmpty)
      .map((s) => s[0].toUpperCase() + s.substring(1))
      .join(' ');
}

class StatusCard extends StatelessWidget {
  final String title;
  final String status;
  final String? subtitle;
  final IconData? icon;
  final VoidCallback? onTap;
  final Widget? trailing;

  const StatusCard({
    super.key,
    required this.title,
    required this.status,
    this.subtitle,
    this.icon,
    this.onTap,
    this.trailing,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = colorForStatus(status);

    return Card(
      color: theme.colorScheme.surface,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: color.withOpacity(0.2), width: 1),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              if (icon != null) ...[
                Icon(icon, color: color, size: 22),
                const SizedBox(width: 12),
              ],
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (subtitle != null) ...[
                      const SizedBox(height: 4),
                      Text(
                        subtitle!,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.white54,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),
              if (trailing != null) trailing!,
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  statusLabel(status),
                  style: TextStyle(
                    color: color,
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}