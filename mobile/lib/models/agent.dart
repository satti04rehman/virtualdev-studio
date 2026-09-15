import 'dart:convert';

class Agent {
  final String id;
  final String name;
  final String role;
  final String? description;
  final Map<String, dynamic> capabilities;
  final bool isActive;
  final DateTime? createdAt;

  const Agent({
    required this.id,
    required this.name,
    required this.role,
    this.description,
    this.capabilities = const {},
    this.isActive = true,
    this.createdAt,
  });

  factory Agent.fromJson(Map<String, dynamic> json) {
    final caps = json['capabilities'];
    return Agent(
      id: json['id']?.toString() ?? '',
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? '',
      description: json['description'] as String?,
      capabilities: caps is Map<String, dynamic>
          ? caps
          : caps is String
              ? _tryDecodeMap(caps)
              : const {},
      isActive: json['is_active'] as bool? ?? true,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  static Map<String, dynamic> _tryDecodeMap(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) return decoded;
    } on FormatException {
      return const {};
    }
    return const {};
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'role': role,
      'description': description,
      'capabilities': capabilities,
      'is_active': isActive,
      'created_at': createdAt?.toIso8601String(),
    };
  }

  String get roleLabel => role
      .split('_')
      .where((part) => part.isNotEmpty)
      .map((part) => part[0].toUpperCase() + part.substring(1))
      .join(' ');

  List<String> get capabilityList {
    final entries = capabilities.entries
        .map((e) {
          final value = e.value is List ? e.value.join(', ') : e.value.toString();
          return '${e.key}: $value';
        })
        .toList();
    if (entries.isEmpty) {
      return capabilities.keys.toList();
    }
    return entries;
  }
}