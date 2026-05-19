import 'package:flutter/foundation.dart';
import '../api/api_client.dart';
import '../models/task.dart';
import '../models/note.dart';
import '../models/sheet.dart';
import 'auth_controller.dart';

class AppState extends ChangeNotifier {
  final AuthController auth;
  final ApiClient _api;

  List<Task> tasks = [];
  List<Note> notes = [];
  List<Sheet> sheets = [];

  bool isLoading = false;
  String? lastError;

  AppState(this.auth) : _api = auth.api {
    auth.addListener(_handleAuthChange);
    if (auth.isAuthenticated) {
      _loadAll();
    }
  }

  @override
  void dispose() {
    auth.removeListener(_handleAuthChange);
    super.dispose();
  }

  void _handleAuthChange() {
    if (auth.isAuthenticated) {
      _loadAll();
    } else {
      _clearAll();
    }
  }

  Future<void> reload() async => _loadAll();

  Future<void> _loadAll() async {
    if (isLoading) return;
    isLoading = true;
    lastError = null;
    notifyListeners();
    try {
      final taskList = await _api.getList('/tasks');
      final noteList = await _api.getList('/notes');
      final sheetList = await _api.getList('/sheets');
      tasks = taskList.map((t) => Task.fromApi(t as Map<String, dynamic>)).toList();
      notes = noteList.map((n) => Note.fromApi(n as Map<String, dynamic>)).toList();
      sheets = sheetList.map((s) => Sheet.fromApi(s as Map<String, dynamic>)).toList();
    } on ApiException catch (e) {
      await _handleApiError(e);
    } catch (_) {
      lastError = 'Unable to load data.';
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  void _clearAll() {
    tasks = [];
    notes = [];
    sheets = [];
    lastError = null;
    isLoading = false;
    notifyListeners();
  }

  Future<void> _handleApiError(ApiException e) async {
    if (e.statusCode == 401) {
      await auth.logout();
      return;
    }
    lastError = e.message;
  }

  // ---- Tasks ----------------------------------------------------------
  Future<void> createTask({
    required String title,
    TaskPriority priority = TaskPriority.medium,
    DateTime? dueDate,
    int? timeEstimate,
  }) async {
    lastError = null;
    try {
      final payload = {
        'title': title,
        'priority': taskPriorityToApi(priority),
        'due_date': formatDateOnly(dueDate),
        'time_estimate': timeEstimate,
      };
      final data = await _api.postJson('/tasks', payload);
      final task = Task.fromApi(data);
      tasks.insert(0, task);
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> updateTask(Task t) async {
    lastError = null;
    try {
      final data = await _api.putJson('/tasks/${t.id}', t.toUpdateApi());
      final updated = Task.fromApi(data);
      final i = tasks.indexWhere((x) => x.id == t.id);
      if (i != -1) tasks[i] = updated;
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> updateTaskStatus(int id, TaskStatus status) async {
    lastError = null;
    try {
      final data = await _api.patchJson('/tasks/$id/status', {
        'status': taskStatusToApi(status),
      });
      final updated = Task.fromApi(data);
      final i = tasks.indexWhere((x) => x.id == id);
      if (i != -1) tasks[i] = updated;
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> deleteTask(int id) async {
    lastError = null;
    try {
      await _api.delete('/tasks/$id');
      tasks.removeWhere((x) => x.id == id);
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> startTimer(int id) async {
    lastError = null;
    try {
      final data = await _api.postJson('/tasks/$id/timer/start', {});
      final updated = Task.fromApi(data);
      final i = tasks.indexWhere((x) => x.id == id);
      if (i != -1) tasks[i] = updated;
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> stopTimer(int id) async {
    lastError = null;
    try {
      final data = await _api.postJson('/tasks/$id/timer/stop', {});
      final updated = Task.fromApi(data);
      final i = tasks.indexWhere((x) => x.id == id);
      if (i != -1) tasks[i] = updated;
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  // ---- Notes ----------------------------------------------------------
  Future<Note?> addNote() async {
    lastError = null;
    try {
      final data = await _api.postJson('/notes', {
        'title': 'Untitled',
        'content': '',
      });
      final note = Note.fromApi(data);
      notes.insert(0, note);
      notifyListeners();
      return note;
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
      return null;
    }
  }

  Future<void> updateNote(Note n) async {
    lastError = null;
    try {
      final data = await _api.putJson('/notes/${n.id}', n.toUpdateApi());
      final updated = Note.fromApi(data);
      final i = notes.indexWhere((x) => x.id == n.id);
      if (i != -1) {
        notes[i] = updated;
        notes.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
      }
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> deleteNote(int id) async {
    lastError = null;
    try {
      await _api.delete('/notes/$id');
      notes.removeWhere((x) => x.id == id);
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  // ---- Sheets ---------------------------------------------------------
  Future<Sheet?> addSheet() async {
    lastError = null;
    try {
      final data = await _api.postJson('/sheets', {
        'name': 'Untitled sheet',
      });
      final sheet = Sheet.fromApi(data);
      sheets.insert(0, sheet);
      notifyListeners();
      return sheet;
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
      return null;
    }
  }

  Future<void> updateSheet(Sheet s) async {
    lastError = null;
    try {
      final data = await _api.putJson('/sheets/${s.id}', s.toUpdateApi());
      final updated = Sheet.fromApi(data);
      final i = sheets.indexWhere((x) => x.id == s.id);
      if (i != -1) sheets[i] = updated;
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  Future<void> deleteSheet(int id) async {
    lastError = null;
    try {
      await _api.delete('/sheets/$id');
      sheets.removeWhere((x) => x.id == id);
      notifyListeners();
    } on ApiException catch (e) {
      await _handleApiError(e);
      notifyListeners();
    }
  }

  // ---- Today summary --------------------------------------------------
  int get tasksToday {
    final now = DateTime.now();
    return tasks
        .where((t) =>
            t.dueDate != null &&
            t.dueDate!.year == now.year &&
            t.dueDate!.month == now.month &&
            t.dueDate!.day == now.day)
        .length;
  }

  int get tasksDoneToday {
    final now = DateTime.now();
    return tasks
        .where((t) =>
            t.status == TaskStatus.done &&
            t.dueDate != null &&
            t.dueDate!.year == now.year &&
            t.dueDate!.month == now.month &&
            t.dueDate!.day == now.day)
        .length;
  }

  int get totalTimeTrackedToday =>
      tasks.fold<int>(0, (sum, t) => sum + t.liveTimeSpent);
}
