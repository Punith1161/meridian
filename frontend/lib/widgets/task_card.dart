import 'dart:async';
import 'package:flutter/material.dart';
import '../models/task.dart';
import '../theme/app_theme.dart';
import '../utils/format_time.dart';

class TimerButton extends StatelessWidget {
  final bool running;
  final VoidCallback onTap;
  const TimerButton({super.key, required this.running, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final color = running ? c.success : c.textTertiary;
    final border = running ? c.success : c.borderSecondary;
    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: border, width: 1.5),
          ),
          alignment: Alignment.center,
          child: Icon(
            running ? Icons.pause : Icons.play_arrow,
            size: 14,
            color: color,
          ),
        ),
      ),
    );
  }
}

class TaskCard extends StatefulWidget {
  final Task task;
  final Future<void> Function() onTimerToggle;
  final VoidCallback? onTap;
  const TaskCard({
    super.key,
    required this.task,
    required this.onTimerToggle,
    this.onTap,
  });

  @override
  State<TaskCard> createState() => _TaskCardState();
}

class _TaskCardState extends State<TaskCard> {
  Timer? _ticker;

  @override
  void didUpdateWidget(covariant TaskCard old) {
    super.didUpdateWidget(old);
    _syncTicker();
  }

  @override
  void initState() {
    super.initState();
    _syncTicker();
  }

  void _syncTicker() {
    _ticker?.cancel();
    if (widget.task.isRunning) {
      _ticker = Timer.periodic(const Duration(seconds: 1), (_) {
        if (mounted) setState(() {});
      });
    }
  }

  @override
  void dispose() {
    _ticker?.cancel();
    super.dispose();
  }

  Color _priorityColor(BuildContext context) {
    switch (widget.task.priority) {
      case TaskPriority.high:
        return context.c.danger;
      case TaskPriority.medium:
        return context.c.warning;
      case TaskPriority.low:
        return context.c.success;
    }
  }

  Color _prioritySubtle(BuildContext context) {
    switch (widget.task.priority) {
      case TaskPriority.high:
        return context.c.dangerSubtle;
      case TaskPriority.medium:
        return context.c.warningSubtle;
      case TaskPriority.low:
        return context.c.successSubtle;
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final task = widget.task;
    final estSec = (task.timeEstimate ?? 0) * 60;
    final spent = task.liveTimeSpent;
    final progress = estSec == 0 ? 0.0 : (spent / estSec).clamp(0.0, 1.0);

    return MouseRegion(
      cursor: SystemMouseCursors.click,
      child: GestureDetector(
        onTap: widget.onTap,
        child: Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: c.bgSecondary,
            border: Border.all(color: c.borderPrimary),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                task.title,
                style: TextStyle(
                  color: c.textPrimary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  height: 1.3,
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: _prioritySubtle(context),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      task.priority.name,
                      style: TextStyle(
                        color: _priorityColor(context),
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  if (task.dueDate != null)
                    Text(
                      '${task.dueDate!.month}/${task.dueDate!.day}',
                      style: TextStyle(color: c.textTertiary, fontSize: 11),
                    ),
                  const Spacer(),
                  Text(
                    formatTime(spent),
                    style: TextStyle(
                      color: task.isRunning ? c.success : c.textSecondary,
                      fontSize: 11,
                      fontFamily: 'DMMono',
                      fontFamilyFallback: const ['monospace'],
                    ),
                  ),
                  const SizedBox(width: 8),
                  TimerButton(
                    running: task.isRunning,
                    onTap: () {
                      widget.onTimerToggle();
                    },
                  ),
                ],
              ),
              if (estSec > 0) ...[
                const SizedBox(height: 10),
                ClipRRect(
                  borderRadius: BorderRadius.circular(2),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 3,
                    backgroundColor: c.bgTertiary,
                    valueColor: AlwaysStoppedAnimation(c.accent),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
