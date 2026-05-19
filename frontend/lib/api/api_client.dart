import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);

  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiClient {
  final String baseUrl;
  final String? Function() tokenProvider;

  ApiClient({required this.baseUrl, required this.tokenProvider});

  Uri _uri(String path) => Uri.parse('$baseUrl$path');

  Future<Map<String, dynamic>> getJson(String path) async {
    final res = await http.get(_uri(path), headers: _headers());
    return _decodeObject(res);
  }

  Future<List<dynamic>> getList(String path) async {
    final res = await http.get(_uri(path), headers: _headers());
    return _decodeList(res);
  }

  Future<Map<String, dynamic>> postJson(String path, Map<String, dynamic> body) async {
    final res = await http.post(
      _uri(path),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _decodeObject(res);
  }

  Future<Map<String, dynamic>> putJson(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      _uri(path),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _decodeObject(res);
  }

  Future<Map<String, dynamic>> patchJson(String path, Map<String, dynamic> body) async {
    final res = await http.patch(
      _uri(path),
      headers: _headers(),
      body: jsonEncode(body),
    );
    return _decodeObject(res);
  }

  Future<void> delete(String path) async {
    final res = await http.delete(_uri(path), headers: _headers());
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _decodeMessage(res));
    }
  }

  Future<String> login(String email, String password) async {
    final res = await http.post(
      _uri('/auth/login'),
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
      body: {'username': email, 'password': password},
    );
    final data = _decodeObject(res);
    return data['access_token'] as String;
  }

  Future<void> validateToken() async {
    final res = await http.get(_uri('/auth/me'), headers: _headers());
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _decodeMessage(res));
    }
  }

  Map<String, String> _headers() {
    final headers = {'Content-Type': 'application/json'};
    final token = tokenProvider();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Map<String, dynamic> _decodeObject(http.Response res) {
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _decodeMessage(res));
    }
    if (res.body.isEmpty) return {};
    final data = jsonDecode(res.body);
    if (data is Map<String, dynamic>) return data;
    throw ApiException(res.statusCode, 'Unexpected response');
  }

  List<dynamic> _decodeList(http.Response res) {
    if (res.statusCode >= 400) {
      throw ApiException(res.statusCode, _decodeMessage(res));
    }
    if (res.body.isEmpty) return [];
    final data = jsonDecode(res.body);
    if (data is List) return data;
    throw ApiException(res.statusCode, 'Unexpected response');
  }

  String _decodeMessage(http.Response res) {
    try {
      final data = jsonDecode(res.body);
      if (data is Map && data['detail'] != null) {
        return data['detail'].toString();
      }
    } catch (_) {}
    return 'Request failed';
  }
}
