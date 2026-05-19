import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../state/app_state.dart';
import '../theme/app_theme.dart';
import '../widgets/app_shell.dart';
import '../widgets/sheet_grid.dart';

class SheetsPage extends StatefulWidget {
  final String? sheetId;
  const SheetsPage({super.key, this.sheetId});
  @override
  State<SheetsPage> createState() => _SheetsPageState();
}

class _SheetsPageState extends State<SheetsPage> {
  late TextEditingController _nameCtrl;
  int? _ctrlForId;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return AppShell(
      title: 'Sheets',
      child: Consumer<AppState>(
        builder: (context, state, _) {
          final sheets = state.sheets;
            final selectedId = widget.sheetId == null
              ? null
              : int.tryParse(widget.sheetId!);
            final selected = selectedId == null
              ? (sheets.isNotEmpty ? sheets.first : null)
              : sheets.where((s) => s.id == selectedId).firstOrNull;

          if (selected != null && _ctrlForId != selected.id) {
            _nameCtrl.text = selected.name;
            _ctrlForId = selected.id;
          }

          return Row(
            children: [
              Container(
                width: 240,
                decoration: BoxDecoration(
                  color: c.bgSecondary,
                  border: Border(right: BorderSide(color: c.borderPrimary)),
                ),
                child: Column(children: [
                  Padding(
                    padding: const EdgeInsets.all(12),
                    child: SizedBox(
                      width: double.infinity,
                      child: FilledButton.icon(
                        style: FilledButton.styleFrom(
                          backgroundColor: c.accent,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 10),
                        ),
                        onPressed: () {
                          context.read<AppState>().addSheet().then((s) {
                            if (s != null && context.mounted) {
                              context.go('/sheets/${s.id}');
                            }
                          });
                        },
                        icon: const Icon(Icons.add, size: 16),
                        label: const Text('New sheet'),
                      ),
                    ),
                  ),
                  Expanded(
                    child: ListView.builder(
                      itemCount: sheets.length,
                      itemBuilder: (_, i) {
                        final s = sheets[i];
                        final isActive = selected?.id == s.id;
                        return InkWell(
                          onTap: () => context.go('/sheets/${s.id}'),
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
                            child: Row(children: [
                              Icon(Icons.grid_on,
                                  size: 14, color: c.textTertiary),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(s.name,
                                    style: TextStyle(
                                        color: c.textPrimary,
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500),
                                    overflow: TextOverflow.ellipsis),
                              ),
                            ]),
                          ),
                        );
                      },
                    ),
                  ),
                ]),
              ),
              Expanded(
                child: selected == null
                    ? Center(
                        child: Text('No sheets yet.',
                            style: TextStyle(color: c.textTertiary)),
                      )
                    : Padding(
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(children: [
                              Expanded(
                                child: TextField(
                                  controller: _nameCtrl,
                                  onChanged: (v) {
                                    selected.name = v;
                                    context.read<AppState>().updateSheet(selected);
                                  },
                                  style: TextStyle(
                                      color: c.textPrimary,
                                      fontSize: 20,
                                      fontWeight: FontWeight.w600),
                                  decoration: const InputDecoration(
                                    border: InputBorder.none,
                                    enabledBorder: InputBorder.none,
                                    focusedBorder: InputBorder.none,
                                    filled: false,
                                    contentPadding: EdgeInsets.zero,
                                  ),
                                ),
                              ),
                              OutlinedButton.icon(
                                onPressed: () {
                                  selected.addRow();
                                  context.read<AppState>().updateSheet(selected);
                                },
                                icon: const Icon(Icons.add, size: 14),
                                label: const Text('Row'),
                              ),
                              const SizedBox(width: 8),
                              OutlinedButton.icon(
                                onPressed: () {
                                  selected.addCol();
                                  context.read<AppState>().updateSheet(selected);
                                },
                                icon: const Icon(Icons.add, size: 14),
                                label: const Text('Column'),
                              ),
                              const SizedBox(width: 8),
                              IconButton(
                                tooltip: 'Delete sheet',
                                icon: Icon(Icons.delete_outline,
                                    size: 18, color: c.textSecondary),
                                onPressed: () {
                                  context
                                      .read<AppState>()
                                      .deleteSheet(selected.id)
                                      .then((_) {
                                    if (context.mounted) context.go('/sheets');
                                  });
                                },
                              ),
                            ]),
                            const SizedBox(height: 16),
                            Expanded(
                              child: SheetGrid(
                                key: ValueKey(selected.id),
                                sheet: selected,
                                onChanged: () {
                                  context.read<AppState>().updateSheet(selected);
                                },
                              ),
                            ),
                          ],
                        ),
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
