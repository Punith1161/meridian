import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'pages/all_tasks_page.dart';
import 'pages/kanban_page.dart';
import 'pages/login_page.dart';
import 'pages/notes_page.dart';
import 'pages/sheets_page.dart';
import 'pages/today_page.dart';
import 'state/app_state.dart';
import 'state/auth_controller.dart';
import 'state/theme_controller.dart';
import 'theme/app_theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthController();
  final theme = ThemeController();
  await Future.wait([auth.load(), theme.load()]);
  runApp(MeridianApp(auth: auth, theme: theme));
}

class MeridianApp extends StatelessWidget {
  final AuthController auth;
  final ThemeController theme;
  const MeridianApp({super.key, required this.auth, required this.theme});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        ChangeNotifierProvider.value(value: theme),
        ChangeNotifierProvider(create: (_) => AppState(auth)),
      ],
      child: Consumer<ThemeController>(
        builder: (context, t, _) {
          final router = _buildRouter(auth);
          return MaterialApp.router(
            title: 'MERIDIAN',
            debugShowCheckedModeBanner: false,
            theme: buildTheme(Brightness.light),
            darkTheme: buildTheme(Brightness.dark),
            themeMode: t.mode,
            routerConfig: router,
          );
        },
      ),
    );
  }
}

GoRouter _buildRouter(AuthController auth) {
  return GoRouter(
    initialLocation: '/',
    refreshListenable: auth,
    redirect: (context, state) {
      final loggedIn = auth.isAuthenticated;
      final atLogin = state.matchedLocation == '/login';
      if (!loggedIn && !atLogin) return '/login';
      if (loggedIn && atLogin) return '/';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginPage()),
      GoRoute(path: '/', builder: (_, __) => const KanbanPage()),
      GoRoute(path: '/today', builder: (_, __) => const TodayPage()),
      GoRoute(path: '/tasks', builder: (_, __) => const AllTasksPage()),
      GoRoute(
        path: '/notes',
        builder: (_, __) => const NotesPage(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, s) => NotesPage(noteId: s.pathParameters['id']),
          ),
        ],
      ),
      GoRoute(
        path: '/sheets',
        builder: (_, __) => const SheetsPage(),
        routes: [
          GoRoute(
            path: ':id',
            builder: (_, s) => SheetsPage(sheetId: s.pathParameters['id']),
          ),
        ],
      ),
    ],
  );
}
