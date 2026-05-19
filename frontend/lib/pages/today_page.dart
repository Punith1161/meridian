import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/task.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/date_helpers.dart';
import '../utils/format_time.dart';
import '../widgets/app_shell.dart';

class TodayPage extends StatelessWidget {
  const TodayPage({super.key});

  @override
  Widget build(BuildContext context) {
    return AppShell(
      title: 'Today',
      child: Consumer<AppState>(
        builder: (context, state, _) {
          final todays = state.tasks.where((t) => isToday(t.dueDate)).toList();
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    Expanded(
                        child: _StatCard(
                            label: 'Tasks today',
                            value: '${state.tasksToday}')),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _StatCard(
                            label: 'Completed',
                            value:
                                '${state.tasksDoneToday}/${state.tasksToday}')),
                    const SizedBox(width: 12),
                    Expanded(
                        child: _StatCard(
                            label: 'Time tracked',
                            value: formatHoursMinutes(
                                state.totalTimeTrackedToday))),
                  ],
                ),
                const SizedBox(height: 20),
                Container(
                  decoration: BoxDecoration(
                    color: context.c.bgSecondary,
                    border: Border.all(color: context.c.borderPrimary),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Column(
                    children: [
                      for (int i = 0; i < todays.length; i++) ...[
                        if (i > 0)
                          Divider(
                              height: 1, color: context.c.borderPrimary),
                        _TodayItem(task: todays[i]),
                      ],
                      if (todays.isEmpty)
                        Padding(
                          padding: const EdgeInsets.all(40),
                          child: Text(
                            'Nothing due today.',
                            style: TextStyle(color: context.c.textTertiary),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  const _StatCard({required this.label, required this.value});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: c.bgSecondary,
        border: Border.all(color: c.borderPrimary),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label,
              style: TextStyle(color: c.textSecondary, fontSize: 12)),
          const SizedBox(height: 8),
          Text(value,
              style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 26,
                  fontWeight: FontWeight.w700,
                  fontFamily: 'DMMono',
                  fontFamilyFallback: const ['monospace'])),
        ],
      ),
    );
  }
}

class _TodayItem extends StatelessWidget {
  final Task task;
  const _TodayItem({required this.task});
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final done = task.status == TaskStatus.done;
    return InkWell(
      onTap: () async {
        await context.read<AppState>().updateTaskStatus(
            task.id, done ? TaskStatus.todo : TaskStatus.done);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              width: 18,
              height: 18,
              decoration: BoxDecoration(
                color: done ? c.success : Colors.transparent,
                border: Border.all(
                    color: done ? c.success : c.borderSecondary, width: 1.5),
                borderRadius: BorderRadius.circular(4),
              ),
              child: done
                  ? const Icon(Icons.check, size: 12, color: Colors.white)
                  : null,
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                task.title,
                style: TextStyle(
                  color: done ? c.textTertiary : c.textPrimary,
                  fontSize: 14,
                  decoration:
                      done ? TextDecoration.lineThrough : TextDecoration.none,
                ),
              ),
            ),
            Text(
              formatTime(task.liveTimeSpent),
              style: TextStyle(
                  color: c.textTertiary,
                  fontSize: 12,
                  fontFamily: 'DMMono',
                  fontFamilyFallback: const ['monospace']),
            ),
          ],
        ),
      ),
    );
  }
}
