import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/approval.dart';
import '../providers/project_provider.dart';
import '../widgets/status_card.dart';

class ApprovalsScreen extends StatefulWidget {
  final String projectId;

  const ApprovalsScreen({super.key, required this.projectId});

  @override
  State<ApprovalsScreen> createState() => _ApprovalsScreenState();
}

class _ApprovalsScreenState extends State<ApprovalsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectProvider>().loadProjectDetail(widget.projectId, silent: true);
    });
  }

  Future<void> _decide(Approval approval, String decision) async {
    final provider = context.read<ProjectProvider>();
    try {
      await provider.decideApproval(widget.projectId, approval.id, decision);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Approval ${decision == 'approved' ? 'approved' : 'rejected'}'),
          backgroundColor: decision == 'approved'
              ? const Color(0xFF00D4AA)
              : const Color(0xFFE53935),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed: ${e is Exception ? e : e}'),
          backgroundColor: const Color(0xFFE53935),
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<ProjectProvider>();
    final approvals = provider.approvals;
    final pending = approvals.where((a) => a.isPending).toList();
    final decided = approvals.where((a) => !a.isPending).toList();

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F23),
        elevation: 0,
        title: Row(
          children: [
            const Text(
              'Approvals',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
            if (pending.isNotEmpty) ...[
              const SizedBox(width: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFFFC107).withOpacity(0.2),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${pending.length} pending',
                  style: const TextStyle(
                    color: Color(0xFFFFC107),
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
      body: approvals.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.check_circle_outline, color: Colors.white12, size: 56),
                  const SizedBox(height: 16),
                  const Text(
                    'No approvals',
                    style: TextStyle(color: Colors.white38, fontSize: 16),
                  ),
                  const SizedBox(height: 6),
                  const Text(
                    'Approvals will appear when\nAI agents need your review',
                    style: TextStyle(color: Colors.white24, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.symmetric(vertical: 12),
              children: [
                if (pending.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 8),
                    child: Text(
                      'PENDING',
                      style: TextStyle(
                        color: Colors.white38,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                  ...pending.map((a) => _PendingApprovalTile(
                        approval: a,
                        onApprove: () => _decide(a, 'approved'),
                        onReject: () => _decide(a, 'rejected'),
                      )),
                ],
                if (decided.isNotEmpty) ...[
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 20, 16, 8),
                    child: Text(
                      'DECIDED',
                      style: TextStyle(
                        color: Colors.white38,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        letterSpacing: 1.2,
                      ),
                    ),
                  ),
                  ...decided.map((a) => _DecidedApprovalTile(approval: a)),
                ],
              ],
            ),
    );
  }
}

class _PendingApprovalTile extends StatelessWidget {
  final Approval approval;
  final VoidCallback onApprove;
  final VoidCallback onReject;

  const _PendingApprovalTile({
    required this.approval,
    required this.onApprove,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      color: theme.colorScheme.surface,
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: Color(0xFFFFC107), width: 0.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Color(0xFFFFC107), size: 18),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    approval.action,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                if (approval.riskLevel != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: _riskColor(approval.riskLevel!).withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      approval.riskLevel!,
                      style: TextStyle(
                        color: _riskColor(approval.riskLevel!),
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
              ],
            ),
            if (approval.reason != null) ...[
              const SizedBox(height: 10),
              Text(
                approval.reason!,
                style: theme.textTheme.bodySmall?.copyWith(color: Colors.white54),
              ),
            ],
            if (approval.expectedResult != null) ...[
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.04),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, size: 14, color: Colors.white38),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        approval.expectedResult!,
                        style: const TextStyle(color: Colors.white54, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onReject,
                    icon: const Icon(Icons.close, size: 16),
                    label: const Text('Reject'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFE53935),
                      side: const BorderSide(color: Color(0xFFE53935), width: 1),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: onApprove,
                    icon: const Icon(Icons.check, size: 16),
                    label: const Text('Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00D4AA),
                      foregroundColor: const Color(0xFF001510),
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Color _riskColor(String level) {
    switch (level.toLowerCase()) {
      case 'high':
        return const Color(0xFFE53935);
      case 'medium':
        return const Color(0xFFFFC107);
      case 'low':
        return const Color(0xFF00D4AA);
      default:
        return Colors.white54;
    }
  }
}

class _DecidedApprovalTile extends StatelessWidget {
  final Approval approval;

  const _DecidedApprovalTile({required this.approval});

  @override
  Widget build(BuildContext context) {
    final isApproved = approval.decision == 'approved';

    return StatusCard(
      title: approval.action,
      status: approval.decision ?? approval.status,
      subtitle: approval.decisionNotes,
      icon: isApproved ? Icons.check_circle : Icons.cancel,
    );
  }
}