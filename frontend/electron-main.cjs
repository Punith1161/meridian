/**
 * MERIDIAN Electron main process
 * Spawns the FastAPI backend as a child process, serves the built Vite frontend.
 * CommonJS format (.cjs) required — Electron does not support ESM main process yet.
 */

const { app, BrowserWindow, shell, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
const BACKEND_PORT = 8000;
const FRONTEND_PORT = 5173;

let mainWindow = null;
let backendProcess = null;

// ── Backend spawning ──────────────────────────────────────────────────────────

function findPython() {
  // In packaged app, look for bundled backend; in dev, use system Python
  const candidates = ["python3", "python", "py"];
  for (const cmd of candidates) {
    try {
      const result = require("child_process").spawnSync(cmd, ["--version"]);
      if (result.status === 0) return cmd;
    } catch {}
  }
  return null;
}

function getBackendDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "backend");
  }
  return path.join(__dirname, "..", "backend");
}

function startBackend() {
  const python = findPython();
  if (!python) {
    console.error("[MERIDIAN] Python not found. Please install Python 3.11+");
    return;
  }

  const backendDir = getBackendDir();
  const envPath = path.join(backendDir, ".env");

  // Copy .env.example to .env if not present
  const envExample = path.join(backendDir, ".env.example");
  if (!fs.existsSync(envPath) && fs.existsSync(envExample)) {
    fs.copyFileSync(envExample, envPath);
    console.log("[MERIDIAN] Created .env from .env.example");
  }

  console.log(`[MERIDIAN] Starting backend from: ${backendDir}`);

  backendProcess = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(BACKEND_PORT)],
    {
      cwd: backendDir,
      env: { ...process.env, PYTHONPATH: backendDir },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  backendProcess.stdout.on("data", (data) => {
    console.log(`[backend] ${data.toString().trim()}`);
  });

  backendProcess.stderr.on("data", (data) => {
    const msg = data.toString().trim();
    // Uvicorn logs startup info to stderr — not an error
    if (!msg.includes("ERROR")) {
      console.log(`[backend] ${msg}`);
    } else {
      console.error(`[backend:err] ${msg}`);
    }
  });

  backendProcess.on("exit", (code) => {
    console.log(`[MERIDIAN] Backend exited with code ${code}`);
  });
}

// ── Wait for backend to be ready ─────────────────────────────────────────────

function waitForBackend(retries = 30, delay = 500) {
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(`http://127.0.0.1:${BACKEND_PORT}/health`, (res) => {
        if (res.statusCode === 200) resolve(true);
        else if (retries > 0) setTimeout(attempt, delay);
        else reject(new Error("Backend did not start in time"));
      });
      req.on("error", () => {
        if (retries-- > 0) setTimeout(attempt, delay);
        else reject(new Error("Backend did not start in time"));
      });
      req.end();
    };
    attempt();
  });
}

// ── Window creation ───────────────────────────────────────────────────────────

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f0f13",
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    webPreferences: {
      preload: path.join(__dirname, "electron-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false, // Show after content loads
  });

  // Show loading screen while backend starts
  mainWindow.loadFile(path.join(__dirname, "electron-loading.html")).catch(() => {});
  mainWindow.show();

  waitForBackend()
    .then(() => {
      const url = isDev
        ? `http://localhost:${FRONTEND_PORT}`
        : `http://127.0.0.1:${BACKEND_PORT}`;

      if (isDev) {
        mainWindow.loadURL(url);
      } else {
        // In production, serve the built frontend via the backend's static files
        // OR load dist/index.html directly
        const indexPath = path.join(__dirname, "dist", "index.html");
        if (fs.existsSync(indexPath)) {
          mainWindow.loadFile(indexPath);
        } else {
          mainWindow.loadURL(`http://127.0.0.1:${BACKEND_PORT}`);
        }
      }

      if (isDev) {
        mainWindow.webContents.openDevTools();
      }
    })
    .catch((err) => {
      console.error("[MERIDIAN] Backend failed to start:", err.message);
      mainWindow.loadFile(path.join(__dirname, "electron-error.html")).catch(() => {});
    });

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (backendProcess) {
    backendProcess.kill("SIGTERM");
    backendProcess = null;
  }
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  if (backendProcess) {
    backendProcess.kill("SIGTERM");
  }
});

// IPC: allow renderer to get backend port
ipcMain.handle("get-backend-url", () => `http://127.0.0.1:${BACKEND_PORT}`);
