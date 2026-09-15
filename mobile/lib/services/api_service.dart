import 'dart:convert';

import 'package:http/http.dart' as http;

import '../models/project.dart';
import '../models/agent.dart';
import '../models/approval.dart';
import '../models/task.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;

  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => statusCode != null ? '($statusCode) $message' : message;
}

class ApiService {
  ApiService({String? baseUrl}) : _baseUrl = baseUrl ?? _defaultBaseUrl;

  static const String _defaultBaseUrl = 'http://localhost:8000/api/v1';
  final String _baseUrl;
  String? _accessToken;
  String? _refreshToken;
  String? _userEmail;
  String? _userName;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  String? get userEmail => _userEmail;
  String? get userName => _userName;
  bool get hasToken => _accessToken != null;

  void setToken({String? accessToken, String? refreshToken, String? email, String? name}) {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    _userEmail = email;
    _userName = name;
  }

  void clearAuth() {
    _accessToken = null;
    _refreshToken = null;
    _userEmail = null;
    _userName = null;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
      };

  Uri _uri(String path, [Map<String, dynamic>? query]) {
    final base = Uri.parse('$_baseUrl$path');
    if (query == null || query.isEmpty) return base;
    return base.replace(queryParameters: query.map((k, v) => MapEntry(k, v?.toString() ?? '')));
  }

  dynamic _handleResponse(http.Response response, String operation) {
    final body = utf8.decode(response.bodyBytes);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (body.isEmpty) return <String, dynamic>{};
      return jsonDecode(body);
    }

    String message;
    try {
      final errorJson = jsonDecode(body);
      message = errorJson['detail'] is List
          ? (errorJson['detail'] as List).join('; ')
          : errorJson['detail']?.toString() ?? errorJson['message']?.toString() ?? 'Request failed';
    } catch (_) {
      message = body.isNotEmpty ? body : operation;
    }
    throw ApiException(message, response.statusCode);
  }

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await http.post(
      _uri('/auth/login'),
      headers: _headers,
      body: jsonEncode({'email': email, 'password': password}),
    );
    return _handleResponse(response, 'Login failed');
  }

  Future<Map<String, dynamic>> register(String email, String name, String password) async {
    final response = await http.post(
      _uri('/auth/register'),
      headers: _headers,
      body: jsonEncode({'email': email, 'full_name': name, 'password': password}),
    );
    return _handleResponse(response, 'Registration failed');
  }

  Future<List<Project>> getProjects() async {
    final response = await http.get(_uri('/projects'), headers: _headers);
    final data = _handleResponse(response, 'Failed to load projects');
    final list = data['projects'] as List? ?? [];
    return list.map((e) => Project.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Project> createProject(Map<String, dynamic> data) async {
    final response = await http.post(
      _uri('/projects'),
      headers: _headers,
      body: jsonEncode(data),
    );
    final json = _handleResponse(response, 'Failed to create project');
    return Project.fromJson(json as Map<String, dynamic>);
  }

  Future<Project> getProject(String id) async {
    final response = await http.get(_uri('/projects/$id'), headers: _headers);
    final json = _handleResponse(response, 'Failed to load project');
    return Project.fromJson(json as Map<String, dynamic>);
  }

  Future<List<ProjectStage>> getProjectStages(String projectId) async {
    final response = await http.get(_uri('/projects/$projectId/stages'), headers: _headers);
    final data = _handleResponse(response, 'Failed to load stages');
    final list = data is List ? data : data['stages'] as List? ?? [];
    return list.map((e) => ProjectStage.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Requirement>> getRequirements(String projectId) async {
    final response = await http.get(_uri('/projects/$projectId/requirements'), headers: _headers);
    final data = _handleResponse(response, 'Failed to load requirements');
    final list = data is List ? data : [];
    return list.map((e) => Requirement.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Task>> getTasks(String projectId) async {
    final response = await http.get(_uri('/projects/$projectId/tasks'), headers: _headers);
    final data = _handleResponse(response, 'Failed to load tasks');
    final list = data is List ? data : [];
    return list.map((e) => Task.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<TaskRun>> getTaskRuns(String projectId, String taskId) async {
    final response = await http.get(
      _uri('/projects/$projectId/tasks/$taskId/runs'),
      headers: _headers,
    );
    final data = _handleResponse(response, 'Failed to load task runs');
    final list = data is List ? data : [];
    return list.map((e) => TaskRun.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Agent>> getAgents(String projectId) async {
    final response = await http.get(_uri('/projects/$projectId/agents'), headers: _headers);
    final data = _handleResponse(response, 'Failed to load agents');
    final list = data is List ? data : [];
    return list.map((e) => Agent.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<List<Approval>> getApprovals(String projectId) async {
    final response = await http.get(_uri('/projects/$projectId/approvals'), headers: _headers);
    final data = _handleResponse(response, 'Failed to load approvals');
    final list = data is List ? data : [];
    return list.map((e) => Approval.fromJson(e as Map<String, dynamic>)).toList();
  }

  Future<Approval> decideApproval(
    String projectId,
    String approvalId,
    String decision, {
    String? notes,
  }) async {
    final response = await http.post(
      _uri('/projects/$projectId/approvals/$approvalId/decide'),
      headers: _headers,
      body: jsonEncode({
        'decision': decision,
        if (notes != null) 'decision_notes': notes,
      }),
    );
    final json = _handleResponse(response, 'Failed to decide approval');
    return Approval.fromJson(json as Map<String, dynamic>);
  }

  Future<Map<String, dynamic>> startOrchestration(String projectId) async {
    final response = await http.post(
      _uri('/projects/$projectId/orchestrate/start'),
      headers: _headers,
    );
    final json = _handleResponse(response, 'Failed to start orchestration');
    return Map<String, dynamic>.from(json as Map);
  }
}