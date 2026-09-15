import 'dart:convert';

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

Map<String, dynamic>? _parseMap(dynamic value) {
  if (value == null) return null;
  if (value is Map<String, dynamic>) return value;
  if (value is String) {
    try {
      final decoded = jsonDecode(value);
      if (decoded is Map<String, dynamic>) return decoded;
    } on FormatException {
      return null;
    }
  }
  return null;
}

String humanizeStageName(String name) {
  return name
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase() + part.substring(1))
      .join(' ');
}

class Project {
  final String id;
  final String name;
  final String? description;
  final String? targetUsers;
  final String? platform;
  final List<String> preferredTech;
  final String? constraints;
  final String complexity;
  final String status;
  final String? currentStage;
  final int progress;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  const Project({
    required this.id,
    required this.name,
    this.description,
    this.targetUsers,
    this.platform,
    this.preferredTech = const [],
    this.constraints,
    this.complexity = 'medium',
    this.status = 'created',
    this.currentStage,
    this.progress = 0,
    this.createdAt,
    this.updatedAt,
  });

  factory Project.fromJson(Map<String, dynamic> json) {
    final tech = json['preferred_tech'];
    return Project(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String?,
      targetUsers: json['target_users'] as String?,
      platform: json['platform'] as String?,
      preferredTech: tech is List
          ? tech.map((e) => e.toString()).toList()
          : const [],
      constraints: json['constraints'] as String?,
      complexity: json['complexity'] as String? ?? 'medium',
      status: json['status'] as String? ?? 'created',
      currentStage: json['current_stage'] as String?,
      progress: (json['progress'] as num?)?.toInt() ?? 0,
      createdAt: _parseDate(json['created_at']),
      updatedAt: _parseDate(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'target_users': targetUsers,
      'platform': platform,
      'preferred_tech': preferredTech,
      'constraints': constraints,
      'complexity': complexity,
      'status': status,
      'current_stage': currentStage,
      'progress': progress,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  Project copyWith({
    String? status,
    String? currentStage,
    int? progress,
  }) {
    return Project(
      id: id,
      name: name,
      description: description,
      targetUsers: targetUsers,
      platform: platform,
      preferredTech: preferredTech,
      constraints: constraints,
      complexity: complexity,
      status: status ?? this.status,
      currentStage: currentStage ?? this.currentStage,
      progress: progress ?? this.progress,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  bool get isCompleted => status == 'completed';
  bool get isInProgress => status == 'in_progress';
  String get currentStageLabel =>
      currentStage == null ? 'Not started' : humanizeStageName(currentStage!);
}

class ProjectStage {
  final String id;
  final String projectId;
  final String stageName;
  final String status;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final Map<String, dynamic>? outputData;
  final String? errorMessage;

  const ProjectStage({
    required this.id,
    required this.projectId,
    required this.stageName,
    this.status = 'pending',
    this.startedAt,
    this.completedAt,
    this.outputData,
    this.errorMessage,
  });

  factory ProjectStage.fromJson(Map<String, dynamic> json) {
    return ProjectStage(
      id: json['id']?.toString() ?? '',
      projectId: json['project_id']?.toString() ?? '',
      stageName: json['stage_name'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      startedAt: _parseDate(json['started_at']),
      completedAt: _parseDate(json['completed_at']),
      outputData: _parseMap(json['output_data']),
      errorMessage: json['error_message'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'stage_name': stageName,
      'status': status,
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'output_data': outputData,
      'error_message': errorMessage,
    };
  }

  bool get isCompleted => status == 'completed';
  bool get isInProgress => status == 'in_progress';
  bool get isWaitingApproval => status == 'waiting_approval';
  String get label => humanizeStageName(stageName);
}

class Requirement {
  final String id;
  final String projectId;
  final String type;
  final String title;
  final String? description;
  final String priority;
  final String status;
  final Map<String, dynamic>? acceptanceCriteria;
  final DateTime? createdAt;

  const Requirement({
    required this.id,
    required this.projectId,
    required this.type,
    required this.title,
    this.description,
    this.priority = 'P1',
    this.status = 'draft',
    this.acceptanceCriteria,
    this.createdAt,
  });

  factory Requirement.fromJson(Map<String, dynamic> json) {
    return Requirement(
      id: json['id']?.toString() ?? '',
      projectId: json['project_id']?.toString() ?? '',
      type: json['type'] as String? ?? 'functional',
      title: json['title'] as String? ?? '',
      description: json['description'] as String?,
      priority: json['priority'] as String? ?? 'P1',
      status: json['status'] as String? ?? 'draft',
      acceptanceCriteria: _parseMap(json['acceptance_criteria']),
      createdAt: _parseDate(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'type': type,
      'title': title,
      'description': description,
      'priority': priority,
      'status': status,
      'acceptance_criteria': acceptanceCriteria,
      'created_at': createdAt?.toIso8601String(),
    };
  }
}