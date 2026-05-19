class Note {
  int id;
  String title;
  String content;
  DateTime createdAt;
  DateTime updatedAt;

  Note({
    required this.id,
    this.title = 'Untitled',
    this.content = '',
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory Note.fromApi(Map<String, dynamic> json) {
    return Note(
      id: json['id'] as int,
      title: (json['title'] as String?) ?? 'Untitled',
      content: (json['content'] as String?) ?? '',
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toCreateApi() {
    return {
      'title': title,
      'content': content,
    };
  }

  Map<String, dynamic> toUpdateApi() {
    return {
      'title': title,
      'content': content,
    };
  }
}
