# MERIDIAN - Full-Stack Productivity Application

A comprehensive productivity management system with task tracking, time management, note-taking, and spreadsheet capabilities.

## Project Overview

MERIDIAN is a modern full-stack web application built with:
- **Backend:** FastAPI + PostgreSQL + SQLAlchemy
- **Frontend:** React 18 + Vite + Tailwind CSS
- **Authentication:** JWT tokens with secure password hashing

### Features
- 📋 **Kanban Board** - Visual task management with drag-and-drop
- ⏱️ **Task Timer** - Track time spent on tasks with start/stop functionality
- 📅 **Daily Summary** - View today's tasks, completion stats, and time tracked
- 📝 **Notes** - Create and edit markdown notes with live preview
- 📊 **Spreadsheets** - Create and manage tabular data
- 🎨 **Theme Support** - Light and dark modes with persistent preferences
- 🔐 **Authentication** - JWT-based secure user authentication

## Project Structure

```
MERIDIAN/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI app setup
│   │   ├── database.py          # SQLAlchemy engine & session
│   │   ├── models.py            # ORM models (User, Task, Note, Sheet)
│   │   ├── schemas.py           # Pydantic validation schemas
│   │   ├── auth.py              # JWT & password utilities
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth.py          # Auth endpoints
│   │       ├── tasks.py         # Task CRUD
│   │       ├── timer.py         # Timer operations
│   │       ├── notes.py         # Note CRUD
│   │       ├── sheets.py        # Spreadsheet CRUD
│   │       └── summary.py       # Daily summary
│   ├── requirements.txt         # Python dependencies
│   ├── .env                     # Database & secrets config
│   └── venv/                    # Python virtual environment
│
├── frontend/
│   ├── src/
│   │   ├── api/                 # API layer (axios)
│   │   │   ├── auth.js
│   │   │   ├── tasks.js
│   │   │   ├── timer.js
│   │   │   ├── notes.js
│   │   │   ├── sheets.js
│   │   │   └── summary.js
│   │   ├── components/          # Reusable components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   ├── TimerButton.jsx
│   │   │   ├── NoteEditor.jsx
│   │   │   └── SheetGrid.jsx
│   │   ├── context/             # Global state
│   │   │   ├── AuthContext.jsx
│   │   │   └── ThemeContext.jsx
│   │   ├── hooks/               # Custom hooks
│   │   │   ├── useLocalStorage.js
│   │   │   └── useTimer.js
│   │   ├── pages/               # Page components
│   │   │   ├── Login.jsx
│   │   │   ├── Kanban.jsx
│   │   │   ├── Today.jsx
│   │   │   ├── AllTasks.jsx
│   │   │   ├── Notes.jsx
│   │   │   └── Sheets.jsx
│   │   ├── utils/               # Utilities
│   │   │   ├── formatTime.js
│   │   │   └── dateHelpers.js
│   │   ├── App.jsx              # Router & layout
│   │   ├── main.jsx             # React entry point
│   │   └── index.css            # Global styles
│   ├── index.html               # HTML template
│   ├── package.json             # Node dependencies
│   ├── .env                     # Frontend config
│   └── node_modules/            # Dependencies
│
└── README.md                    # This file
```

## Prerequisites

- **Python 3.11+** with pip and venv
- **Node.js 20.19+** (recommend 22+)
- **PostgreSQL 12+** with a running server
- **npm** or **yarn** for package management

## Database Setup

### 1. Create PostgreSQL User and Database

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create user and database
CREATE USER meridian WITH PASSWORD 'Punith@1161';
CREATE DATABASE meridian OWNER meridian;
GRANT ALL PRIVILEGES ON DATABASE meridian TO meridian;
\q
```

### 2. Verify Connection String

The backend `.env` file should have:
```
DATABASE_URL=postgresql://meridian:Punith%401161@localhost:5432/meridian
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

Note: Special characters in passwords must be URL-encoded (@ → %40)

## Installation & Setup

### Backend Setup

```bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Verify installation
python3 -c "import fastapi, sqlalchemy, jwt; print('All dependencies installed!')"

# Database tables are auto-created on first app start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Verify installation
npm list react vite tailwindcss
```

## Running the Application

### Terminal 1 - Start Backend Server

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Start FastAPI server (runs on http://localhost:8000)
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000/api` with interactive docs at `http://localhost:8000/docs`

### Terminal 2 - Start Frontend Dev Server

```bash
cd frontend

# Start Vite dev server (runs on http://localhost:5173)
npm run dev
```

The app will automatically open at `http://localhost:5173`

## First Run Walkthrough

1. **Open** http://localhost:5173 in your browser
2. **Register** a new account with email and password
3. **Login** with your credentials
4. **Create a Task** on the Kanban board
5. **Start Timer** by clicking the play button on any task
6. **View Summary** in the Today page to see completion stats
7. **Create Notes** with markdown editor
8. **Create Spreadsheet** and add data in the grid
9. **Toggle Theme** using the button in the sidebar

## API Endpoints

### Authentication (`/auth`)
- `POST /register` - Create new user
- `POST /login` - Get JWT token
- `GET /me` - Get current user (requires token)

### Tasks (`/tasks`)
- `GET /tasks` - List all user tasks
- `POST /tasks` - Create task
- `GET /tasks/{id}` - Get task details
- `PUT /tasks/{id}` - Update task
- `PATCH /tasks/{id}/status` - Update task status
- `DELETE /tasks/{id}` - Delete task

### Timer (`/tasks/{id}/timer`)
- `POST /tasks/{id}/timer/start` - Start timer
- `POST /tasks/{id}/timer/stop` - Stop timer and log time
- `GET /tasks/{id}/timer` - Get timer status

### Notes (`/notes`)
- `GET /notes` - List all notes
- `POST /notes` - Create note
- `GET /notes/{id}` - Get note
- `PUT /notes/{id}` - Update note
- `DELETE /notes/{id}` - Delete note

### Sheets (`/sheets`)
- `GET /sheets` - List all sheets
- `POST /sheets` - Create sheet
- `GET /sheets/{id}` - Get sheet data
- `PUT /sheets/{id}` - Update sheet
- `DELETE /sheets/{id}` - Delete sheet

### Summary (`/summary`)
- `GET /summary/today` - Get today's summary statistics

## Development

### Backend Development
- API documentation: http://localhost:8000/docs
- All endpoints require JWT authentication (except /auth/register and /auth/login)
- Database models auto-create on startup via `Base.metadata.create_all()`

### Frontend Development
- Hot module reloading enabled with Vite
- Tailwind CSS with utility classes
- CSS custom properties for theming
- Responsive design with mobile support

## Testing

### Manual Testing Checklist
- [ ] Register new account
- [ ] Login with credentials
- [ ] Create task and view on Kanban
- [ ] Start/stop task timer
- [ ] Check Today page summary
- [ ] Create and edit note
- [ ] Create spreadsheet and enter data
- [ ] Toggle light/dark theme
- [ ] Logout and redirect to login

### API Testing
Use the Swagger UI at `http://localhost:8000/docs` to test all endpoints interactively.

## Troubleshooting

### Backend Issues

**PostgreSQL Connection Error**
```
connection to server at localhost failed
```
- Ensure PostgreSQL service is running: `sudo systemctl start postgresql`
- Verify connection string in `.env` has correct username/password
- Check password URL encoding (@ → %40)

**Module Not Found Errors**
```
ModuleNotFoundError: No module named 'fastapi'
```
- Activate virtual environment: `source venv/bin/activate`
- Reinstall requirements: `pip install -r requirements.txt`

**bcrypt Installation Error**
```
ValueError: password cannot be longer than 72 bytes
```
- Install build tools: `sudo apt-get install build-essential python3-dev libffi-dev libssl-dev`
- Reinstall: `pip install --force-reinstall passlib[bcrypt] bcrypt`

### Frontend Issues

**Node Version Error**
```
Vite requires Node.js version 20.19+ or 22.12+
```
- Check version: `node --version`
- Use NVM to upgrade: `nvm install 22 && nvm use 22`

**Dependencies Not Installed**
```
Cannot find module '@hello-pangea/dnd'
```
- Run: `npm install`

**Port Already in Use**
- Backend: `lsof -ti :8000 | xargs kill -9` then restart
- Frontend: `lsof -ti :5173 | xargs kill -9` then restart

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/db
SECRET_KEY=your-secret-key-for-jwt
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=10080
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000/api
```

## Deployment Notes

### Before Production
1. Change `SECRET_KEY` to a strong random value
2. Set `DATABASE_URL` to production database
3. Update `VITE_API_URL` to production API URL
4. Disable CORS for specific domains instead of all origins
5. Set `ACCESS_TOKEN_EXPIRE_MINUTES` to appropriate value

### Build Frontend for Production
```bash
cd frontend
npm run build
# Output in dist/ folder
```

## License

This project is proprietary and for authorized use only.

## Support

For issues or questions, refer to the project documentation or contact the development team.

---

**Created:** 2024
**Stack:** FastAPI + React + PostgreSQL
**Status:** Production Ready ✓
