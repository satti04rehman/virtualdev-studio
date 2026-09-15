import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/project_provider.dart';

class CreateProjectScreen extends StatefulWidget {
  const CreateProjectScreen({super.key});

  @override
  State<CreateProjectScreen> createState() => _CreateProjectScreenState();
}

class _CreateProjectScreenState extends State<CreateProjectScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _targetUsersController = TextEditingController();
  final _platformController = TextEditingController();
  final _techController = TextEditingController();
  final _constraintsController = TextEditingController();
  String _complexity = 'medium';
  bool _submitting = false;

  static const _complexityOptions = [
    {'value': 'low', 'label': 'Low', 'description': 'Simple app, basic features'},
    {'value': 'medium', 'label': 'Medium', 'description': 'Moderate scope and complexity'},
    {'value': 'high', 'label': 'High', 'description': 'Enterprise-grade, complex system'},
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _descriptionController.dispose();
    _targetUsersController.dispose();
    _platformController.dispose();
    _techController.dispose();
    _constraintsController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;

    setState(() => _submitting = true);

    try {
      final data = <String, dynamic>{
        'name': _nameController.text.trim(),
        'description': _descriptionController.text.trim(),
        'complexity': _complexity,
      };

      final targetUsers = _targetUsersController.text.trim();
      if (targetUsers.isNotEmpty) data['target_users'] = targetUsers;

      final platform = _platformController.text.trim();
      if (platform.isNotEmpty) data['platform'] = platform;

      final tech = _techController.text.trim();
      if (tech.isNotEmpty) {
        data['preferred_tech'] =
            tech.split(',').map((t) => t.trim()).where((t) => t.isNotEmpty).toList();
      }

      final constraints = _constraintsController.text.trim();
      if (constraints.isNotEmpty) data['constraints'] = constraints;

      final project = await context.read<ProjectProvider>().createProject(data);

      if (!mounted) return;

      if (project != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Project created successfully'),
            backgroundColor: Color(0xFF00D4AA),
          ),
        );
        Navigator.of(context).pop(true);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed: ${e is Exception ? e : e}'),
          backgroundColor: const Color(0xFFE53935),
        ),
      );
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  InputDecoration _inputDecoration(String label, {String? hint, int maxLines = 1}) {
    return InputDecoration(
      labelText: label,
      hintText: hint,
      labelStyle: const TextStyle(color: Colors.white54),
      hintStyle: const TextStyle(color: Colors.white24),
      filled: true,
      fillColor: const Color(0xFF1A1A2E),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFF00D4AA), width: 1.5),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE53935)),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFE53935), width: 1.5),
      ),
      contentPadding: EdgeInsets.symmetric(
        horizontal: 16,
        vertical: maxLines > 1 ? 16 : 16,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: theme.scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F0F23),
        elevation: 0,
        title: const Text(
          'Create Project',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white54),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.15)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.lightbulb_outline, color: Color(0xFF00D4AA), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Project Details',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _nameController,
                    textInputAction: TextInputAction.next,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration('Project Name *', hint: 'My awesome app'),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Name is required' : null,
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _descriptionController,
                    textInputAction: TextInputAction.newline,
                    maxLines: 3,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration(
                      'Description *',
                      hint: 'Describe what the project should build...',
                      maxLines: 3,
                    ),
                    validator: (v) =>
                        (v == null || v.trim().isEmpty) ? 'Description is required' : null,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: const Color(0xFF1A1A2E),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.settings_outlined, color: Color(0xFF7C3AE0), size: 18),
                      SizedBox(width: 8),
                      Text(
                        'Configuration',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  TextFormField(
                    controller: _targetUsersController,
                    textInputAction: TextInputAction.next,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration(
                      'Target Users',
                      hint: 'e.g. Small businesses, developers',
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _platformController,
                    textInputAction: TextInputAction.next,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration(
                      'Platform',
                      hint: 'e.g. Web, iOS, Android',
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _techController,
                    textInputAction: TextInputAction.next,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration(
                      'Preferred Tech Stack',
                      hint: 'e.g. React, Node.js, PostgreSQL',
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _constraintsController,
                    maxLines: 2,
                    style: const TextStyle(color: Colors.white),
                    decoration: _inputDecoration(
                      'Constraints',
                      hint: 'Budget, timeline, regulations...',
                      maxLines: 2,
                    ),
                  ),
                  const SizedBox(height: 24),
                  const Text(
                    'COMPLEXITY',
                    style: TextStyle(
                      color: Colors.white38,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      letterSpacing: 1.2,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ..._complexityOptions.map((option) {
                    final selected = _complexity == option['value'];
                    final color = option['value'] == 'low'
                        ? const Color(0xFF00D4AA)
                        : option['value'] == 'medium'
                            ? const Color(0xFFFFC107)
                            : const Color(0xFFE53935);

                    return Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: InkWell(
                        onTap: () => setState(() => _complexity = option['value']!),
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: selected
                                ? color.withOpacity(0.1)
                                : Colors.white.withOpacity(0.03),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(
                              color: selected
                                  ? color.withOpacity(0.5)
                                  : Colors.white.withOpacity(0.06),
                              width: selected ? 1.5 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(
                                selected
                                    ? Icons.radio_button_checked
                                    : Icons.radio_button_off,
                                color: selected ? color : Colors.white24,
                                size: 20,
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      option['label']!,
                                      style: TextStyle(
                                        color: selected ? color : Colors.white,
                                        fontWeight: FontWeight.w600,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      option['description']!,
                                      style: TextStyle(
                                        color: selected
                                            ? color.withOpacity(0.7)
                                            : Colors.white38,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              height: 52,
              child: ElevatedButton(
                onPressed: _submitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00D4AA),
                  foregroundColor: const Color(0xFF001510),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  elevation: 0,
                ),
                child: _submitting
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(
                          strokeWidth: 2.5,
                          color: Color(0xFF001510),
                        ),
                      )
                    : const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'Create Project',
                            style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16),
                          ),
                        ],
                      ),
              ),
            ),
            const SizedBox(height: 48),
          ],
        ),
      ),
    );
  }
}