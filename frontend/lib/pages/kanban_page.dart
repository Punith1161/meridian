import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/app_shell.dart';
import '../widgets/modal.dart';
import '../widgets/task_card.dart';

class KanbanPage extends StatelessWidget {
  const KanbanPage({super.key});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppShell(
      title: 'Kanban',
      actions: [
        FilledButton.icon(
          onPressed: () => _openCreate(context),
          icon: const Icon(Icons.add, size: 16),
          label: const Text('New task'),
          style: FilledButton.styleFrom(
            backgroundColor: c.accent,
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8)),
          ),
        ),
      ],
      child: Consumer<AppState>(
        builder: (context, state, _) {
          return Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                    child: _Column(
                        title: 'To do',
                        status: TaskStatus.todo,
                        tasks: state.tasks
                            .where((t) => t.status == TaskStatus.todo)
                            .toList())),
                const SizedBox(width: 16),
                Expanded(
                    child: _Column(
                        title: 'In progress',
                        status: TaskStatus.inprogress,
                        tasks: state.tasks
                            .where((t) => t.status == TaskStatus.inprogress)
                            .toList())),
                const SizedBox(width: 16),
                Expanded(
                    child: _Column(
                        title: 'Done',
                        status: TaskStatus.done,
                        tasks: state.tasks
                            .where((t) => t.status == TaskStatus.done)
                            .toList())),
              ],
            ),
          );
        },
      ),
    );
  }

  void _openCreate(BuildContext context) {
    final title = TextEditingController();
    TaskPriority priority = TaskPriority.medium;
    DateTime? due;
    final estimate = TextEditingController();

    showAppModal(
      context: context,
      title: 'Create task',
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setLocal) {
            final c = ctx.c;
            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Title',
                    style: TextStyle(color: c.textSecondary, fontSize: 12)),
                const SizedBox(height: 6),
                TextField(controller: title),
                const SizedBox(height: 12),
                Row(children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Priority',
                            style: TextStyle(
                                color: c.textSecondary, fontSize: 12)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<TaskPriority>(
                          value: priority,
                          dropdownColor: c.bgSecondary,
                          items: TaskPriority.values
                              .map((p) => DropdownMenuItem(
                                    value: p,
                                    child: Text(p.name,
                                        style: TextStyle(color: c.textPrimary)),
                                  ))
                              .toList(),
                          onChanged: (v) =>
                              setLocal(() => priority = v ?? priority),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Estimate (min)',
                            style: TextStyle(
                                color: c.textSecondary, fontSize: 12)),
                        const SizedBox(height: 6),
                        TextField(
                          controller: estimate,
                          keyboardType: TextInputType.number,
                        ),
                      ],
                    ),
                  ),
                ]),
                const SizedBox(height: 12),
                Text('Due date',
                    style: TextStyle(color: c.textSecondary, fontSize: 12)),
                const SizedBox(height: 6),
                OutlinedButton.icon(
                  icon: Icon(Icons.calendar_today,
                      size: 14, color: c.textSecondary),
                  label: Text(
                    due == null
                        ? 'No due date'
                        : '${due!.year}-${due!.month.toString().padLeft(2, '0')}-${due!.day.toString().padLeft(2, '0')}',
                    style: TextStyle(color: c.textPrimary),
                  ),
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: ctx,
                      initialDate: DateTime.now(),
                      firstDate: DateTime(2020),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) setLocal(() => due = picked);
                  },
                  style: OutlinedButton.styleFrom(
                    side: BorderSide(color: c.borderPrimary),
                    padding: const EdgeInsets.symmetric(
                        horizontal: 12, vertical: 12),
                    alignment: Alignment.centerLeft,
                  ),
                ),
                const SizedBox(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    TextButton(
                      onPressed: () => Navigator.of(ctx).pop(),
                      child: Text('Cancel',
                          style: TextStyle(color: c.textSecondary)),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(
                      style: FilledButton.styleFrom(
                          backgroundColor: c.accent,
                          foregroundColor: Colors.white),
                      onPressed: () async {
                        if (title.text.trim().isEmpty) return;
                        await context.read<AppState>().createTask(
                              title: title.text.trim(),
                              priority: priority,
                              dueDate: due,
                              timeEstimate: int.tryParse(estimate.text),
                            );
                        Navigator.of(ctx).pop();
                      },
                      child: const Text('Create'),
                    ),
                  ],
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _Column extends StatelessWidget {
  final String title;
  final TaskStatus status;
  final List<Task> tasks;
  const _Column(
      {required this.title, required this.status, required this.tasks});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return DragTarget<Task>(
      onWillAcceptWithDetails: (d) => d.data.status != status,
      onAcceptWithDetails: (d) {
        context.read<AppState>().updateTaskStatus(d.data.id, status);
      },
      builder: (context, candidate, _) {
        final highlight = candidate.isNotEmpty;
        return Container(
          decoration: BoxDecoration(
            color: highlight ? c.accentSubtle : c.bgSecondary,
            border: Border.all(
                color: highlight ? c.accent : c.borderPrimary),
            borderRadius: BorderRadius.circular(8),
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Text(title,
                      style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 13,
                          fontWeight: FontWeight.w600)),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: c.bgTertiary,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${tasks.length}',
                      style:
                          TextStyle(color: c.textTertiary, fontSize: 11),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView.separated(
                  itemCount: tasks.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (_, i) {
                    final task = tasks[i];
                    return LongPressDraggable<Task>(
                      data: task,
                      delay: const Duration(milliseconds: 120),
                      feedback: Opacity(
                        opacity: 0.9,
                        child: SizedBox(
                          width: 280,
                          child: Material(
                            color: Colors.transparent,
                            child: TaskCard(
                              task: task,
                              onTimerToggle: () async {},
                            ),
                          ),
                        ),
                      ),
                      childWhenDragging: Opacity(
                        opacity: 0.3,
                        child: TaskCard(task: task, onTimerToggle: () async {}),
                      ),
                      child: TaskCard(
                        task: task,
                        onTimerToggle: () async {
                          final s = context.read<AppState>();
                          if (task.isRunning) {
                            await s.stopTimer(task.id);
                          } else {
                            await s.startTimer(task.id);
                          }
                        },
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
