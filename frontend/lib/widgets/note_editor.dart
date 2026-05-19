import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import '../models/note.dart';
import '../theme/app_theme.dart';

class NoteEditor extends StatefulWidget {
  final Note note;
  final void Function(Note) onChanged;
  const NoteEditor({super.key, required this.note, required this.onChanged});

  @override
  State<NoteEditor> createState() => _NoteEditorState();
}

class _NoteEditorState extends State<NoteEditor> {
  late TextEditingController _title;
  late TextEditingController _content;
  Timer? _debounce;

  @override
  void initState() {
    super.initState();
    _title = TextEditingController(text: widget.note.title);
    _content = TextEditingController(text: widget.note.content);
  }

  @override
  void didUpdateWidget(covariant NoteEditor old) {
    super.didUpdateWidget(old);
    if (old.note.id != widget.note.id) {
      _title.text = widget.note.title;
      _content.text = widget.note.content;
    }
  }

  void _scheduleSave() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 600), () {
      widget.note.title = _title.text.isEmpty ? 'Untitled' : _title.text;
      widget.note.content = _content.text;
      widget.onChanged(widget.note);
    });
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _title.dispose();
    _content.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final wide = MediaQuery.of(context).size.width > 900;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
          child: TextField(
            controller: _title,
            onChanged: (_) => _scheduleSave(),
            style: TextStyle(
              color: c.textPrimary,
              fontSize: 24,
              fontWeight: FontWeight.w700,
            ),
            decoration: const InputDecoration(
              border: InputBorder.none,
              enabledBorder: InputBorder.none,
              focusedBorder: InputBorder.none,
              filled: false,
              contentPadding: EdgeInsets.zero,
              hintText: 'Untitled',
            ),
          ),
        ),
        Divider(height: 1, color: c.borderPrimary),
        Expanded(
          child: wide
              ? Row(
                  children: [
                    Expanded(child: _buildEditor(c)),
                    Container(width: 1, color: c.borderPrimary),
                    Expanded(child: _buildPreview(c)),
                  ],
                )
              : _buildEditor(c),
        ),
      ],
    );
  }

  Widget _buildEditor(AppColors c) => Container(
        color: c.bgPrimary,
        padding: const EdgeInsets.all(20),
        child: TextField(
          controller: _content,
          onChanged: (_) => _scheduleSave(),
          maxLines: null,
          expands: true,
          textAlignVertical: TextAlignVertical.top,
          style: TextStyle(
            color: c.textPrimary,
            fontFamily: 'DMMono',
            fontFamilyFallback: const ['monospace'],
            fontSize: 13,
            height: 1.5,
          ),
          decoration: InputDecoration(
            hintText: '# Start writing…',
            hintStyle: TextStyle(color: c.textTertiary),
            border: InputBorder.none,
            enabledBorder: InputBorder.none,
            focusedBorder: InputBorder.none,
            filled: false,
            contentPadding: EdgeInsets.zero,
          ),
        ),
      );

  Widget _buildPreview(AppColors c) => Container(
        color: c.bgSecondary,
        padding: const EdgeInsets.all(20),
        child: Markdown(
          data: _content.text.isEmpty ? '_Nothing to preview yet._' : _content.text,
          selectable: true,
          styleSheet: MarkdownStyleSheet(
            p: TextStyle(color: c.textPrimary, fontSize: 14, height: 1.5),
            h1: TextStyle(
                color: c.textPrimary, fontSize: 22, fontWeight: FontWeight.w700),
            h2: TextStyle(
                color: c.textPrimary, fontSize: 18, fontWeight: FontWeight.w600),
            h3: TextStyle(
                color: c.textPrimary, fontSize: 16, fontWeight: FontWeight.w600),
            code: TextStyle(
              color: c.accent,
              backgroundColor: c.bgTertiary,
              fontFamily: 'DMMono',
              fontFamilyFallback: const ['monospace'],
            ),
            blockquote: TextStyle(color: c.textSecondary),
            listBullet: TextStyle(color: c.textPrimary),
          ),
        ),
      );
}
