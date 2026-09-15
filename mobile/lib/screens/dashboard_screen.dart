import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/project.dart';
import '../providers/auth_provider.dart';
import '../providers/project_provider.dart';
import '../widgets/status_card.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProjectProvider>().loadProjects();
    });
  }

  void _logout() {
    context.read<ProjectProvider>().disconnectFromProject();
    context.read<AuthProvider>().logout();
  }

  void _createProject() async {
    final result = await Navigator.of(context).pushNamed('/create-project');
    if (result == true && mounted) {
      context.read<ProjectProvider>().loadProjects();
    }
  }

  void _openProject(Project project) {
    Navigator.of(context).pushNamed('/project-detail', arguments: project);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final provider = context.watch<ProjectProvider>();
    final auth = context.watch<AuthProvider>();
    final projects = provider.projects;

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F23),
        elevation: 0,
        centerTitle: false,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'VirtualDev Studio',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            if (auth.userEmail != null)
              Text(
                auth.userEmail!,
                style: const TextStyle(color: Colors.white38, fontSize: 11),
              ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white54, size: 20),
            onPressed: () => provider.loadProjects(),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white54, size: 20),
            onPressed: _logout,
          ),
        ],
      ),
      body: _buildBody(theme, provider, projects),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _createProject,
        backgroundColor: const Color(0xFF00D4AA),
        foregroundColor: const Color(0xFF001510),
        icon: const Icon(Icons.add, size: 20),
        label: const Text('New Project', style: TextStyle(fontWeight: FontWeight.w700)),
      ),
    );
  }

  Widget _buildBody(
    ThemeData theme,
    ProjectProvider provider,
    List<Project> projects,
  ) {
    if (provider.loadingProjects && projects.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF00D4AA)),
      );
    }

    if (provider.projectsError != null && projects.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off_rounded, color: Colors.white24, size: 56),
              const SizedBox(height: 16),
              Text(
                provider.projectsError!,
                style: const TextStyle(color: Colors.white54, fontSize: 14),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              ElevatedButton.icon(
                onPressed: () => provider.loadProjects(),
                icon: const Icon(Icons.refresh, size: 18),
                label: const Text('Retry'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AE0),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
              ),
            ],
          ),
        ),
      );
    }

    if (projects.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: const Color(0xFF00D4AA).withOpacity(0.1),
                  border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.2)),
                ),
                child: const Icon(Icons.folder_open, color: Color(0xFF00D4AA), size: 36),
              ),
              const SizedBox(height: 20),
              const Text(
                'No projects yet',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Create your first project to get started\nwith AI-powered development',
                style: TextStyle(color: Colors.white38, fontSize: 13),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: _createProject,
                icon: const Icon(Icons.add, size: 18),
                label: const Text('Create Project'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00D4AA),
                  foregroundColor: const Color(0xFF001510),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                ),
              ),
            ],
          ),
        ),
      );
    }

    return RefreshIndicator(
      color: const Color(0xFF00D4AA),
      backgroundColor: const Color(0xFF1A1A2E),
      onRefresh: () => provider.loadProjects(),
      child: ListView.builder(
        padding: const EdgeInsets.only(top: 12, bottom: 88),
        itemCount: projects.length,
        itemBuilder: (context, index) => _ProjectTile(
          project: projects[index],
          onTap: () => _openProject(projects[index]),
        ),
      ),
    );
  }
}

class _ProjectTile extends StatelessWidget {
  final Project project;
  final VoidCallback onTap;

  const _ProjectTile({required this.project, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final statusColor = colorForStatus(project.status);

    return StatusCard(
      title: project.name,
      status: project.status,
      subtitle: project.description,
      icon: Icons.folder_outlined,
      onTap: onTap,
      trailing: Column(
        children: [
          SizedBox(
            width: 56,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: project.progress / 100,
                backgroundColor: Colors.white12,
                color: statusColor,
                minHeight: 5,
              ),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            '${project.progress}%',
            style: TextStyle(color: statusColor, fontSize: 11, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }
}