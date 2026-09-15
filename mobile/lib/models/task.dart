import 'dart:convert';

Map<String, dynamic>? _parseMap(dynamic value) {
  if (value == null) return null;
  if (value is Map<String, dynamic>) return value;
  if (value is Map) {
    return value.map((key, val) => MapEntry(key.toString(), val));
  }
  if (value is String) {
    try {
      final decoded = jsonDecode(value);
      if (decoded is Map) {
        return decoded.map((key, val) => MapEntry(key.toString(), val));
      }
    } on FormatException {
      return null;
    }
  }
  return null;
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

class Task {
  final String id;
  final String projectId;
  final String? agentId;
  final String? title;
  final String? description;
  final String? stage;
  final String status;
  final int priority;
  final Map<String, dynamic>? outputData;
  final String? errorMessage;
  final bool requiresApproval;
  final DateTime? createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;

  const Task({
    required this.id,
    required this.projectId,
    this.agentId,
    this.title,
    this.description,
    this.stage,
    this.status = 'queued',
    this.priority = 0,
    this.outputData,
    this.errorMessage,
    this.requiresApproval = false,
    this.createdAt,
    this.startedAt,
    this.completedAt,
  });

  factory Task.fromJson(Map<String, dynamic> json) {
    return Task(
      id: json['id']?.toString() ?? '',
      projectId: json['project_id']?.toString() ?? '',
      agentId: json['agent_id']?.toString(),
      title: json['title'] as String?,
      description: json['description'] as String?,
      stage: json['stage'] as String?,
      status: json['status'] as String? ?? 'queued',
      priority: (json['priority'] as num?)?.toInt() ?? 0,
      outputData: _parseMap(json['output_data']),
      errorMessage: json['error_message'] as String?,
      requiresApproval: json['requires_approval'] as bool? ?? false,
      createdAt: _parseDate(json['created_at']),
      startedAt: _parseDate(json['started_at']),
      completedAt: _parseDate(json['completed_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'agent_id': agentId,
      'title': title,
      'description': description,
      'stage': stage,
      'status': status,
      'priority': priority,
      'output_data': outputData,
      'error_message': errorMessage,
      'requires_approval': requiresApproval,
      'created_at': createdAt?.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
    };
  }

  bool get isCompleted => status == 'completed';
  bool get isInProgress => status == 'in_progress';
  bool get isPendingApproval => status == 'pending_approval';
  bool get isFailed => status == 'failed';

  String get displayTitle => title ?? 'Untitled task';
  String get stageLabel {
    final raw = stage ?? '';
    return raw
        .split('_')
        .where((part) => part.isNotEmpty)
        .map((part) => part[0].toUpperCase() + part.substring(1))
        .join(' ');
  }
}

class TaskRun {
  final String id;
  final String taskId;
  final String? agentId;
  final String? status;
  final Map<String, dynamic>? outputData;
  final String? errorMessage;
  final int? durationMs;
  final int? tokensUsed;
  final DateTime? startedAt;
  final DateTime? completedAt;

  const TaskRun({
    required this.id,
    required this.taskId,
    this.agentId,
    this.status,
    this.outputData,
    this.errorMessage,
    this.durationMs,
    this.tokensUsed,
    this.startedAt,
    this.completedAt,
  });

  factory TaskRun.fromJson(Map<String, dynamic> json) {
    return TaskRun(
      id: json['id']?.toString() ?? '',
      taskId: json['task_id']?.toString() ?? '',
      agentId: json['agent_id']?.toString(),
      status: json['status'] as String?,
      outputData: _parseMap(json['output_data']),
      errorMessage: json['error_message'] as String?,
      durationMs: (json['duration_ms'] as num?)?.toInt(),
      tokensUsed: (json['tokens_used'] as num?)?.toInt(),
      startedAt: _parseDate(json['started_at']),
      completedAt: _parseDate(json['completed_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'task_id': taskId,
      'agent_id': agentId,
      'status': status,
      'output_data': outputData,
      'error_message': errorMessage,
      'duration_ms': durationMs,
      'tokens_used': tokensUsed,
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
    };
  }
}