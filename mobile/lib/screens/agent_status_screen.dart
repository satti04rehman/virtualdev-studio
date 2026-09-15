import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/project_provider.dart';
import '../widgets/agent_card.dart';

class AgentStatusScreen extends StatefulWidget {
  final String projectId;

  const AgentStatusScreen({super.key, required this.projectId});

  @override
  State<AgentStatusScreen> createState() => _AgentStatusScreenState();
}

class _AgentStatusScreenState extends State<AgentStatusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectProvider>().loadAgents(widget.projectId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<ProjectProvider>();
    final agents = provider.agents;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F23),
        elevation: 0,
        title: Row(
          children: [
            const Text(
              'AI Agents',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
            ),
            const SizedBox(width: 10),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: const Color(0xFF00D4AA).withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                '${agents.length} active',
                style: const TextStyle(
                  color: Color(0xFF00D4AA),
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ],
        ),
      ),
      body: agents.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.smart_toy_outlined, color: Colors.white12, size: 56),
                  SizedBox(height: 16),
                  Text(
                    'No agents registered',
                    style: TextStyle(color: Colors.white38, fontSize: 16),
                  ),
                  SizedBox(height: 6),
                  Text(
                    'Agents appear when orchestration\nis started for this project',
                    style: TextStyle(color: Colors.white24, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            )
          : GridView.builder(
              padding: const EdgeInsets.all(12),
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 0.82,
              ),
              itemCount: agents.length,
              itemBuilder: (context, index) => AgentCard(agent: agents[index]),
            ),
    );
  }
}