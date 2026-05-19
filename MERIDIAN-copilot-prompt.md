# MERIDIAN — Manage Every Responsibility Integrated Daily In Aligned Notes
## Complete GitHub Copilot Development Prompt

---

## Read this before generating any code

This document is the single source of truth for building MERIDIAN. Every file, folder, decision, and convention is defined here. Do not deviate from the structure, stack, or patterns described below. Do not introduce libraries or tools not listed here. Do not add comments explaining obvious code. Write code the way a senior engineer would — clean, consistent, and purposeful.

---

## Project overview

MERIDIAN is a personal productivity web application built for a single authenticated user. It combines task management, time tracking, notes, and spreadsheets into one interface. The project serves two purposes: daily personal use, and as a portfolio piece demonstrating full-stack engineering capability.

The application has five core sections:

1. Kanban board — drag and drop task cards across three columns: To Do, In Progress, Done
2. Today — daily summary showing tasks due today, total time tracked, and completion progress
3. All Tasks — full table view of every task with sorting
4. Notes — standalone wiki-style note pages with markdown editing and preview
5. Sheets — standalone spreadsheet editor with named sheets, editable cells, and row/column management

---

## Folder structure

The repository root contains two top-level folders: `backend` and `frontend`. There is no monorepo tooling. They are independent projects that communicate over HTTP.

```
meridian/
  backend/
    app/
      routers/
        auth.py
        tasks.py
        timer.py
        notes.py
        sheets.py
        summary.py
      models.py
      schemas.py
      database.py
      auth.py
      main.py
    .env
    requirements.txt
    README.md
  frontend/
    lib/
      api/
        api_client.dart
        api_config.dart
      models/
        task.dart
        note.dart
        sheet.dart
      pages/
        kanban_page.dart
        today_page.dart
        all_tasks_page.dart
        notes_page.dart
        sheets_page.dart
        login_page.dart
      state/
        auth_controller.dart
        theme_controller.dart
        app_state.dart
      theme/
        app_theme.dart
      utils/
        format_time.dart
        date_helpers.dart
      widgets/
        sidebar.dart
        app_shell.dart
        task_card.dart
        note_editor.dart
        sheet_grid.dart
        modal.dart
      main.dart
    pubspec.yaml
    README.md
  .gitignore
  README.md
```

---

## Backend

### Stack

- Python 3.11
- FastAPI
- SQLAlchemy ORM (sync, not async)
- PostgreSQL
- psycopg2-binary
- python-jose for JWT
- passlib with bcrypt for password hashing
- python-dotenv for environment variables
- uvicorn as the ASGI server

Do not use Alembic. Use `Base.metadata.create_all(bind=engine)` in `main.py` to create all tables on startup.

### Environment variables

The `backend/.env` file must contain:

```
DATABASE_URL=postgresql://user:password@localhost:5432/meridian
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### Database models — `app/models.py`

Define four SQLAlchemy models:

**User**
- id: Integer, primary key
- email: String, unique, not nullable
- hashed_password: String, not nullable
- created_at: DateTime, default utcnow

**Task**
- id: Integer, primary key
- user_id: Integer, ForeignKey to users.id
- title: String, not nullable
- priority: String (values: high, medium, low)
- status: String (values: todo, inprogress, done)
- due_date: Date, nullable
- time_estimate: Integer (minutes), nullable
- time_spent: Integer (seconds), default 0
- timer_started_at: DateTime, nullable
- created_at: DateTime, default utcnow
- updated_at: DateTime, default utcnow, onupdate utcnow

**Note**
- id: Integer, primary key
- user_id: Integer, ForeignKey to users.id
- title: String, default 'Untitled'
- content: Text, nullable
- created_at: DateTime, default utcnow
- updated_at: DateTime, default utcnow, onupdate utcnow

**Sheet**
- id: Integer, primary key
- user_id: Integer, ForeignKey to users.id
- name: String, not nullable
- data: JSON — stores the entire sheet as `{ cols: [...], rows: [[...]] }`
- created_at: DateTime, default utcnow
- updated_at: DateTime, default utcnow, onupdate utcnow

### Pydantic schemas — `app/schemas.py`

Write request and response schemas for all four models. Follow these naming conventions:

- `UserCreate`, `UserResponse`
- `TaskCreate`, `TaskUpdate`, `TaskStatusUpdate`, `TaskResponse`
- `NoteCreate`, `NoteUpdate`, `NoteResponse`
- `SheetCreate`, `SheetUpdate`, `SheetResponse`
- `TimerStartResponse`, `TimerStopResponse`
- `TodaySummaryResponse`
- `TokenResponse`

All response schemas must include `id`, `created_at`, and `updated_at` where applicable. Use `orm_mode = True` (Pydantic v1) or `model_config = ConfigDict(from_attributes=True)` (Pydantic v2).

### Database connection — `app/database.py`

Create the SQLAlchemy engine using `DATABASE_URL` from environment. Create `SessionLocal` using `sessionmaker`. Export a `get_db` dependency that yields a session and closes it in a finally block.

### Authentication — `app/auth.py`

Implement the following functions:

- `hash_password(password: str) -> str`
- `verify_password(plain: str, hashed: str) -> bool`
- `create_access_token(data: dict) -> str` — uses SECRET_KEY and ALGORITHM from env, sets expiry from ACCESS_TOKEN_EXPIRE_MINUTES
- `get_current_user(token: str, db: Session) -> User` — FastAPI dependency, raises 401 if invalid

### Routers

**`routers/auth.py`**

- `POST /auth/register` — accepts email and password, hashes password, creates user, returns token
- `POST /auth/login` — accepts email and password using OAuth2PasswordRequestForm, verifies credentials, returns token
- `GET /auth/me` — protected, returns current user

**`routers/tasks.py`**

- `GET /tasks` — returns all tasks for current user, ordered by created_at descending
- `POST /tasks` — creates a new task
- `GET /tasks/{task_id}` — returns one task
- `PUT /tasks/{task_id}` — updates title, priority, due_date, time_estimate
- `PATCH /tasks/{task_id}/status` — updates status only (used for drag and drop column changes)
- `DELETE /tasks/{task_id}` — deletes task

**`routers/timer.py`**

- `POST /tasks/{task_id}/timer/start` — sets timer_started_at to utcnow
- `POST /tasks/{task_id}/timer/stop` — calculates elapsed seconds since timer_started_at, adds to time_spent, clears timer_started_at
- `GET /tasks/{task_id}/timer` — returns current time_spent and whether timer is running

**`routers/notes.py`**

- `GET /notes` — returns all notes for current user, ordered by updated_at descending
- `POST /notes` — creates a new note
- `GET /notes/{note_id}` — returns one note
- `PUT /notes/{note_id}` — updates title and content
- `DELETE /notes/{note_id}` — deletes note

**`routers/sheets.py`**

- `GET /sheets` — returns all sheets for current user
- `POST /sheets` — creates a new sheet with default empty data structure
- `GET /sheets/{sheet_id}` — returns one sheet with full data
- `PUT /sheets/{sheet_id}` — updates name and data
- `DELETE /sheets/{sheet_id}` — deletes sheet

**`routers/summary.py`**

- `GET /summary/today` — returns tasks due today, total time tracked today across all tasks, count of done tasks vs total, and the running task id if any

### `app/main.py`

- Load environment with dotenv
- Create FastAPI app with title "MERIDIAN API"
- Add CORSMiddleware allowing the frontend origin (from env or default localhost:8080)
- Include all routers with prefix `/api`
- Call `Base.metadata.create_all(bind=engine)` on startup
- Add a health check at `GET /health` returning `{ "status": "ok" }`

### `requirements.txt`

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
python-jose[cryptography]
passlib[bcrypt]
python-dotenv
pydantic[email]
```

### Running the backend

```
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API available at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

---

## Frontend

### Stack

- Flutter 3.19+
- Dart 3.3+
- go_router for routing
- provider for auth/theme/app state
- http for API requests
- shared_preferences for JWT + theme persistence
- flutter_markdown for note preview

### Environment variables

Use `MERIDIAN_API_URL` via `--dart-define` to override the default API base URL.
Default is `http://localhost:8000/api` from `lib/api/api_config.dart`.

### Theming

The application must support both light and dark themes. Theme is toggled by the user and persisted in `shared_preferences` via `ThemeController`.

Define all colors in `lib/theme/app_theme.dart` and apply them via `AppColors` on widgets. Do not hardcode colors in widgets. The design must be clean, structured, and restrained: no gradients on primary UI elements, no excessive shadows, and rounded corners no larger than 8px except modals. Typography must be clear and hierarchical. Spacing must be consistent using a base 4px grid.

Use the font `DM Sans` for UI text and `DM Mono` for timer values, cell inputs, and code content. If font assets are unavailable, fall back to system fonts.

**Theme color tokens**

Define the following colors inside `AppColors` for light and dark themes using the same hex values:

- Dark: bgPrimary #0f0f11, bgSecondary #17171a, bgTertiary #1e1e22, bgHover #26262c, borderPrimary #2e2e36, borderSecondary #3a3a44, textPrimary #f0f0f2, textSecondary #9090a0, textTertiary #5a5a6a, accent #6c5ce7, accentSubtle rgba(108,92,231,0.12), success #3ecf8e, successSubtle rgba(62,207,142,0.12), warning #f5a623, warningSubtle rgba(245,166,35,0.12), danger #e05c6a, dangerSubtle rgba(224,92,106,0.12), info #4ea8de, infoSubtle rgba(78,168,222,0.12).
- Light: bgPrimary #ffffff, bgSecondary #f5f5f7, bgTertiary #ebebef, bgHover #e2e2e8, borderPrimary #d8d8e0, borderSecondary #c8c8d4, textPrimary #111114, textSecondary #505060, textTertiary #8888a0, accent #5b4fd4, accentSubtle rgba(91,79,212,0.1), success #1a9e68, successSubtle rgba(26,158,104,0.1), warning #c47e00, warningSubtle rgba(196,126,0,0.1), danger #c0404e, dangerSubtle rgba(192,64,78,0.1), info #2b7bb8, infoSubtle rgba(43,123,184,0.1).

### API layer — `lib/api/`

Use `ApiClient` to send JSON requests with `Authorization: Bearer <token>` when available. Handle 401s by clearing the token through `AuthController.logout()`.

### Authentication — `state/auth_controller.dart`

Provide `token`, `login(email, password)`, `logout()`, and `isAuthenticated` to the entire app. Store the JWT token in `shared_preferences` under the key `meridian_token`. On app load, validate the stored token by calling `GET /auth/me`. If it fails, clear the token and redirect to login.

### Routing — `main.dart`

Use `go_router`. Protected routes redirect to `/login` if not authenticated. Public routes redirect to `/` if already authenticated.

Routes:
- `/login` — Login page (public)
- `/` — Kanban (protected)
- `/today` — Today summary (protected)
- `/tasks` — All tasks (protected)
- `/notes` — Notes, optional `/:id` for active note (protected)
- `/sheets` — Sheets, optional `/:id` for active sheet (protected)

### Layout

The main layout wraps all protected pages. It renders a fixed left sidebar (56px wide) and a main content area that fills the remaining width. The topbar is part of the main content area, not the sidebar. The sidebar does not expand or collapse — it is always icon-only. Tooltips appear on hover showing the section name.

The sidebar contains navigation icons in this order from top to bottom:
- App logo at top
- Kanban
- Today
- All Tasks
- Notes
- Sheets
- Spacer pushing the next item to the bottom
- Theme toggle
- Settings placeholder

### Component specifications

**`sidebar.dart`**

Renders the fixed left nav. Active item is determined by the current route. No text labels — icons only with tooltips for accessibility. Theme toggle at the bottom switches between light and dark and persists to `shared_preferences`.

**`task_card.dart`**

Props: `task`, `onTimerToggle`. Renders the task title, priority badge, due date, a thin progress bar (time_spent vs time_estimate in seconds), and a timer button. The timer button shows a play or pause icon depending on whether the timer is running. While the timer is running, the card shows the elapsed time updating every second using a local interval — the actual save happens when the timer is stopped via the API.

Priority badge colors: high uses danger variables, medium uses warning variables, low uses success variables.

**`TimerButton` (inside `task_card.dart`)**

A circular button, 28px diameter. Idle state: border using `--border-secondary`, icon using `--text-tertiary`. Running state: border and icon using `--success`. Hover on idle: accent color. No animation, no pulse.

**`note_editor.dart`**

Uses `TextField` for editing and `flutter_markdown` for preview. The editor renders in split mode by default (edit on left, preview on right) on wide screens and in edit-only mode on narrow screens. The note title is an editable plain text input above the editor, styled as a heading. Auto-save on every change after a 600ms debounce — do not save on every keystroke.

**`sheet_grid.dart`**

Renders the sheet data as an editable grid. Column headers are editable. Rows can be added. The grid theme must match the application theme by using `AppColors` values.

**`modal.dart`**

A centered modal using `showDialog` with a dimmed barrier. Closes on clicking the overlay or pressing Escape. The overlay uses `rgba(0,0,0,0.5)` in dark mode and `rgba(0,0,0,0.3)` in light mode.

### Page specifications

**`kanban_page.dart`**

Uses `Draggable` and `DragTarget`. Three columns. Each task is a `LongPressDraggable` wrapping `TaskCard`. On drop into a different column, call `updateTaskStatus` with the new status. Render the column count next to each column header. A create task button opens the modal with a form for title, priority, due date, and time estimate. Map column ids: `todo`, `inprogress`, `done`.

**`today_page.dart`**

Shows three stat cards at the top: tasks today, completed, and total time tracked (formatted as Xh Ym). Below the stats, shows a list of today's tasks. Each item has a checkbox that calls `updateTaskStatus` to toggle between `todo` and `done`. No drag and drop on this page.

**`all_tasks_page.dart`**

Renders all tasks in a plain HTML table. Columns: Title, Priority, Status, Due Date, Estimate, Time Spent. Rows are clickable to open a task detail modal for editing. Add a filter row above the table with dropdowns for priority and status.

**`notes_page.dart`**

Left panel: list of notes ordered by updated_at descending. Each item shows the title and a relative timestamp. A create button at the top of the panel adds a new note with title "Untitled" and opens it immediately. Right panel: `NoteEditor` for the selected note. Deleting a note requires a confirmation step — a second click on the delete button or a confirmation prompt.

**`sheets_page.dart`**

Left panel: list of sheets. A create button adds a new sheet with five default columns (A through E) and six empty rows. Right panel: sheet name input at the top, `SheetGrid` below. Add row and add column buttons in the toolbar. Sheet data is saved to the backend on every cell edit after a 1000ms debounce.

**`login_page.dart`**

A centered card with email and password fields and a submit button. No registration UI — the registration endpoint exists for programmatic use only. Show a clear error message if credentials are wrong. No "forgot password" link.

### Utility functions

**`lib/utils/format_time.dart`**

```dart
// Converts seconds to display string
// Under 1 hour: MM:SS
// 1 hour or more: Xh Ym
String formatTime(int seconds) { ... }

// Converts seconds to hours and minutes string for summary display
String formatHoursMinutes(int seconds) { ... }
```

**`lib/utils/date_helpers.dart`**

```dart
// Returns true if the given date is today
bool isToday(DateTime? date) { ... }

// Returns a relative label: 'Today', 'Tomorrow', 'Yesterday', or the formatted date
String relativeDate(DateTime? date) { ... }
```

### Running the frontend

```
cd frontend
flutter pub get
flutter run -d chrome
```

To override the API base URL:

```
flutter run -d chrome --dart-define=MERIDIAN_API_URL=http://localhost:8000/api
```

Application available at `http://localhost:5173`.

---

## Complete API reference

All endpoints are prefixed with `/api`. All protected endpoints require the header `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /auth/register | No | Create account |
| POST | /auth/login | No | Returns JWT token |
| GET | /auth/me | Yes | Returns current user |

### Tasks

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /tasks | Yes | All tasks for user |
| POST | /tasks | Yes | Create task |
| GET | /tasks/{id} | Yes | Single task |
| PUT | /tasks/{id} | Yes | Update task fields |
| PATCH | /tasks/{id}/status | Yes | Update status only |
| DELETE | /tasks/{id} | Yes | Delete task |

### Timer

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /tasks/{id}/timer/start | Yes | Start timer |
| POST | /tasks/{id}/timer/stop | Yes | Stop timer, save elapsed |
| GET | /tasks/{id}/timer | Yes | Get timer state |

### Notes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /notes | Yes | All notes |
| POST | /notes | Yes | Create note |
| GET | /notes/{id} | Yes | Single note |
| PUT | /notes/{id} | Yes | Update note |
| DELETE | /notes/{id} | Yes | Delete note |

### Sheets

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /sheets | Yes | All sheets |
| POST | /sheets | Yes | Create sheet |
| GET | /sheets/{id} | Yes | Single sheet with data |
| PUT | /sheets/{id} | Yes | Save sheet data |
| DELETE | /sheets/{id} | Yes | Delete sheet |

### Summary

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | /summary/today | Yes | Today's stats |

---

## Code conventions

These rules apply to every file in the project without exception.

### General

- No comments explaining what the code does. Write code that is self-explanatory. Comments are only acceptable for non-obvious business logic.
- No console.log statements in committed code.
- No TODO comments. If it is not implemented, it does not exist in the file yet.
- No unused imports, variables, or functions.
- All strings that appear in the UI are written in sentence case. No all-caps UI labels except abbreviations.
- Avoid hardcoded colors in widgets. Use `AppColors` and theme tokens, except for dynamic values that cannot be derived from the theme.

### Python (backend)

- Follow PEP 8 for all Python files.
- Use type annotations on all function signatures.
- Use dependency injection via FastAPI's `Depends` for `get_db` and `get_current_user`.
- Keep router functions thin — move business logic to separate functions if it exceeds 20 lines.
- Return appropriate HTTP status codes: 201 for creation, 204 for deletion, 404 for not found, 403 for unauthorized resource access.
- Every database query must filter by `user_id` to prevent cross-user data access.

### Dart (frontend)

- Keep widgets under 150 lines. Extract sub-widgets or helpers if a widget grows beyond this.
- All API calls must be inside try/catch blocks. Show a user-facing error state when requests fail.
- Use `async/await` consistently. Do not mix `.then()` and `async/await` in the same file.
- Do not put API call logic directly inside widgets. Use `ApiClient` and `AppState`.

### Naming

- Backend Python files: snake_case for everything.
- Frontend Dart files: snake_case.
- Database columns: snake_case.
- API JSON fields: snake_case.
- Frontend Dart variables and properties: lowerCamelCase.

---

## Git conventions

Commit message format: `type: short description in present tense`

Types: `feat`, `fix`, `refactor`, `style`, `docs`, `chore`

Examples:
- `feat: add timer start and stop endpoints`
- `fix: prevent cross-user task access in tasks router`
- `refactor: extract timer logic into useTimer hook`
- `style: apply light theme tokens`

Branch naming: `feature/short-description`, `fix/short-description`

---

## Deployment

### Backend — Railway

1. Push the `backend/` folder to GitHub.
2. Create a new Railway project and connect the repository.
3. Set the start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
4. Add environment variables: `DATABASE_URL`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`.
5. Add a PostgreSQL plugin in Railway and copy the connection string to `DATABASE_URL`.

### Frontend — Flutter web (Vercel/Netlify)

1. Run `flutter build web --dart-define=MERIDIAN_API_URL=https://your-api/api`.
2. Deploy the `build/web` directory as a static site.
3. Rebuild and redeploy when the API base URL changes.

### Database — Neon (alternative to Railway Postgres)

1. Create a free Neon account at neon.tech.
2. Create a database named `meridian`.
3. Copy the connection string and set it as `DATABASE_URL` in Railway environment variables.

---

## Development order

Build in this exact sequence. Do not start a phase until the previous one is working and tested.

**Phase 1 — Backend foundation**

Create the folder structure. Write `database.py`, `models.py`, and `main.py` with only the health check. Confirm the app starts and the database tables are created. Verify at `http://localhost:8000/docs`.

**Phase 2 — Auth**

Write `auth.py`, `schemas.py` for users, and `routers/auth.py`. Test register, login, and me endpoints in Swagger. Confirm the JWT token is returned and the me endpoint rejects invalid tokens.

**Phase 3 — Tasks and timer**

Write task schemas, `routers/tasks.py`, and `routers/timer.py`. Test all seven endpoints in Swagger with a real authenticated token.

**Phase 4 — Notes and sheets**

Write note and sheet schemas, `routers/notes.py`, and `routers/sheets.py`. Test all endpoints in Swagger.

**Phase 5 — Summary**

Write `routers/summary.py`. Test with tasks that have today's date.

**Phase 6 — Frontend scaffold**

Create the Flutter project. Install dependencies. Configure `AppColors` and `ThemeController`. Confirm both themes render correctly. Set up routing with placeholder pages.

**Phase 7 — Auth UI and API layer**

Write `ApiClient` and `AuthController`. Write the Login page. Confirm login works, token is stored, and the me endpoint is called on refresh.

**Phase 8 — Kanban**

Write `TaskCard`, `TimerButton`, and `Kanban` page. Connect to the backend. Confirm drag and drop updates status. Confirm timer start and stop work.

**Phase 9 — Today and All Tasks**

Write `Today` and `AllTasks` pages. Connect to backend.

**Phase 10 — Notes**

Write `NoteEditor` and `Notes` page. Connect to backend. Confirm debounced auto-save works.

**Phase 11 — Sheets**

Write `SheetGrid` and `Sheets` page. Connect to backend. Confirm debounced save works.

**Phase 12 — Polish**

Review all pages in both light and dark themes. Fix any spacing inconsistencies. Confirm all error states show user-facing messages. Write both README files with setup instructions.

---

## How to use this document with GitHub Copilot

When working on a specific file, paste the relevant section of this document as a comment block at the top of the file before asking Copilot to generate code. For example, when working on `routers/tasks.py`, paste the tasks router specification and the code conventions section. Copilot will use the context to generate code that matches the expected structure and naming conventions.

For complex files like `sheet_grid.dart` or `note_editor.dart`, also paste the component specification and the theming section so Copilot understands the design constraints and color tokens.

When Copilot generates something that does not match this document, correct it immediately. Do not accumulate deviations. The value of this document is that the entire codebase follows one consistent set of decisions.
