import 'package:flutter/material.dart';

import '../models/project.dart';
import 'status_card.dart';

class StageTimeline extends StatelessWidget {
  final List<ProjectStage> stages;

  const StageTimeline({super.key, required this.stages});

  @override
  Widget build(BuildContext context) {
    if (stages.isEmpty) {
      return const Padding(
        padding: EdgeInsets.symmetric(horizontal: 16, vertical: 32),
        child: Center(
          child: Text(
            'No stages available',
            style: TextStyle(color: Colors.white38, fontSize: 14),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Column(
        children: List.generate(stages.length * 2 - 1, (index) {
          if (index.isOdd) {
            final stageIndex = index ~/ 2;
            final stage = stages[stageIndex];
            final nextStage = stageIndex < stages.length - 1 ? stages[stageIndex + 1] : null;
            final isActive = stage.isInProgress ||
                (stage.isCompleted && nextStage != null && !nextStage.isCompleted);
            return _ConnectorLine(
              isActive: isActive,
              isCompleted: stage.isCompleted,
            );
          }
          return _StageTile(
            stage: stages[index ~/ 2],
            isFirst: index == 0,
            isLast: index ~/ 2 == stages.length - 1,
          );
        }),
      ),
    );
  }
}

class _StageTile extends StatelessWidget {
  final ProjectStage stage;
  final bool isFirst;
  final bool isLast;

  const _StageTile({
    required this.stage,
    required this.isFirst,
    required this.isLast,
  });

  IconData _iconForStatus() {
    if (stage.isCompleted) return Icons.check_circle;
    if (stage.isInProgress) return Icons.radio_button_checked;
    if (stage.isWaitingApproval) return Icons.hourglass_top_rounded;
    if (stage.status == 'failed') return Icons.cancel;
    return Icons.circle_outlined;
  }

  Color _colorForStatus() => colorForStatus(stage.status);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _colorForStatus();

    return Padding(
      padding: EdgeInsets.only(
        left: 4,
        top: isFirst ? 4 : 0,
        bottom: isLast ? 4 : 0,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 36,
            child: Column(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: color.withOpacity(0.15),
                    border: Border.all(
                      color: color,
                      width: 2,
                    ),
                  ),
                  child: Icon(_iconForStatus(), color: color, size: 18),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              decoration: BoxDecoration(
                color: stage.isInProgress
                    ? color.withOpacity(0.08)
                    : stage.isCompleted
                        ? color.withOpacity(0.04)
                        : const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(
                  color: stage.isInProgress
                      ? color.withOpacity(0.3)
                      : Colors.white.withOpacity(0.06),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          stage.label,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: stage.isInProgress || stage.isCompleted
                                ? FontWeight.w600
                                : FontWeight.w400,
                          ),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          statusLabel(stage.status),
                          style: TextStyle(
                            color: color,
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (stage.startedAt != null) ...[
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Icon(Icons.access_time, size: 12, color: Colors.white38),
                        const SizedBox(width: 4),
                        Text(
                          _formatTime(stage.startedAt!),
                          style: const TextStyle(color: Colors.white38, fontSize: 11),
                        ),
                        if (stage.completedAt != null) ...[
                          const SizedBox(width: 8),
                          const Text('→', style: TextStyle(color: Colors.white38, fontSize: 11)),
                          const SizedBox(width: 4),
                          Text(
                            _formatTime(stage.completedAt!),
                            style: const TextStyle(color: Colors.white38, fontSize: 11),
                          ),
                        ],
                      ],
                    ),
                  ],
                  if (stage.errorMessage != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFE53935).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.error_outline, size: 14, color: Color(0xFFE53935)),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              stage.errorMessage!,
                              style: const TextStyle(
                                color: Color(0xFFE53935),
                                fontSize: 12,
                              ),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime dt) {
    final h = dt.hour.toString().padLeft(2, '0');
    final m = dt.minute.toString().padLeft(2, '0');
    return '${dt.day}/${dt.month} $h:$m';
  }
}

class _ConnectorLine extends StatelessWidget {
  final bool isActive;
  final bool isCompleted;

  const _ConnectorLine({required this.isActive, required this.isCompleted});

  @override
  Widget build(BuildContext context) {
    final color = isCompleted
        ? const Color(0xFF00D4AA)
        : isActive
            ? const Color(0xFF7C3AE0)
            : Colors.white12;

    return Row(
      children: [
        SizedBox(
          width: 36,
          child: Center(
            child: Container(
              width: 2,
              height: 20,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [color, color.withOpacity(0.3)],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
              ),
            ),
          ),
        ),
        const Expanded(child: SizedBox.shrink()),
      ],
    );
  }
}