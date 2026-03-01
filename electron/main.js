const { app, BrowserWindow, Menu, shell, Tray, nativeImage, dialog, clipboard } = require('electron');
const path = require('path');
const http = require('http');
const os = require('os');

let mainWindow = null;
let tray = null;
let server = null;
const PORT = 3456;

// ─── Get local IP ─────────────────────────────────────────────────────────────
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

// ─── Start Express server ─────────────────────────────────────────────────────
function startServer() {
  // Resolve server.js path — works both in dev and packaged app
  const serverPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'server.js')
    : path.join(__dirname, '..', 'server.js');

  // Patch PORT before requiring
  process.env.PORT = PORT;
  server = require(serverPath);
}

// ─── Create main window ───────────────────────────────────────────────────────
function createWindow() {
  const localIP = getLocalIP();
  const participantURL = `http://${localIP}:${PORT}`;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    backgroundColor: '#0F0F14',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    title: 'INVC Header Slots — Facilitator',
    show: false,
  });

  // Load facilitator view
  mainWindow.loadURL(`http://localhost:${PORT}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    // After window opens, show participant URL banner
    mainWindow.webContents.executeJavaScript(`
      (function() {
        const banner = document.createElement('div');
        banner.id = 'participant-banner';
        banner.style.cssText = \`
          position: fixed; bottom: 0; left: 0; right: 0;
          background: #1A1A24; border-top: 1px solid rgba(255,255,255,0.1);
          padding: 10px 20px; display: flex; align-items: center;
          justify-content: space-between; z-index: 9999;
          font-family: 'IBM Plex Mono', monospace; font-size: 12px;
          color: rgba(240,238,248,0.6);
        \`;
        banner.innerHTML = \`
          <span>📡 Participant URL: <strong style="color:#FFD166">${participantURL}</strong></span>
          <button onclick="navigator.clipboard.writeText('${participantURL}').then(()=>{ this.textContent='✓ Copied!'; setTimeout(()=>this.textContent='Copy link',1500) })"
            style="background:#22222C;border:1px solid rgba(255,255,255,0.15);color:#F0EEF8;
                   border-radius:6px;padding:5px 14px;cursor:pointer;font-family:inherit;font-size:11px;">
            Copy link
          </button>
        \`;
        document.body.appendChild(banner);
        // Give bottom padding so content isn't hidden behind banner
        document.body.style.paddingBottom = '44px';
      })();
    `);
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  // Build app menu
  buildMenu(participantURL);
}

// ─── App menu ─────────────────────────────────────────────────────────────────
function buildMenu(participantURL) {
  const localIP = getLocalIP();
  const template = [
    ...(process.platform === 'darwin' ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Session',
      submenu: [
        {
          label: 'Copy Participant Link',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => {
            clipboard.writeText(participantURL);
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Link Copied',
              message: 'Participant link copied to clipboard!',
              detail: participantURL,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Open Participant Link in Browser',
          click: () => shell.openExternal(participantURL)
        },
        { type: 'separator' },
        {
          label: 'Show IP Address',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Session Info',
              message: 'Share this with participants',
              detail: `URL: ${participantURL}\nIP: ${localIP}\nPort: ${PORT}`,
              buttons: ['Copy URL', 'Close']
            }).then(result => {
              if (result.response === 0) clipboard.writeText(participantURL);
            });
          }
        },
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startServer();

  // Small delay to let server bind before loading URL
  setTimeout(createWindow, 500);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('quit', () => {
  if (server && server.close) server.close();
});
