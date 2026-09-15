import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/project.dart';
import '../providers/project_provider.dart';
import '../widgets/stage_timeline.dart';
import '../widgets/status_card.dart';

class ProjectDetailScreen extends StatefulWidget {
  final Project project;

  const ProjectDetailScreen({super.key, required this.project});

  @override
  State<ProjectDetailScreen> createState() => _ProjectDetailScreenState();
}

class _ProjectDetailScreenState extends State<ProjectDetailScreen> {
  late final ProjectProvider _provider;

  @override
  void initState() {
    super.initState();
    _provider = context.read<ProjectProvider>();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _provider.loadProjectDetail(widget.project.id);
      _provider.connectToProject(widget.project.id);
    });
  }

  @override
  void dispose() {
    _provider.disconnectFromProject();
    super.dispose();
  }

  void _startOrchestration() async {
    final provider = context.read<ProjectProvider>();
    try {
      await provider.startOrchestration(widget.project.id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Orchestration started successfully'),
          backgroundColor: Color(0xFF00D4AA),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to start: ${e is Exception ? e : e}'),
          backgroundColor: const Color(0xFFE53935),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<ProjectProvider>();
    final project = provider.selectedProject ?? widget.project;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F23),
        elevation: 0,
        title: Text(
          project.name,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        actions: [
          if (provider.pendingApprovalsCount > 0)
            Badge(
              label: Text('${provider.pendingApprovalsCount}'),
              backgroundColor: const Color(0xFFFFC107),
              textColor: Colors.black,
              child: IconButton(
                icon: const Icon(Icons.approval, color: Colors.white54, size: 20),
                onPressed: () => Navigator.of(context).pushNamed(
                  '/approvals',
                  arguments: project.id,
                ),
              ),
            ),
          IconButton(
            icon: const Icon(Icons.people_outline, color: Colors.white54, size: 20),
            onPressed: () => Navigator.of(context).pushNamed(
              '/agents',
              arguments: project.id,
            ),
          ),
        ],
      ),
      body: provider.loadingDetail && provider.selectedProject == null
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF00D4AA)))
          : _buildContent(theme, provider, project),
    );
  }

  Widget _buildContent(ThemeData theme, ProjectProvider provider, Project project) {
    return CustomScrollView(
      slivers: [
        SliverToBoxAdapter(child: _buildOverview(theme, project, provider)),
        SliverToBoxAdapter(child: _buildActions(theme, project, provider)),
        const SliverToBoxAdapter(
          child: Padding(
            padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
            child: Text(
              'STAGES',
              style: TextStyle(
                color: Colors.white38,
                fontSize: 12,
                fontWeight: FontWeight.w600,
                letterSpacing: 1.2,
              ),
            ),
          ),
        ),
        SliverToBoxAdapter(
          child: StageTimeline(stages: provider.stages),
        ),
        if (provider.tasks.isNotEmpty) ...[
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(16, 24, 16, 8),
              child: Text(
                'TASKS',
                style: TextStyle(
                  color: Colors.white38,
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  letterSpacing: 1.2,
                ),
              ),
            ),
          ),
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) {
                final task = provider.tasks[index];
                return StatusCard(
                  title: task.displayTitle,
                  status: task.status,
                  subtitle: task.stageLabel,
                  icon: task.isPendingApproval
                      ? Icons.approval
                      : task.isFailed
                          ? Icons.error_outline
                          : Icons.play_circle_outline,
                  onTap: () => Navigator.of(context).pushNamed(
                    '/task-detail',
                    arguments: {'projectId': project.id, 'task': task},
                  ),
                );
              },
              childCount: provider.tasks.length,
            ),
          ),
        ],
        const SliverPadding(padding: EdgeInsets.only(bottom: 88)),
      ],
    );
  }

  Widget _buildOverview(ThemeData theme, Project project, ProjectProvider provider) {
    final statusColor = colorForStatus(project.status);

    return Container(
      margin: const EdgeInsets.fromLTRB(16, 16, 16, 0),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1A1A2E),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withOpacity(0.15)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      project.name,
                      style: theme.textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusColor.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        statusLabel(project.status),
                        style: TextStyle(
                          color: statusColor,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(
                width: 64,
                child: Column(
                  children: [
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        SizedBox(
                          width: 56,
                          height: 56,
                          child: CircularProgressIndicator(
                            value: project.progress / 100,
                            backgroundColor: Colors.white12,
                            color: statusColor,
                            strokeWidth: 5,
                          ),
                        ),
                        Text(
                          '${project.progress}',
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      '%',
                      style: TextStyle(color: Colors.white38, fontSize: 10),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (project.description != null && project.description!.isNotEmpty) ...[
            const SizedBox(height: 16),
            Text(
              project.description!,
              style: theme.textTheme.bodyMedium?.copyWith(color: Colors.white54),
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
            ),
          ],
          const SizedBox(height: 16),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              _InfoChip(
                icon: Icons.category,
                label: project.complexity[0].toUpperCase() + project.complexity.substring(1),
              ),
              if (project.platform != null)
                _InfoChip(icon: Icons.devices, label: project.platform!),
              if (project.preferredTech.isNotEmpty)
                _InfoChip(
                  icon: Icons.code,
                  label: project.preferredTech.join(', '),
                ),
              _InfoChip(
                icon: Icons.stacked_line_chart,
                label: project.currentStageLabel,
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildActions(ThemeData theme, Project project, ProjectProvider provider) {
    final isRunning = project.isInProgress;
    final isCompleted = project.isCompleted;

    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Expanded(
            child: _ActionButton(
              icon: Icons.rocket_launch_outlined,
              label: isCompleted
                  ? 'Completed'
                  : isRunning
                      ? 'In progress'
                      : 'Start orchestration',
              color: isRunning ? const Color(0xFF7C3AE0) : const Color(0xFF00D4AA),
              enabled: !isRunning && !isCompleted,
              onTap: isRunning || isCompleted ? null : _startOrchestration,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _ActionButton(
              icon: Icons.approval,
              label: 'Approvals',
              color: provider.pendingApprovalsCount > 0
                  ? const Color(0xFFFFC107)
                  : Colors.white54,
              onTap: () => Navigator.of(context).pushNamed(
                '/approvals',
                arguments: project.id,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;

  const _InfoChip({required this.icon, required this.label});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: Colors.white38),
          const SizedBox(width: 5),
          Flexible(
            child: Text(
              label,
              style: const TextStyle(color: Colors.white54, fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool enabled;
  final VoidCallback? onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.color,
    this.enabled = true,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14),
        decoration: BoxDecoration(
          color: enabled ? color.withOpacity(0.12) : Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: enabled ? color.withOpacity(0.3) : Colors.white.withOpacity(0.06),
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: enabled ? color : Colors.white24, size: 22),
            const SizedBox(height: 6),
            Text(
              label,
              style: TextStyle(
                color: enabled ? color : Colors.white38,
                fontSize: 12,
                fontWeight: FontWeight.w600,
              ),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}