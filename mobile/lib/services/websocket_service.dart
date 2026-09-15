import 'dart:async';
import 'dart:convert';
import 'dart:developer' as developer;

import 'package:web_socket_channel/io.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class WebSocketService {
  WebSocketChannel? _channel;
  Timer? _heartbeatTimer;
  bool _connected = false;
  String? _currentProjectId;

  final StreamController<Map<String, dynamic>> _controller =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get messages => _controller.stream;
  bool get isConnected => _connected;
  String? get currentProjectId => _currentProjectId;

  static String _wsUrl(String projectId) =>
      'ws://localhost:8000/ws/projects/$projectId';

  Future<void> connect(String projectId, {String? token}) async {
    if (_connected && _currentProjectId == projectId) return;
    disconnect();

    try {
      final uri = Uri.parse(_wsUrl(projectId));
      final channel = IOWebSocketChannel.connect(
        uri,
        pingInterval: const Duration(seconds: 20),
        headers: <String, String>{
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      _channel = channel;
      _currentProjectId = projectId;

      channel.stream.listen(
        (data) {
          if (data is String) {
            try {
              final message = jsonDecode(data) as Map<String, dynamic>;
              if (message['type'] == 'pong') return;
              _controller.add(message);
            } on FormatException {
              developer.log('WebSocket: invalid JSON received', name: 'ws');
            }
          }
        },
        onDone: () {
          _connected = false;
          _heartbeatTimer?.cancel();
          _heartbeatTimer = null;
          developer.log(
            'WebSocket disconnected from project $_currentProjectId',
            name: 'ws',
          );
        },
        onError: (error) {
          _connected = false;
          _heartbeatTimer?.cancel();
          _heartbeatTimer = null;
          developer.log('WebSocket error: $error', name: 'ws');
        },
      );

      _connected = true;
      _startHeartbeat();
      developer.log('WebSocket connected to project $projectId', name: 'ws');
    } catch (e) {
      _connected = false;
      _heartbeatTimer = null;
      developer.log('WebSocket connection failed: $e', name: 'ws');
    }
  }

  void _startHeartbeat() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (_connected) {
        send({'type': 'ping'});
      }
    });
  }

  void send(Map<String, dynamic> message) {
    if (_connected && _channel != null) {
      try {
        _channel!.sink.add(jsonEncode(message));
      } catch (e) {
        developer.log('WebSocket send error: $e', name: 'ws');
      }
    }
  }

  void disconnect() {
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    _connected = false;
    _currentProjectId = null;

    try {
      _channel?.sink.close();
    } catch (_) {
      // Ignore close errors
    }
    _channel = null;
  }

  void dispose() {
    disconnect();
    _controller.close();
  }
}