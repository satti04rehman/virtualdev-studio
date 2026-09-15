import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import '../models/task.dart';
import '../services/api_service.dart';
import '../widgets/status_card.dart';

class TaskDetailScreen extends StatefulWidget {
  final String projectId;
  final Task task;

  const TaskDetailScreen({
    super.key,
    required this.projectId,
    required this.task,
  });

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  List<TaskRun>? _runs;
  bool _loadingRuns = true;
  String? _runsError;

  @override
  void initState() {
    super.initState();
    _loadRuns();
  }

  Future<void> _loadRuns() async {
    setState(() {
      _loadingRuns = true;
      _runsError = null;
    });

    try {
      final runs = await context.read<ApiService>().getTaskRuns(widget.projectId, widget.task.id);
      setState(() {
        _runs = runs;
        _loadingRuns = false;
      });
    } catch (e) {
      setState(() {
        _runsError = e is ApiException ? e.message : 'Failed to load logs';
        _loadingRuns = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final task = widget.task;
    final statusColor = colorForStatus(task.status);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F23),
        elevation: 0,
        title: const Text(
          'Task Details',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white54, size: 20),
            onPressed: _loadRuns,
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: const Color(0xFF1A1A2E),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: statusColor.withOpacity(0.2)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(
                      task.isPendingApproval
                          ? Icons.approval
                          : task.isFailed
                              ? Icons.error_outline
                              : task.isCompleted
                                  ? Icons.check_circle
                                  : Icons.play_circle_outline,
                      color: statusColor,
                      size: 22,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        task.displayTitle,
                        style: theme.textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _detailChip('Status', statusLabel(task.status), statusColor),
                    _detailChip('Stage', task.stageLabel, const Color(0xFF7C3AE0)),
                    _detailChip('Priority', 'P${task.priority}', Colors.white54),
                    if (task.requiresApproval)
                      _detailChip('Approval', 'Required', const Color(0xFFFFC107)),
                  ],
                ),
                if (task.description != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    task.description!,
                    style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white54),
                  ),
                ],
                const SizedBox(height: 12),
                _timeInfo('Created', task.createdAt),
                if (task.startedAt != null) _timeInfo('Started', task.startedAt),
                if (task.completedAt != null) _timeInfo('Completed', task.completedAt),
              ],
            ),
          ),
          if (task.errorMessage != null) ...[
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFE53935).withOpacity(0.08),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: const Color(0xFFE53935).withOpacity(0.3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.error_outline, color: Color(0xFFE53935), size: 16),
                      SizedBox(width: 6),
                      Text(
                        'Error',
                        style: TextStyle(
                          color: Color(0xFFE53935),
                          fontWeight: FontWeight.w600,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(
                    task.errorMessage!,
                    style: const TextStyle(color: Colors.white54, fontSize: 13),
                  ),
                ],
              ),
            ),
          ],
          if (task.outputData != null && task.outputData!.isNotEmpty) ...[
            const SizedBox(height: 16),
            _buildOutputSection(theme, task.outputData!),
          ],
          const SizedBox(height: 24),
          Row(
            children: [
              const Text(
                'EXECUTION LOGS',
                style: TextStyle(
                  color: Colors.white38,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
              ),
              const SizedBox(width: 8),
              if (_runs != null)
                Text(
                  '(${_runs!.length})',
                  style: const TextStyle(color: Colors.white38, fontSize: 12),
                ),
            ],
          ),
          const SizedBox(height: 10),
          _buildRunsSection(theme),
        ],
      ),
    );
  }

  Widget _buildOutputSection(ThemeData theme, Map<String, dynamic> data) {
    final prettyJson = const JsonEncoder.withIndent('  ').convert(data);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.output, color: Colors.white38, size: 16),
              const SizedBox(width: 6),
              const Text(
                'Output',
                style: TextStyle(
                  color: Colors.white54,
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
              ),
              const Spacer(),
              IconButton(
                icon: const Icon(Icons.copy, color: Colors.white38, size: 16),
                padding: EdgeInsets.zero,
                constraints: const BoxConstraints(),
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: prettyJson));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Output copied to clipboard'),
                      duration: Duration(seconds: 1),
                    ),
                  );
                },
              ),
            ],
          ),
          const SizedBox(height: 10),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.4),
              borderRadius: BorderRadius.circular(8),
            ),
            child: SelectableText(
              prettyJson,
              style: const TextStyle(
                color: Colors.white70,
                fontSize: 12,
                fontFamily: 'monospace',
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRunsSection(ThemeData theme) {
    if (_loadingRuns) {
      return const Padding(
        padding: EdgeInsets.all(24),
        child: Center(
          child: CircularProgressIndicator(color: Color(0xFF00D4AA), strokeWidth: 2),
        ),
      );
    }

    if (_runsError != null) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Center(
          child: Text(_runsError!, style: const TextStyle(color: Colors.white38, fontSize: 13)),
        ),
      );
    }

    if (_runs == null || _runs!.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.03),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(
          child: Text(
            'No execution logs yet',
            style: TextStyle(color: Colors.white38, fontSize: 13),
          ),
        ),
      );
    }

    return Column(
      children: _runs!.map((run) => _RunTile(run: run)).toList(),
    );
  }

  Widget _detailChip(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(
            '$label: ',
            style: const TextStyle(color: Colors.white38, fontSize: 11),
          ),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _timeInfo(String label, DateTime? time) {
    if (time == null) return const SizedBox.shrink();
    final h = time.hour.toString().padLeft(2, '0');
    final m = time.minute.toString().padLeft(2, '0');
    final s = time.second.toString().padLeft(2, '0');
    return Padding(
      padding: const EdgeInsets.only(top: 6),
      child: Row(
        children: [
          Icon(Icons.access_time, size: 12, color: Colors.white38),
          const SizedBox(width: 4),
          Text(
            '$label: ${time.day}/${time.month}/${time.year} $h:$m:$s',
            style: const TextStyle(color: Colors.white38, fontSize: 11),
          ),
        ],
      ),
    );
  }
}

class _RunTile extends StatelessWidget {
  final TaskRun run;

  const _RunTile({required this.run});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isCompleted = run.status == 'completed';
    final isRunning = run.status == 'running';

    final color = isCompleted
        ? const Color(0xFF00D4AA)
        : isRunning
            ? const Color(0xFF7C3AE0)
            : const Color(0xFFE53935);

    return Card(
      color: theme.colorScheme.surface,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: color.withOpacity(0.15)),
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  isCompleted ? Icons.check_circle : Icons.circle_outlined,
                  color: color,
                  size: 16,
                ),
                const SizedBox(width: 8),
                Text(
                  statusLabel(run.status ?? 'unknown'),
                  style: TextStyle(
                    color: color,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
                const Spacer(),
                if (run.durationMs != null)
                  Text(
                    '${run.durationMs}ms',
                    style: const TextStyle(color: Colors.white38, fontSize: 11),
                  ),
              ],
            ),
            if (run.outputData != null) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.black.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: SelectableText(
                  const JsonEncoder.withIndent('  ').convert(run.outputData),
                  style: const TextStyle(
                    color: Colors.white54,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    height: 1.4,
                  ),
                ),
              ),
            ],
            if (run.errorMessage != null) ...[
              const SizedBox(height: 8),
              Text(
                run.errorMessage!,
                style: const TextStyle(color: Color(0xFFE53935), fontSize: 12),
              ),
            ],
            if (run.tokensUsed != null) ...[
              const SizedBox(height: 6),
              Text(
                '${run.tokensUsed} tokens used',
                style: const TextStyle(color: Colors.white24, fontSize: 10),
              ),
            ],
          ],
        ),
      ),
    );
  }
}