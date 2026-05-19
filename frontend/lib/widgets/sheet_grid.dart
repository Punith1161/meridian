import 'dart:async';
import 'package:flutter/material.dart';
import '../models/sheet.dart';
import '../theme/app_theme.dart';

class SheetGrid extends StatefulWidget {
  final Sheet sheet;
  final VoidCallback onChanged;
  const SheetGrid({super.key, required this.sheet, required this.onChanged});

  @override
  State<SheetGrid> createState() => _SheetGridState();
}

class _SheetGridState extends State<SheetGrid> {
  Timer? _debounce;

  void _scheduleSave() {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 1000), widget.onChanged);
  }

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final sheet = widget.sheet;
    const cellW = 140.0;
    const cellH = 32.0;
    const rowHeader = 48.0;

    return Container(
      decoration: BoxDecoration(
        color: c.bgSecondary,
        border: Border.all(color: c.borderPrimary),
        borderRadius: BorderRadius.circular(8),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header row
              Row(
                children: [
                  _cornerCell(rowHeader, cellH),
                  for (int ci = 0; ci < sheet.cols.length; ci++)
                    _headerCell(ci, cellW, cellH),
                ],
              ),
              for (int ri = 0; ri < sheet.rows.length; ri++)
                Row(
                  children: [
                    _rowHeader(ri, rowHeader, cellH),
                    for (int ci = 0; ci < sheet.cols.length; ci++)
                      _bodyCell(ri, ci, cellW, cellH),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _cornerCell(double w, double h) {
    final c = context.c;
    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: c.bgTertiary,
        border: Border(
          right: BorderSide(color: c.borderPrimary),
          bottom: BorderSide(color: c.borderPrimary),
        ),
      ),
    );
  }

  Widget _headerCell(int ci, double w, double h) {
    final c = context.c;
    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: c.bgTertiary,
        border: Border(
          right: BorderSide(color: c.borderPrimary),
          bottom: BorderSide(color: c.borderPrimary),
        ),
      ),
      child: TextFormField(
        initialValue: widget.sheet.cols[ci],
        onChanged: (v) {
          widget.sheet.cols[ci] = v;
          _scheduleSave();
        },
        textAlign: TextAlign.center,
        style: TextStyle(
          color: c.textPrimary,
          fontSize: 12,
          fontWeight: FontWeight.w600,
        ),
        decoration: const InputDecoration(
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          filled: false,
          contentPadding: EdgeInsets.symmetric(horizontal: 6, vertical: 4),
          isDense: true,
        ),
      ),
    );
  }

  Widget _rowHeader(int ri, double w, double h) {
    final c = context.c;
    return Container(
      width: w,
      height: h,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: c.bgTertiary,
        border: Border(
          right: BorderSide(color: c.borderPrimary),
          bottom: BorderSide(color: c.borderPrimary),
        ),
      ),
      child: Text(
        '${ri + 1}',
        style: TextStyle(color: c.textTertiary, fontSize: 11),
      ),
    );
  }

  Widget _bodyCell(int ri, int ci, double w, double h) {
    final c = context.c;
    return Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: c.bgPrimary,
        border: Border(
          right: BorderSide(color: c.borderPrimary),
          bottom: BorderSide(color: c.borderPrimary),
        ),
      ),
      child: TextFormField(
        initialValue: widget.sheet.rows[ri][ci],
        onChanged: (v) {
          widget.sheet.rows[ri][ci] = v;
          _scheduleSave();
        },
        style: TextStyle(
          color: c.textPrimary,
          fontFamily: 'DMMono',
          fontFamilyFallback: const ['monospace'],
          fontSize: 12,
        ),
        decoration: const InputDecoration(
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
          filled: false,
          contentPadding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          isDense: true,
        ),
      ),
    );
  }
}
