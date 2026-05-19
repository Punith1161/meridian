import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../state/theme_controller.dart';
import '../theme/app_theme.dart';

class _NavItem {
  final IconData icon;
  final String label;
  final String path;
  const _NavItem(this.icon, this.label, this.path);
}

const _items = <_NavItem>[
  _NavItem(Icons.dashboard_outlined, 'Kanban', '/'),
  _NavItem(Icons.today_outlined, 'Today', '/today'),
  _NavItem(Icons.list_alt_outlined, 'All Tasks', '/tasks'),
  _NavItem(Icons.description_outlined, 'Notes', '/notes'),
  _NavItem(Icons.grid_on_outlined, 'Sheets', '/sheets'),
];

class Sidebar extends StatelessWidget {
  const Sidebar({super.key});

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).uri.path;
    final c = context.c;
    final theme = context.watch<ThemeController>();
    return Container(
      width: 56,
      decoration: BoxDecoration(
        color: c.bgSecondary,
        border: Border(right: BorderSide(color: c.borderPrimary)),
      ),
      child: Column(
        children: [
          const SizedBox(height: 12),
          // Logo
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: c.accent,
              borderRadius: BorderRadius.circular(6),
            ),
            alignment: Alignment.center,
            child: const Text(
              'M',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          const SizedBox(height: 16),
          for (final item in _items)
            _SidebarButton(
              icon: item.icon,
              label: item.label,
              selected: _isSelected(loc, item.path),
              onTap: () => context.go(item.path),
            ),
          const Spacer(),
          _SidebarButton(
            icon: theme.isDark ? Icons.light_mode_outlined : Icons.dark_mode_outlined,
            label: theme.isDark ? 'Light mode' : 'Dark mode',
            selected: false,
            onTap: theme.toggle,
          ),
          _SidebarButton(
            icon: Icons.settings_outlined,
            label: 'Settings',
            selected: false,
            onTap: () {},
          ),
          const SizedBox(height: 8),
        ],
      ),
    );
  }

  bool _isSelected(String loc, String path) {
    if (path == '/') return loc == '/';
    return loc == path || loc.startsWith('$path/');
  }
}

class _SidebarButton extends StatefulWidget {
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;
  const _SidebarButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  State<_SidebarButton> createState() => _SidebarButtonState();
}

class _SidebarButtonState extends State<_SidebarButton> {
  bool _hover = false;
  @override
  Widget build(BuildContext context) {
    final c = context.c;
    final bg = widget.selected
        ? c.accentSubtle
        : (_hover ? c.bgHover : Colors.transparent);
    final iconColor = widget.selected ? c.accent : c.textSecondary;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2, horizontal: 8),
      child: Tooltip(
        message: widget.label,
        waitDuration: const Duration(milliseconds: 300),
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          onEnter: (_) => setState(() => _hover = true),
          onExit: (_) => setState(() => _hover = false),
          child: GestureDetector(
            onTap: widget.onTap,
            child: Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: bg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(widget.icon, size: 20, color: iconColor),
            ),
          ),
        ),
      ),
    );
  }
}
