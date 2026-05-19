class Sheet {
  int id;
  String name;
  List<String> cols;
  List<List<String>> rows;
  DateTime createdAt;
  DateTime updatedAt;

  Sheet({
    required this.id,
    required this.name,
    List<String>? cols,
    List<List<String>>? rows,
    DateTime? createdAt,
    DateTime? updatedAt,
  })  : cols = cols ?? ['A', 'B', 'C', 'D', 'E'],
        rows = rows ??
            List.generate(6, (_) => List<String>.filled(5, '', growable: true)),
        createdAt = createdAt ?? DateTime.now(),
        updatedAt = updatedAt ?? DateTime.now();

  factory Sheet.fromApi(Map<String, dynamic> json) {
    final data = json['data'];
    final cols = _parseCols(data);
    final rows = _parseRows(data, cols.length);
    return Sheet(
      id: json['id'] as int,
      name: (json['name'] as String?) ?? 'Untitled sheet',
      cols: cols,
      rows: rows,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toCreateApi() {
    return {
      'name': name,
      'data': _toDataPayload(),
    };
  }

  Map<String, dynamic> toUpdateApi() {
    return {
      'name': name,
      'data': _toDataPayload(),
    };
  }

  void addRow() {
    rows.add(List<String>.filled(cols.length, '', growable: true));
    updatedAt = DateTime.now();
  }

  void addCol() {
    cols.add(_nextColName());
    for (final r in rows) {
      r.add('');
    }
    updatedAt = DateTime.now();
  }

  String _nextColName() {
    // Simple A-Z then AA, AB,...
    int n = cols.length;
    String s = '';
    n += 1;
    while (n > 0) {
      n -= 1;
      s = String.fromCharCode(65 + (n % 26)) + s;
      n ~/= 26;
    }
    return s;
  }

  Map<String, dynamic> _toDataPayload() {
    return {
      'cols': cols.map((c) => {'key': c}).toList(),
      'rows': [
        for (final row in rows)
          [for (final cell in row) {'value': cell}]
      ],
    };
  }

  static List<String> _parseCols(dynamic data) {
    if (data is Map && data['cols'] is List) {
      final list = data['cols'] as List;
      final parsed = <String>[];
      for (final item in list) {
        if (item is String) {
          parsed.add(item);
        } else if (item is Map && item['key'] != null) {
          parsed.add(item['key'].toString());
        }
      }
      if (parsed.isNotEmpty) return parsed;
    }
    return ['A', 'B', 'C', 'D', 'E'];
  }

  static List<List<String>> _parseRows(dynamic data, int colCount) {
    if (data is Map && data['rows'] is List) {
      final list = data['rows'] as List;
      final rows = <List<String>>[];
      for (final row in list) {
        if (row is List) {
          rows.add(row.map(_cellValue).toList(growable: true));
        }
      }
      if (rows.isNotEmpty) return rows;
    }
    return List.generate(6, (_) => List<String>.filled(colCount, '', growable: true));
  }

  static String _cellValue(dynamic value) {
    if (value == null) return '';
    if (value is String) return value;
    if (value is Map && value['value'] != null) return value['value'].toString();
    return '';
  }
}
