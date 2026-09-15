class Approval {
  final String id;
  final String projectId;
  final String action;
  final String? reason;
  final String? riskLevel;
  final String? expectedResult;
  final String status;
  final String? decision;
  final String? decisionNotes;
  final DateTime? decidedAt;
  final DateTime? createdAt;

  const Approval({
    required this.id,
    required this.projectId,
    required this.action,
    this.reason,
    this.riskLevel,
    this.expectedResult,
    this.status = 'pending',
    this.decision,
    this.decisionNotes,
    this.decidedAt,
    this.createdAt,
  });

  factory Approval.fromJson(Map<String, dynamic> json) {
    return Approval(
      id: json['id']?.toString() ?? '',
      projectId: json['project_id']?.toString() ?? '',
      action: json['action'] as String? ?? '',
      reason: json['reason'] as String?,
      riskLevel: json['risk_level'] as String?,
      expectedResult: json['expected_result'] as String?,
      status: json['status'] as String? ?? 'pending',
      decision: json['decision'] as String?,
      decisionNotes: json['decision_notes'] as String?,
      decidedAt: json['decided_at'] != null
          ? DateTime.tryParse(json['decided_at'].toString())
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'project_id': projectId,
      'action': action,
      'reason': reason,
      'risk_level': riskLevel,
      'expected_result': expectedResult,
      'status': status,
      'decision': decision,
      'decision_notes': decisionNotes,
      'decided_at': decidedAt?.toIso8601String(),
      'created_at': createdAt?.toIso8601String(),
    };
  }

  bool get isPending => status == 'pending';
}