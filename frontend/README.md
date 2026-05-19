# MERIDIAN — Flutter

Flutter client for MERIDIAN: a productivity app with Kanban, Today, All Tasks, Notes, and Sheets wired to the FastAPI backend.

## Stack

- Flutter 3.19+ / Dart 3.3+
- `go_router` — routing (matches the prompt's `/`, `/today`, `/tasks`, `/notes/:id`, `/sheets/:id`, `/login`)
- `provider` — auth, theme, and app state
- `shared_preferences` — persists JWT token + theme
- `flutter_markdown` — note preview pane
- `intl`, `http`

Flutter equivalents:
- `Draggable` / `DragTarget` for Kanban drag and drop
- `TextField` + `flutter_markdown` for notes editing and preview
- Custom themed `SheetGrid` widget for spreadsheets

## Getting started

```bash
cd frontend
flutter pub get
flutter run -d chrome      # or: macos | windows | linux | <device-id>
```

To override the API base URL:

```bash
flutter run -d chrome --dart-define=MERIDIAN_API_URL=http://localhost:8000/api
```

### Fonts (optional)

By default, the app uses system fonts. To use **DM Sans** and **DM Mono**, add the fonts to `assets/fonts/` and re-introduce a `fonts:` block in `pubspec.yaml`.

## Layout

- Fixed **56px icon-only sidebar** on the left (logo, Kanban, Today, All Tasks, Notes, Sheets, theme toggle, settings).
- Topbar lives inside the main content area (page title + actions + logout).
- All UI uses semantic color tokens defined in `lib/theme/app_theme.dart` — exact hex values from the original spec for both light and dark themes.

## Project structure

```
lib/
  main.dart                  # MaterialApp + go_router config
  theme/app_theme.dart       # Light + dark AppColors, ThemeData builder
  models/                    # Task, Note, Sheet
  state/                     # AuthController, ThemeController, AppState
  widgets/
    sidebar.dart             # 56px nav rail
    app_shell.dart           # Sidebar + topbar + page slot
    task_card.dart           # Card + TimerButton + live ticker
    modal.dart               # Centered dialog helper
    note_editor.dart         # Title + markdown editor/preview, 600ms debounce
    sheet_grid.dart          # Editable cell grid, 1000ms debounce
  pages/
    login_page.dart
    kanban_page.dart         # 3 columns, drag-and-drop
    today_page.dart          # 3 stat cards + today list with checkboxes
    all_tasks_page.dart      # Filterable DataTable, row click → edit modal
    notes_page.dart          # List + editor, two-click delete confirm
    sheets_page.dart         # List + grid + add row/column toolbar
  utils/format_time.dart     # MM:SS / Xh Ym
  utils/date_helpers.dart    # isToday, relativeDate, relativeTimestamp
```

## Backend integration

- Auth uses `POST /auth/login` and stores the JWT in `shared_preferences` under `meridian_token`.
- App state is loaded from `/tasks`, `/notes`, and `/sheets` on login.
- The API base URL defaults to `http://localhost:8000/api` and can be overridden with `--dart-define=MERIDIAN_API_URL=...`.
- If you run Flutter web, set `FRONTEND_URL` or `FRONTEND_URLS` for the FastAPI CORS middleware.
