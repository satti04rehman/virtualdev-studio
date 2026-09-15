import 'dart:async';

import 'package:flutter/material.dart';

import '../models/project.dart';
import '../models/agent.dart';
import '../models/approval.dart';
import '../models/task.dart';
import '../services/api_service.dart';
import '../services/websocket_service.dart';

class ProjectProvider extends ChangeNotifier {
  final ApiService _api;
  final WebSocketService _ws;

  ProjectProvider(this._api, this._ws);

  List<Project> projects = [];
  bool loadingProjects = false;
  String? projectsError;

  Project? selectedProject;
  List<ProjectStage> stages = [];
  List<Task> tasks = [];
  List<Approval> approvals = [];
  List<Agent> agents = [];
  bool loadingDetail = false;
  String? detailError;

  StreamSubscription<Map<String, dynamic>>? _wsSubscription;

  int get pendingApprovalsCount => approvals.where((a) => a.isPending).length;

  void reset() {
    projects = [];
    projectsError = null;
    selectedProject = null;
    stages = [];
    tasks = [];
    approvals = [];
    agents = [];
    detailError = null;
    disconnectFromProject();
    notifyListeners();
  }

  Future<void> loadProjects() async {
    loadingProjects = true;
    projectsError = null;
    notifyListeners();

    try {
      projects = await _api.getProjects();
    } catch (e) {
      projectsError = e is ApiException ? e.message : 'Failed to load projects';
    } finally {
      loadingProjects = false;
      notifyListeners();
    }
  }

  Future<Project?> createProject(Map<String, dynamic> data) async {
    try {
      final project = await _api.createProject(data);
      projects.insert(0, project);
      notifyListeners();
      return project;
    } catch (e) {
      rethrow;
    }
  }

  Future<void> loadProjectDetail(String id, {bool silent = false}) async {
    if (!silent) {
      loadingDetail = true;
      detailError = null;
      notifyListeners();
    }

    try {
      final results = await Future.wait<dynamic>([
        _api.getProject(id),
        _api.getProjectStages(id),
        _api.getTasks(id),
        _api.getApprovals(id),
      ]);

      selectedProject = results[0] as Project;
      stages = List<ProjectStage>.from(results[1] as List);
      tasks = List<Task>.from(results[2] as List);
      approvals = List<Approval>.from(results[3] as List);
    } catch (e) {
      detailError = e is ApiException ? e.message : 'Failed to load project details';
    } finally {
      loadingDetail = false;
      notifyListeners();
    }
  }

  Future<void> loadAgents(String projectId) async {
    try {
      agents = await _api.getAgents(projectId);
      notifyListeners();
    } catch (_) {
      // Agents are supplementary; don't block detail screen on error
    }
  }

  Future<Approval?> decideApproval(
    String projectId,
    String approvalId,
    String decision, {
    String? notes,
  }) async {
    try {
      final updated = await _api.decideApproval(projectId, approvalId, decision, notes: notes);
      final idx = approvals.indexWhere((a) => a.id == approvalId);
      if (idx >= 0) {
        approvals[idx] = updated;
      }
      notifyListeners();
      return updated;
    } catch (e) {
      rethrow;
    }
  }

  Future<Map<String, dynamic>?> startOrchestration(String projectId) async {
    try {
      final result = await _api.startOrchestration(projectId);
      await loadProjectDetail(projectId, silent: true);
      return result;
    } catch (e) {
      rethrow;
    }
  }

  void connectToProject(String projectId) {
    _wsSubscription?.cancel();
    _ws.connect(projectId, token: _api.accessToken);
    _wsSubscription = _ws.messages.listen((_) {
      if (selectedProject != null) {
        loadProjectDetail(selectedProject!.id, silent: true);
      }
    });
  }

  void disconnectFromProject() {
    _wsSubscription?.cancel();
    _wsSubscription = null;
    _ws.disconnect();
  }

  Task? findTaskById(String taskId) {
    try {
      return tasks.firstWhere((t) => t.id == taskId);
    } catch (_) {
      return null;
    }
  }

  @override
  void dispose() {
    _wsSubscription?.cancel();
    super.dispose();
  }
}