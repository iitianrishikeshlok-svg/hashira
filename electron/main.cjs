// ============================================================================
// File: electron/main.cjs
// Electron Main Desktop Process for VisualMind AI
// ============================================================================
const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 5000;
const DEV_PORT = 5173;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function pollHealth(url, maxRetries = 40, interval = 500) {
  return new Promise((resolve) => {
    let retries = 0;
    const check = () => {
      http.get(url, (res) => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          retry();
        }
      }).on('error', retry);
    };

    const retry = () => {
      retries++;
      if (retries >= maxRetries) {
        console.warn(`Server did not respond at ${url} within timeout, proceeding...`);
        resolve(false);
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

function startBackendServer() {
  pollHealth(`http://localhost:${SERVER_PORT}/health`, 2, 200).then((alive) => {
    if (!alive) {
      console.log('Starting internal backend server via tsx...');
      const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      serverProcess = spawn(npxCmd, ['tsx', 'server/index.ts'], {
        cwd: path.resolve(__dirname, '..'),
        env: { ...process.env, PORT: SERVER_PORT.toString() },
        shell: true,
      });

      serverProcess.stdout?.on('data', (d) => console.log(`[Backend] ${d}`));
      serverProcess.stderr?.on('data', (d) => console.error(`[Backend Err] ${d}`));
    } else {
      console.log(`Backend server is already active on port ${SERVER_PORT}.`);
    }
  });
}

async function createWindow() {
  // Wait for either Vite dev server or backend server
  const targetUrl = isDev
    ? `http://localhost:${DEV_PORT}`
    : `http://localhost:${SERVER_PORT}`;

  console.log(`Waiting for service at ${targetUrl}...`);
  await pollHealth(targetUrl, 30, 500);

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: '#030712',
    title: 'VisualMind AI — Visual Knowledge Extraction Engine',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Graceful show on ready-to-show
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open external links in default system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.loadURL(targetUrl).catch((err) => {
    console.error('Failed to load target URL:', err);
    // Fallback to local server port
    mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  startBackendServer();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    try {
      if (process.platform === 'win32') {
        spawn('taskkill', ['/pid', serverProcess.pid.toString(), '/f', '/t']);
      } else {
        serverProcess.kill('SIGTERM');
      }
    } catch {}
  }
});
