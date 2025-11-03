const { app, BrowserWindow, Menu, shell } = require('electron');
const isDev = require('electron-is-dev');
const path = require('path');

let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    titleBarStyle: 'default',
    show: false,
    backgroundColor: '#667eea',
    frame: true,
    resizable: true,
    maximizable: true,
    minimizable: true,
    closable: true,
    center: true,
    autoHideMenuBar: false
  });

  // Load the app - build React app and serve from backend
  const startUrl = isDev 
    ? 'http://localhost:5000' 
    : `file://${path.join(__dirname, '../build/index.html')}`;
  
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
    
    // Open dev tools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });

  // Handle new window requests
  mainWindow.webContents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });

  // Create application menu
  createMenu();
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Task',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-task');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
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
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Task Management',
          click: () => {
            // Show about dialog
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Task Management',
              message: 'Task Management Desktop App',
              detail: 'A beautiful and productive task management application built with Electron and React.'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event listeners
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Prevent default behavior of opening links in external browser
app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    if (parsedUrl.origin !== 'http://localhost:3000' && parsedUrl.origin !== 'file://') {
      event.preventDefault();
      shell.openExternal(navigationUrl);
    }
  });
});
