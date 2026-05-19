import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';
import '../state/auth_controller.dart';
import '../theme/app_theme.dart';
import 'sidebar.dart';

class AppShell extends StatelessWidget {
  final Widget child;
  final String title;
  final List<Widget> actions;
  const AppShell({
    super.key,
    required this.child,
    required this.title,
    this.actions = const [],
  });

  @override
  Widget build(BuildContext context) {
    final c = context.c;
    return Scaffold(
      backgroundColor: c.bgPrimary,
      body: Row(
        children: [
          const Sidebar(),
          Expanded(
            child: Column(
              children: [
                Container(
                  height: 56,
                  decoration: BoxDecoration(
                    color: c.bgPrimary,
                    border: Border(bottom: BorderSide(color: c.borderPrimary)),
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: c.textPrimary,
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const Spacer(),
                      ...actions,
                      const SizedBox(width: 8),
                      IconButton(
                        tooltip: 'Log out',
                        icon: Icon(Icons.logout, size: 18, color: c.textSecondary),
                        onPressed: () async {
                          await context.read<AuthController>().logout();
                          if (context.mounted) context.go('/login');
                        },
                      ),
                    ],
                  ),
                ),
                Expanded(child: child),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
