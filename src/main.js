const { app, BrowserWindow, Menu, shell, ipcMain, dialog, globalShortcut } = require('electron');
const Store = require('electron-store');
const path = require('path');

let autoUpdater;

// Configure store for settings
const store = new Store({
  defaults: {
    windowBounds: { width: 280, height: 0 }, // height will be set to full screen
    sidebarPosition: 'right',
    theme: 'dark'
  }
});

class HeadsUpApp {
  constructor() {
    this.mainWindow = null;
    this.isDev = process.argv.includes('--dev');
    
    this.setupApp();
  }

  setupApp() {
    // Set app user model ID for Windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.headsup.app');
    }

    // Handle app events
    app.whenReady().then(() => {
      // Initialize auto-updater after app is ready
      if (!this.isDev) {
        try {
          autoUpdater = require('electron-updater').autoUpdater;
          this.setupAutoUpdater();
          autoUpdater.checkForUpdatesAndNotify();
        } catch (error) {
          console.log('Auto-updater not available:', error.message);
        }
      }
      
      this.createWindow();
    });
    app.on('window-all-closed', () => this.handleWindowsClosed());
    app.on('activate', () => this.handleActivate());
    app.on('before-quit', () => this.handleBeforeQuit());

    // Setup IPC handlers
    this.setupIPC();
  }

  createWindow() {
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    
    // Use fixed narrow width for panel
    const panelWidth = 320;
    
    console.log('Screen dimensions:', { screenWidth, screenHeight });
    console.log('Panel position will be:', { 
      x: screenWidth - panelWidth, 
      y: 0, 
      width: panelWidth, 
      height: screenHeight 
    });
    
    this.mainWindow = new BrowserWindow({
      width: panelWidth,
      height: screenHeight, // Full height
      x: screenWidth - panelWidth, // Right edge
      y: 0, // Top of screen
      minWidth: 250,
      minHeight: 400,
      maxWidth: 400,
      show: true,
      alwaysOnTop: true,
      resizable: false,
      frame: false, // Frameless for clean panel look
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: -100, y: -100 }, // Hide traffic light buttons completely
      transparent: true, // Enable transparency
      backgroundColor: '#00000000', // Transparent background
      focusable: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: false, // Allow microphone access
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        partition: 'persist:main' // Allow network requests for speech recognition
      },
      icon: this.getAppIcon()
    });

    // Force visibility
    this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.setFullScreenable(false);

    // Load the application
    this.mainWindow.loadFile('src/index.html');

    // Setup window events
    this.setupWindowEvents();

    // Setup menu
    this.setupMenu();

    // Setup global shortcuts
    this.setupGlobalShortcuts();

    // Setup media permissions for this window
    this.setupMediaPermissions();

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      this.mainWindow.show();
      this.mainWindow.focus();
      
      // Set user agent to appear like regular Chrome browser for speech recognition
      this.mainWindow.webContents.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Force DevTools to open for debugging
      setTimeout(() => {
        this.mainWindow.webContents.openDevTools({ mode: 'detach' });
      }, 1000);
    });
    
    this.mainWindow.on('closed', () => {
      console.log('Window closed');
      this.mainWindow = null;
    });
  }

  setupWindowEvents() {
    // Save window bounds on resize/move
    this.mainWindow.on('resize', () => this.saveWindowBounds());
    this.mainWindow.on('move', () => this.saveWindowBounds());

    // Handle external links
    this.mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Prevent navigation
    this.mainWindow.webContents.on('will-navigate', (event, url) => {
      if (url !== this.mainWindow.webContents.getURL()) {
        event.preventDefault();
        shell.openExternal(url);
      }
    });
  }

  setupMenu() {
    const template = [
      {
        label: 'Heads Up',
        submenu: [
          {
            label: 'About Heads Up',
            click: () => this.showAbout()
          },
          { type: 'separator' },
          {
            label: 'Preferences...',
            accelerator: 'CmdOrCtrl+,',
            click: () => this.mainWindow.webContents.send('show-preferences')
          },
          { type: 'separator' },
          {
            label: 'Check for Updates...',
            click: () => {
              if (autoUpdater) {
                autoUpdater.checkForUpdatesAndNotify();
              }
            }
          },
          { type: 'separator' },
          {
            label: 'Quit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => app.quit()
          }
        ]
      },
      {
        label: 'Session',
        submenu: [
          {
            label: 'Start Recording',
            accelerator: 'CmdOrCtrl+R',
            click: () => this.mainWindow.webContents.send('start-recording')
          },
          {
            label: 'Stop Recording',
            accelerator: 'CmdOrCtrl+S',
            click: () => this.mainWindow.webContents.send('stop-recording')
          },
          { type: 'separator' },
          {
            label: 'Save Session',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: () => this.mainWindow.webContents.send('save-session')
          },
          {
            label: 'Clear Session',
            accelerator: 'CmdOrCtrl+Shift+C',
            click: () => this.mainWindow.webContents.send('clear-session')
          }
        ]
      },
      {
        label: 'View',
        submenu: [
          {
            label: 'Toggle Live View',
            accelerator: 'CmdOrCtrl+L',
            click: () => this.mainWindow.webContents.send('toggle-live-view')
          },
          {
            label: 'Toggle Content Mapping',
            accelerator: 'CmdOrCtrl+M',
            click: () => this.mainWindow.webContents.send('toggle-content-mapping')
          },
          { type: 'separator' },
          {
            label: 'Reload',
            accelerator: 'CmdOrCtrl+Shift+R',
            click: () => this.mainWindow.reload()
          },
          {
            label: 'Force Reload',
            accelerator: 'CmdOrCtrl+Shift+F5',
            click: () => this.mainWindow.webContents.reloadIgnoringCache()
          },
          {
            label: 'Toggle Developer Tools',
            accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            click: () => this.mainWindow.webContents.toggleDevTools()
          }
        ]
      },
      {
        label: 'Window',
        submenu: [
          {
            label: 'Minimize',
            accelerator: 'CmdOrCtrl+M',
            click: () => this.mainWindow.minimize()
          },
          {
            label: 'Close',
            accelerator: 'CmdOrCtrl+W',
            click: () => this.mainWindow.close()
          }
        ]
      },
      {
        label: 'Help',
        submenu: [
          {
            label: 'Show Tutorial',
            click: () => this.mainWindow.webContents.send('show-tutorial')
          },
          {
            label: 'Report Issue',
            click: () => shell.openExternal('https://github.com/your-username/heads-up/issues')
          },
          {
            label: 'Learn More',
            click: () => shell.openExternal('https://headsup.app')
          }
        ]
      }
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  }

  setupGlobalShortcuts() {
    // Global shortcuts for quick actions
    globalShortcut.register('CommandOrControl+Shift+H', () => {
      if (this.mainWindow.isVisible()) {
        this.mainWindow.hide();
      } else {
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });
  }

  setupIPC() {
    // Handle app info requests
    ipcMain.handle('get-app-info', () => ({
      version: app.getVersion(),
      platform: process.platform,
      isDev: this.isDev
    }));

    // Handle store operations
    ipcMain.handle('store-get', (_, key) => store.get(key));
    ipcMain.handle('store-set', (_, key, value) => store.set(key, value));
    ipcMain.handle('store-delete', (_, key) => store.delete(key));

    // Handle file operations
    ipcMain.handle('show-save-dialog', async (_, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow, options);
      return result;
    });

    ipcMain.handle('show-open-dialog', async (_, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, options);
      return result;
    });

    // Handle notifications
    ipcMain.handle('show-notification', (_, options) => {
      // Use Electron's built-in notification instead of node-notifier
      if (this.mainWindow) {
        this.mainWindow.webContents.send('show-notification', options);
      }
    });

    // Handle window operations
    ipcMain.handle('minimize-window', () => this.mainWindow.minimize());
    ipcMain.handle('maximize-window', () => {
      if (this.mainWindow.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow.maximize();
      }
    });
    ipcMain.handle('close-window', () => this.mainWindow.close());

    // Handle restart
    ipcMain.handle('restart-app', () => {
      app.relaunch();
      app.quit();
    });
  }

  setupAutoUpdater() {
    if (!autoUpdater) return;
    
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for update...');
    });

    autoUpdater.on('update-available', (info) => {
      console.log('Update available.');
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-available', info);
      }
    });

    autoUpdater.on('update-not-available', (info) => {
      console.log('Update not available.');
    });

    autoUpdater.on('error', (err) => {
      console.log('Error in auto-updater. ' + err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-progress', progressObj);
      }
    });

    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded');
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update-downloaded', info);
      }
    });
  }

  saveWindowBounds() {
    if (!this.mainWindow.isMaximized() && !this.mainWindow.isMinimized()) {
      store.set('windowBounds', this.mainWindow.getBounds());
    }
  }

  getAppIcon() {
    if (process.platform === 'darwin') {
      return path.join(__dirname, '../assets/icon.icns');
    } else if (process.platform === 'win32') {
      return path.join(__dirname, '../assets/icon.ico');
    } else {
      return path.join(__dirname, '../assets/icon.png');
    }
  }

  showAbout() {
    dialog.showMessageBox(this.mainWindow, {
      type: 'info',
      title: 'About Heads Up',
      message: 'Heads Up',
      detail: `Version ${app.getVersion()}\n\nAI-powered real-time sales coaching assistant\n\n© 2024 Heads Up. All rights reserved.`,
      buttons: ['OK']
    });
  }

  handleWindowsClosed() {
    console.log('All windows closed');
    // Always quit when all windows are closed for debugging
    app.quit();
  }

  handleActivate() {
    if (BrowserWindow.getAllWindows().length === 0) {
      this.createWindow();
    }
  }

  handleBeforeQuit() {
    globalShortcut.unregisterAll();
  }

  setupMediaPermissions() {
    // Set permission request handler for this window
    if (this.mainWindow && this.mainWindow.webContents) {
      this.mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback, details) => {
        console.log('Permission requested:', permission, details);
        
        // Always allow microphone for speech recognition
        if (permission === 'microphone') {
          console.log('Granting microphone permission');
          callback(true);
          return;
        }
        
        // Allow media permissions
        if (permission === 'media') {
          console.log('Granting media permission');
          callback(true);
          return;
        }
        
        console.log('Denying permission for:', permission);
        callback(false);
      });

      // Set device permission handler with more verbose logging
      this.mainWindow.webContents.session.setDevicePermissionHandler((details) => {
        console.log('Device permission requested:', JSON.stringify(details, null, 2));
        if (details.deviceType === 'microphone') {
          console.log('Granting device microphone access');
          return true;
        }
        return false;
      });

      // Enable microphone access flag
      this.mainWindow.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
        console.log('Permission check:', permission, requestingOrigin, details);
        if (permission === 'microphone' || permission === 'media') {
          return true;
        }
        return false;
      });

      // Enable network access for speech recognition APIs
      this.mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        // Allow requests to Google's speech recognition servers
        if (details.url.includes('speech.googleapis.com') || 
            details.url.includes('google.com') ||
            details.url.includes('googleapis.com')) {
          console.log('Allowing speech API request to:', details.url);
        }
        callback({ requestHeaders: details.requestHeaders });
      });
    }
  }
}

// Create app instance
new HeadsUpApp();