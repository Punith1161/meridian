import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_client.dart';
import '../api/api_config.dart';

class AuthController extends ChangeNotifier {
  static const _key = 'meridian_token';
  late final ApiClient _api;
  String? _token;
  String? lastError;

  AuthController() {
    _api = ApiClient(baseUrl: apiBaseUrl, tokenProvider: () => _token);
  }

  ApiClient get api => _api;
  String? get token => _token;
  bool get isAuthenticated => _token != null;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(_key);
    if (_token != null) {
      try {
        await _api.validateToken();
      } catch (_) {
        _token = null;
        await prefs.remove(_key);
      }
    }
    notifyListeners();
  }

  Future<bool> login(String email, String password) async {
    lastError = null;
    if (email.isEmpty || password.isEmpty) {
      lastError = 'Email and password are required.';
      notifyListeners();
      return false;
    }
    try {
      final token = await _api.login(email, password);
      _token = token;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, _token!);
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      lastError = e.message;
    } catch (_) {
      lastError = 'Unable to sign in.';
    }
    notifyListeners();
    return false;
  }

  Future<void> logout() async {
    _token = null;
    lastError = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
    notifyListeners();
  }
}
