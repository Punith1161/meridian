import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../utils/date_helpers.dart';
import '../widgets/app_shell.dart';
import '../widgets/note_editor.dart';

class NotesPage extends StatefulWidget {
  final String? noteId;
  const NotesPage({super.key, this.noteId});

  @override
  State<NotesPage> createState() => _NotesPageState();
}

class _NotesPageState extends State<NotesPage> {
  int? _confirmDeleteId;

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppShell(
      title: 'Notes',
      child: Consumer<AppState>(
        builder: (context, state, _) {
          final notes = [...state.notes]
            ..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
            final selectedId = widget.noteId == null
              ? null
              : int.tryParse(widget.noteId!);
            final selected = selectedId == null
              ? (notes.isNotEmpty ? notes.first : null)
              : notes.where((n) => n.id == selectedId).firstOrNull;

          return Row(
            children: [
              Container(
                width: 280,
                decoration: BoxDecoration(
                  color: c.bgSecondary,
                  border: Border(right: BorderSide(color: c.borderPrimary)),
                ),
                child: Column(
                  children: [
                    Padding(
                      padding: const EdgeInsets.all(12),
                      child: SizedBox(
                        width: double.infinity,
                        child: FilledButton.icon(
                          style: FilledButton.styleFrom(
                            backgroundColor: c.accent,
                            foregroundColor: Colors.white,
                            padding:
                                const EdgeInsets.symmetric(vertical: 10),
                          ),
                          onPressed: () {
                            context.read<AppState>().addNote().then((n) {
                              if (n != null && context.mounted) {
                                context.go('/notes/${n.id}');
                              }
                            });
                          },
                          icon: const Icon(Icons.add, size: 16),
                          label: const Text('New note'),
                        ),
                      ),
                    ),
                    Expanded(
                      child: ListView.builder(
                        itemCount: notes.length,
                        itemBuilder: (_, i) {
                          final n = notes[i];
                          final isActive = selected?.id == n.id;
                          return InkWell(
                            onTap: () => context.go('/notes/${n.id}'),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 14, vertical: 10),
                              decoration: BoxDecoration(
                                color: isActive ? c.accentSubtle : null,
                                border: Border(
                                  left: BorderSide(
                                      color: isActive
                                          ? c.accent
                                          : Colors.transparent,
                                      width: 2),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    n.title,
                                    style: TextStyle(
                                      color: c.textPrimary,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 2),
                                  Text(relativeTimestamp(n.updatedAt),
                                      style: TextStyle(
                                          color: c.textTertiary,
                                          fontSize: 11)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: selected == null
                    ? Center(
                        child: Text('No notes yet.',
                            style: TextStyle(color: c.textTertiary)),
                      )
                    : Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Expanded(
                            child: NoteEditor(
                              key: ValueKey(selected.id),
                              note: selected,
                              onChanged: (n) {
                                context.read<AppState>().updateNote(n);
                              },
                            ),
                          ),
                          Container(
                            height: 44,
                            decoration: BoxDecoration(
                              color: c.bgSecondary,
                              border: Border(
                                  top: BorderSide(color: c.borderPrimary)),
                            ),
                            padding:
                                const EdgeInsets.symmetric(horizontal: 16),
                            child: Row(children: [
                              Text('Saved ${relativeTimestamp(selected.updatedAt)}',
                                  style: TextStyle(
                                      color: c.textTertiary, fontSize: 12)),
                              const Spacer(),
                              TextButton.icon(
                                icon: Icon(Icons.delete_outline,
                                    size: 16,
                                    color: _confirmDeleteId == selected.id
                                        ? c.danger
                                        : c.textSecondary),
                                label: Text(
                                  _confirmDeleteId == selected.id
                                      ? 'Click again to delete'
                                      : 'Delete',
                                  style: TextStyle(
                                      color: _confirmDeleteId == selected.id
                                          ? c.danger
                                          : c.textSecondary),
                                ),
                                onPressed: () {
                                  if (_confirmDeleteId == selected.id) {
                                    context
                                        .read<AppState>()
                                        .deleteNote(selected.id)
                                        .then((_) {
                                      if (!mounted) return;
                                      setState(() => _confirmDeleteId = null);
                                      context.go('/notes');
                                    });
                                  } else {
                                    setState(() =>
                                        _confirmDeleteId = selected.id);
                                  }
                                },
                              ),
                            ]),
                          ),
                        ],
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

extension<T> on Iterable<T> {
  T? get firstOrNull => isEmpty ? null : first;
}
