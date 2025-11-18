const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

let mainWindow
let laravelProcess
let frontendProcess

function startBackend() {
  const laravelPath = path.join(__dirname, '..', 'backend')

  console.log('Starting Laravel backend on port 8000...')
  laravelProcess = spawn('php', ['artisan', 'serve', '--port=8000'], {
    cwd: laravelPath,
    shell: true
  })

  laravelProcess.stdout.on('data', (data) => {
    console.log(`[Laravel] ${data}`)
  })

  laravelProcess.stderr.on('data', (data) => {
    console.error(`[Laravel Error] ${data}`)
  })
}

function startFrontend() {
  const frontendPath = path.join(__dirname, '..', 'frontend')

  console.log('Starting Vite frontend on port 5173...')
  frontendProcess = spawn('npm', ['run', 'dev'], {
    cwd: frontendPath,
    shell: true
  })

  frontendProcess.stdout.on('data', (data) => {
    console.log(`[Vite] ${data}`)
  })

  frontendProcess.stderr.on('data', (data) => {
    console.error(`[Vite Error] ${data}`)
  })
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    backgroundColor: '#ffffff',
    show: false, // Don't show until ready
    titleBarStyle: 'default'
  })

  // Show window when ready to prevent flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  // Load the app
  if (process.env.NODE_ENV === 'development') {
    // Development mode: load from Vite dev server
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    // Production mode: load from dist folder
    mainWindow.loadFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  console.log('Electron app is ready!')

  // Start backend
  startBackend()

  // In development, also start frontend
  if (process.env.NODE_ENV === 'development') {
    startFrontend()
    // Wait for services to start before creating window
    setTimeout(createWindow, 5000)
  } else {
    // In production, just wait for backend
    setTimeout(createWindow, 3000)
  }
})

app.on('before-quit', () => {
  console.log('Shutting down services...')
  if (laravelProcess) {
    laravelProcess.kill()
  }
  if (frontendProcess) {
    frontendProcess.kill()
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
