const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn } = require('child_process')
const fs = require('fs')

let mainWindow
let laravelProcess
let frontendProcess

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'database.sqlite')
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', 'backend')

  console.log('Database path:', dbPath)

  // Create database if doesn't exist
  if (!fs.existsSync(dbPath)) {
    console.log('Creating new database...')
    fs.writeFileSync(dbPath, '')

    // Run migrations
    const phpPath = getPHPPath()
    const artisanPath = path.join(backendPath, 'artisan')

    spawn(phpPath, [artisanPath, 'migrate', '--force', '--seed'], {
      cwd: backendPath,
      env: {
        ...process.env,
        DB_DATABASE: dbPath
      }
    })
  }

  return dbPath
}

function getPHPPath() {
  if (app.isPackaged) {
    // Production: use bundled PHP
    return path.join(process.resourcesPath, 'php-portable', 'php.exe')
  } else {
    // Development: use system PHP
    return 'php'
  }
}

function startBackend() {
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'backend')
    : path.join(__dirname, '..', 'backend')

  const dbPath = initializeDatabase()
  const phpPath = getPHPPath()

  console.log('Starting Laravel backend on port 8000...')
  console.log('PHP:', phpPath)
  console.log('Backend:', backendPath)

  laravelProcess = spawn(phpPath, ['artisan', 'serve', '--port=8000', '--host=127.0.0.1'], {
    cwd: backendPath,
    shell: false,
    env: {
      ...process.env,
      APP_ENV: 'production',
      DB_CONNECTION: 'sqlite',
      DB_DATABASE: dbPath
    }
  })

  laravelProcess.stdout.on('data', (data) => {
    console.log(`[Laravel] ${data}`)
  })

  laravelProcess.stderr.on('data', (data) => {
    console.error(`[Laravel Error] ${data}`)
  })

  laravelProcess.on('error', (err) => {
    console.error('Failed to start Laravel:', err)
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
