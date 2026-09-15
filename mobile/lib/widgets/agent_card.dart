import 'package:flutter/material.dart';

import '../models/agent.dart';

class AgentCard extends StatelessWidget {
  final Agent agent;
  final bool isBusy;
  final VoidCallback? onTap;

  const AgentCard({
    super.key,
    required this.agent,
    this.isBusy = false,
    this.onTap,
  });

  Color _avatarColor() {
    final colorMap = {
      'requirements': const Color(0xFF00D4AA),
      'research': const Color(0xFF7C3AE0),
      'product': const Color(0xFFFFC107),
      'architect': const Color(0xFF2979FF),
      'database': const Color(0xFF00BFA5),
      'ui_ux': const Color(0xFFFF4081),
      'developer': const Color(0xFF7C4DFF),
      'testing': const Color(0xFFFF6E40),
      'security': const Color(0xFFE53935),
      'documentation': const Color(0xFF42A5F5),
    };
    for (final entry in colorMap.entries) {
      if (agent.role.contains(entry.key)) return entry.value;
    }
    return const Color(0xFF00D4AA);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final color = _avatarColor();

    return Card(
      color: theme.colorScheme.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(
          color: agent.isActive
              ? color.withOpacity(0.2)
              : Colors.white.withOpacity(0.06),
        ),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 20,
                    backgroundColor: color.withOpacity(0.15),
                    child: Text(
                      agent.name.isNotEmpty
                          ? agent.name[0].toUpperCase()
                          : '?',
                      style: TextStyle(
                        color: color,
                        fontWeight: FontWeight.w700,
                        fontSize: 18,
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          agent.name,
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 2),
                        Text(
                          agent.roleLabel,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: color,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (agent.isActive ? const Color(0xFF00D4AA) : Colors.white38)
                          .withOpacity(0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 6,
                          height: 6,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: agent.isActive ? const Color(0xFF00D4AA) : Colors.white38,
                          ),
                        ),
                        const SizedBox(width: 4),
                        Text(
                          agent.isActive ? 'Online' : 'Offline',
                          style: TextStyle(
                            color: agent.isActive ? const Color(0xFF00D4AA) : Colors.white38,
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              if (agent.description != null) ...[
                const SizedBox(height: 10),
                Text(
                  agent.description!,
                  style: theme.textTheme.bodySmall?.copyWith(color: Colors.white54),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
              if (agent.capabilityList.isNotEmpty) ...[
                const SizedBox(height: 10),
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: agent.capabilityList.take(4).map((cap) {
                    return Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        cap,
                        style: const TextStyle(
                          color: Colors.white54,
                          fontSize: 10,
                        ),
                      ),
                    );
                  }).toList(),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}