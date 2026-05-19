import 'package:flutter/material.dart';
import '../theme/app_theme.dart';

Future<T?> showAppModal<T>({
  required BuildContext context,
  required String title,
  required Widget Function(BuildContext) builder,
}) {
  return showDialog<T>(
    context: context,
    barrierColor: context.c.overlay,
    builder: (ctx) {
      final c = ctx.c;
      return Center(
        child: Material(
          color: Colors.transparent,
          child: Container(
            width: 480,
            constraints: const BoxConstraints(maxHeight: 600),
            decoration: BoxDecoration(
              color: c.bgSecondary,
              border: Border.all(color: c.borderPrimary),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text(
                          title,
                          style: TextStyle(
                            color: c.textPrimary,
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                      IconButton(
                        icon: Icon(Icons.close,
                            size: 18, color: c.textSecondary),
                        onPressed: () => Navigator.of(ctx).pop(),
                      ),
                    ],
                  ),
                ),
                Divider(height: 1, color: c.borderPrimary),
                Flexible(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: builder(ctx),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    },
  );
}
