import 'package:flutter/material.dart';

import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api;

  AuthProvider(this._api);

  bool _isLoading = false;
  String? _error;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _api.hasToken;
  String? get error => _error;
  String? get userEmail => _api.userEmail;
  String? get userName => _api.userName;

  void clearError() {
    _error = null;
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final data = await _api.login(email, password);
      final token = data['access_token'] as String?;
      final refresh = data['refresh_token'] as String?;
      final emailResolved = email;

      if (token == null) {
        _error = 'No access token received';
        return false;
      }

      _api.setToken(
        accessToken: token,
        refreshToken: refresh,
        email: emailResolved,
      );
      return true;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Login failed';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<bool> register(String email, String name, String password) async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await _api.register(email, name, password);

      final loginSuccess = await login(email, password);
      if (!loginSuccess && _error != null) {
        _error = 'Account created but login failed. Please try logging in.';
      }
      return loginSuccess;
    } catch (e) {
      _error = e is ApiException ? e.message : 'Registration failed';
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void logout() {
    _api.clearAuth();
    _error = null;
    notifyListeners();
  }
}