import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/date_helpers.dart';
import '../utils/format_time.dart';
import '../widgets/app_shell.dart';
import '../widgets/modal.dart';

class AllTasksPage extends StatefulWidget {
  const AllTasksPage({super.key});
  @override
  State<AllTasksPage> createState() => _AllTasksPageState();
}

class _AllTasksPageState extends State<AllTasksPage> {
  TaskPriority? _priority;
  TaskStatus? _status;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppShell(
      title: 'All tasks',
      child: Consumer<AppState>(
        builder: (context, state, _) {
          final filtered = state.tasks.where((t) {
            if (_priority != null && t.priority != _priority) return false;
            if (_status != null && t.status != _status) return false;
            return true;
          }).toList();

          return Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    _filterDropdown<TaskPriority>(
                      hint: 'All priorities',
                      value: _priority,
                      items: TaskPriority.values,
                      onChanged: (v) => setState(() => _priority = v),
                      labelFor: (p) => p?.name ?? 'All priorities',
                    ),
                    const SizedBox(width: 12),
                    _filterDropdown<TaskStatus>(
                      hint: 'All statuses',
                      value: _status,
                      items: TaskStatus.values,
                      onChanged: (v) => setState(() => _status = v),
                      labelFor: (s) => s?.name ?? 'All statuses',
                    ),
                    const Spacer(),
                    Text('${filtered.length} tasks',
                        style: TextStyle(color: c.textSecondary)),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: c.bgSecondary,
                      border: Border.all(color: c.borderPrimary),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: SingleChildScrollView(
                      child: DataTable(
                        headingRowColor:
                            WidgetStatePropertyAll(c.bgTertiary),
                        dataRowMinHeight: 44,
                        dataRowMaxHeight: 44,
                        columnSpacing: 24,
                        dividerThickness: 1,
                        columns: const [
                          DataColumn(label: Text('Title')),
                          DataColumn(label: Text('Priority')),
                          DataColumn(label: Text('Status')),
                          DataColumn(label: Text('Due')),
                          DataColumn(label: Text('Estimate')),
                          DataColumn(label: Text('Spent')),
                        ],
                        rows: [
                          for (final t in filtered)
                            DataRow(
                              onSelectChanged: (_) => _openEdit(context, t),
                              cells: [
                                DataCell(Text(t.title,
                                    style: TextStyle(color: c.textPrimary))),
                                DataCell(Text(t.priority.name,
                                    style: TextStyle(color: c.textSecondary))),
                                DataCell(Text(t.status.name,
                                    style: TextStyle(color: c.textSecondary))),
                                DataCell(Text(relativeDate(t.dueDate),
                                    style: TextStyle(color: c.textSecondary))),
                                DataCell(Text(
                                    t.timeEstimate == null
                                        ? '—'
                                        : '${t.timeEstimate}m',
                                    style: TextStyle(color: c.textSecondary))),
                                DataCell(Text(formatTime(t.liveTimeSpent),
                                    style: TextStyle(
                                        color: c.textSecondary,
                                        fontFamily: 'DMMono',
                                        fontFamilyFallback: const [
                                          'monospace'
                                        ]))),
                              ],
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _filterDropdown<T>({
    required String hint,
    required T? value,
    required List<T> items,
    required void Function(T?) onChanged,
    required String Function(T?) labelFor,
  }) {
    final c = context.c;
    return Container(
      decoration: BoxDecoration(
        color: c.bgSecondary,
        border: Border.all(color: c.borderPrimary),
        borderRadius: BorderRadius.circular(8),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 10),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<T?>(
          value: value,
          hint: Text(hint, style: TextStyle(color: c.textTertiary)),
          dropdownColor: c.bgSecondary,
          items: [
            DropdownMenuItem<T?>(
                value: null,
                child: Text(hint, style: TextStyle(color: c.textPrimary))),
            for (final it in items)
              DropdownMenuItem<T?>(
                value: it,
                child: Text(labelFor(it),
                    style: TextStyle(color: c.textPrimary)),
              ),
          ],
          onChanged: onChanged,
        ),
      ),
    );
  }

  void _openEdit(BuildContext context, Task task) {
    final title = TextEditingController(text: task.title);
    TaskPriority priority = task.priority;
    TaskStatus status = task.status;
    final estimate = TextEditingController(
        text: task.timeEstimate?.toString() ?? '');
    showAppModal(
      context: context,
      title: 'Edit task',
      builder: (ctx) => StatefulBuilder(builder: (ctx, setLocal) {
        final c = ctx.c;
        return Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            TextField(controller: title),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(
                child: DropdownButtonFormField<TaskPriority>(
                  value: priority,
                  dropdownColor: c.bgSecondary,
                  items: TaskPriority.values
                      .map((p) =>
                          DropdownMenuItem(value: p, child: Text(p.name)))
                      .toList(),
                  onChanged: (v) => setLocal(() => priority = v ?? priority),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: DropdownButtonFormField<TaskStatus>(
                  value: status,
                  dropdownColor: c.bgSecondary,
                  items: TaskStatus.values
                      .map((s) =>
                          DropdownMenuItem(value: s, child: Text(s.name)))
                      .toList(),
                  onChanged: (v) => setLocal(() => status = v ?? status),
                ),
              ),
            ]),
            const SizedBox(height: 12),
            TextField(
              controller: estimate,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(hintText: 'Estimate (min)'),
            ),
            const SizedBox(height: 20),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              TextButton.icon(
                icon: Icon(Icons.delete_outline, color: c.danger, size: 16),
                label: Text('Delete', style: TextStyle(color: c.danger)),
                onPressed: () async {
                  await context.read<AppState>().deleteTask(task.id);
                  if (ctx.mounted) Navigator.of(ctx).pop();
                },
              ),
              Row(children: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  style: FilledButton.styleFrom(
                      backgroundColor: c.accent,
                      foregroundColor: Colors.white),
                  onPressed: () async {
                    task.title = title.text;
                    task.priority = priority;
                    task.status = status;
                    task.timeEstimate = int.tryParse(estimate.text);
                    await context.read<AppState>().updateTask(task);
                    if (ctx.mounted) Navigator.of(ctx).pop();
                  },
                  child: const Text('Save'),
                ),
              ]),
            ]),
          ],
        );
      }),
    );
  }
}
