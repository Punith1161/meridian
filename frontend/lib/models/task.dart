enum TaskPriority { high, medium, low }
enum TaskStatus { todo, inprogress, done }

TaskPriority taskPriorityFromApi(String? value) {
  switch (value) {
    case 'high':
      return TaskPriority.high;
    case 'low':
      return TaskPriority.low;
    default:
      return TaskPriority.medium;
  }
}

TaskStatus taskStatusFromApi(String? value) {
  switch (value) {
    case 'done':
      return TaskStatus.done;
    case 'inprogress':
    case 'in_progress':
      return TaskStatus.inprogress;
    default:
      return TaskStatus.todo;
  }
}

String taskPriorityToApi(TaskPriority value) => value.name;
String taskStatusToApi(TaskStatus value) =>
    value == TaskStatus.inprogress ? 'inprogress' : value.name;

String? formatDateOnly(DateTime? date) {
  if (date == null) return null;
  return date.toIso8601String().split('T').first;
}

class Task {
  int id;
  String title;
  TaskPriority priority;
  TaskStatus status;
  DateTime? dueDate;
  int? timeEstimate; // minutes
  int timeSpent; // seconds
  DateTime? timerStartedAt;
  DateTime createdAt;
  DateTime updatedAt;

  Task({
    required this.id,
    required this.title,
    this.priority = TaskPriority.medium,
    this.status = TaskStatus.todo,
    this.dueDate,
    this.timeEstimate,
    this.timeSpent = 0,
    this.timerStartedAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory Task.fromApi(Map<String, dynamic> json) {
    return Task(
      id: json['id'] as int,
      title: (json['title'] as String?) ?? '',
      priority: taskPriorityFromApi(json['priority'] as String?),
      status: taskStatusFromApi(json['status'] as String?),
      dueDate: json['due_date'] == null
          ? null
          : DateTime.parse(json['due_date'] as String),
      timeEstimate: json['time_estimate'] as int?,
      timeSpent: (json['time_spent'] as int?) ?? 0,
      timerStartedAt: json['timer_started_at'] == null
          ? null
          : DateTime.parse(json['timer_started_at'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toCreateApi() {
    return {
      'title': title,
      'priority': taskPriorityToApi(priority),
      'due_date': formatDateOnly(dueDate),
      'time_estimate': timeEstimate,
    };
  }

  Map<String, dynamic> toUpdateApi() {
    return {
      'title': title,
      'priority': taskPriorityToApi(priority),
      'due_date': formatDateOnly(dueDate),
      'time_estimate': timeEstimate,
    };
  }

  bool get isRunning => timerStartedAt != null;

  int get liveTimeSpent {
    if (timerStartedAt == null) return timeSpent;
    final delta = DateTime.now().difference(timerStartedAt!).inSeconds;
    return timeSpent + delta;
  }
}
