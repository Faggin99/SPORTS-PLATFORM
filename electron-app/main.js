const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

const APP_URL = 'https://app.tactiplan.faggin.com.br'

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    backgroundColor: '#0f172a',
    show: false,
    title: 'TactiPlan',
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  // Handle offline/load errors with a friendly retry page
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return // aborted (ignored)
    console.error('Failed to load:', errorCode, errorDescription, validatedURL)
    mainWindow.loadFile(path.join(__dirname, 'assets', 'offline.html')).catch(() => {
      mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
        <html><head><title>TactiPlan - Sem Conexao</title>
        <style>
          body { font-family: system-ui, sans-serif; background:#0f172a; color:#f1f5f9; margin:0; height:100vh; display:flex; align-items:center; justify-content:center; }
          .box { text-align:center; max-width:400px; padding:2rem; }
          h1 { color:#2563eb; margin-bottom:0.5rem; }
          button { background:#2563eb; color:#fff; border:none; padding:0.75rem 1.5rem; font-size:1rem; border-radius:0.375rem; cursor:pointer; margin-top:1rem; }
          button:hover { background:#1d4ed8; }
        </style></head>
        <body><div class="box">
          <h1>TactiPlan</h1>
          <p>Sem conexao com o servidor.</p>
          <p style="color:#94a3b8;font-size:0.875rem;">Verifique sua conexao com a internet.</p>
          <button onclick="location.href='${APP_URL}'">Tentar novamente</button>
        </div></body></html>
      `)}`)
    })
  })

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.loadURL(APP_URL)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Simple menu
function createMenu() {
  const template = [
    {
      label: 'Arquivo',
      submenu: [
        { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.reload() },
        { label: 'Forcar Recarregar', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Sair', role: 'quit' },
      ],
    },
    {
      label: 'Visualizar',
      submenu: [
        { label: 'Tela Cheia', role: 'togglefullscreen' },
        { label: 'Ampliar', role: 'zoomIn' },
        { label: 'Reduzir', role: 'zoomOut' },
        { label: 'Zoom Padrao', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'DevTools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  createMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
