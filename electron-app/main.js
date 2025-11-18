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
    ? path.join(process.resourcesPath, 'app', 'backend')
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
    return path.join(process.resourcesPath, 'app', 'php-portable', 'php.exe')
  } else {
    // Development: use system PHP
    return 'php'
  }
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const sourceBackendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'backend')
      : path.join(__dirname, '..', 'backend')

    const userDataPath = app.getPath('userData')
    const backendPath = path.join(userDataPath, 'backend')

    // Copy backend to writable location on first run
    if (!fs.existsSync(backendPath)) {
      console.log('First run: copying backend to user data folder...')
      console.log('Source:', sourceBackendPath)
      console.log('Destination:', backendPath)

      // Copy backend excluding vendor first (faster)
      fs.cpSync(sourceBackendPath, backendPath, {
        recursive: true,
        filter: (src) => !src.includes('vendor')
      })
      console.log('Backend copied (without vendor)')

      // Copy vendor separately with progress
      const sourceVendor = path.join(sourceBackendPath, 'vendor')
      const destVendor = path.join(backendPath, 'vendor')

      if (fs.existsSync(sourceVendor)) {
        console.log('Copying vendor folder...')
        console.log('From:', sourceVendor)
        console.log('To:', destVendor)
        fs.cpSync(sourceVendor, destVendor, { recursive: true })
        console.log('Vendor copied successfully')
      } else {
        console.error('WARNING: Source vendor folder not found at:', sourceVendor)
      }

      console.log('Backend setup complete')
    } else {
      console.log('Backend already exists at:', backendPath)

      // Verify vendor exists, if not, copy it
      const destVendor = path.join(backendPath, 'vendor')
      if (!fs.existsSync(destVendor)) {
        console.log('Vendor missing, copying now...')
        const sourceVendor = path.join(sourceBackendPath, 'vendor')
        if (fs.existsSync(sourceVendor)) {
          fs.cpSync(sourceVendor, destVendor, { recursive: true })
          console.log('Vendor copied successfully')
        } else {
          console.error('ERROR: Source vendor not found at:', sourceVendor)
        }
      }
    }

    const dbPath = initializeDatabase()
    const phpPath = getPHPPath()

    console.log('Starting Laravel backend on port 8000...')
    console.log('PHP:', phpPath)
    console.log('Backend:', backendPath)
    console.log('Database:', dbPath)

    // Check if PHP exists
    if (!fs.existsSync(phpPath) && app.isPackaged) {
      const error = `PHP not found at: ${phpPath}`
      console.error(error)
      reject(new Error(error))
      return
    }

    // Create storage directories in user data folder (not in Program Files)
    const storagePath = path.join(userDataPath, 'storage')
    const storageFramework = path.join(storagePath, 'framework')
    const dirs = [
      path.join(storageFramework, 'cache', 'data'),
      path.join(storageFramework, 'sessions'),
      path.join(storageFramework, 'views'),
      path.join(storagePath, 'logs')
    ]

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log('Created directory:', dir)
      }
    })

    // Create .env file in backend folder using data from user folder
    const userEnvPath = path.join(userDataPath, '.env')
    const backendEnvPath = path.join(backendPath, '.env')
    let appKey = ''

    // Read or create APP_KEY in user data folder
    if (!fs.existsSync(userEnvPath)) {
      appKey = 'base64:' + require('crypto').randomBytes(32).toString('base64')
      const envContent = `APP_KEY=${appKey}
`
      fs.writeFileSync(userEnvPath, envContent)
      console.log('Created APP_KEY file at:', userEnvPath)
    } else {
      const envContent = fs.readFileSync(userEnvPath, 'utf8')
      const match = envContent.match(/APP_KEY=(.+)/)
      if (match) {
        appKey = match[1].trim()
      }
    }

    // Create .env in backend folder (will be recreated each time)
    const backendEnvContent = `APP_NAME="Sports Platform"
APP_ENV=production
APP_KEY=${appKey}
APP_DEBUG=false
APP_URL=http://localhost:8000

DB_CONNECTION=sqlite
DB_DATABASE=${dbPath.replace(/\\/g, '\\\\')}

CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync

LOG_CHANNEL=single
LOG_LEVEL=debug
`
    fs.writeFileSync(backendEnvPath, backendEnvContent)
    console.log('Created .env file at:', backendEnvPath)

    // Configure PHP extension directory with error logging
    const phpIniPath = path.join(userDataPath, 'php.ini')
    const phpErrorLogPath = path.join(userDataPath, 'logs', 'php-error.log')

    // Ensure logs directory exists
    const logsDir = path.join(userDataPath, 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    const phpDir = path.dirname(phpPath)
    const phpIniContent = `extension_dir="${path.join(phpDir, 'ext')}"
extension=fileinfo
extension=mbstring
extension=openssl
extension=pdo_sqlite
extension=sqlite3

; Error logging
display_errors=On
display_startup_errors=On
log_errors=On
error_log="${phpErrorLogPath.replace(/\\/g, '\\\\')}"
error_reporting=E_ALL
`
    fs.writeFileSync(phpIniPath, phpIniContent)
    console.log('Created php.ini at:', phpIniPath)
    console.log('PHP errors will be logged to:', phpErrorLogPath)

    // Create log files for Laravel output
    const laravelLogPath = path.join(userDataPath, 'logs', 'laravel-output.log')
    const laravelErrorLogPath = path.join(userDataPath, 'logs', 'laravel-error.log')
    const laravelLogStream = fs.createWriteStream(laravelLogPath, { flags: 'a' })
    const laravelErrorLogStream = fs.createWriteStream(laravelErrorLogPath, { flags: 'a' })

    // Log startup info
    const startupInfo = `
========================================
Laravel Startup - ${new Date().toISOString()}
========================================
PHP Path: ${phpPath}
PHP Ini: ${phpIniPath}
Backend Path: ${backendPath}
Database Path: ${dbPath}
User Data Path: ${userDataPath}

Checking prerequisites...
`
    laravelLogStream.write(startupInfo)
    console.log(startupInfo)

    // Verify critical files exist
    const criticalFiles = [
      { path: phpPath, name: 'PHP executable' },
      { path: path.join(backendPath, 'artisan'), name: 'artisan' },
      { path: path.join(backendPath, 'vendor', 'autoload.php'), name: 'vendor/autoload.php' },
      { path: backendEnvPath, name: '.env file' },
      { path: dbPath, name: 'database.sqlite' }
    ]

    for (const file of criticalFiles) {
      const exists = fs.existsSync(file.path)
      const status = `${file.name}: ${exists ? '✓ EXISTS' : '✗ MISSING'} (${file.path})`
      laravelLogStream.write(status + '\n')
      console.log(status)

      if (!exists) {
        const error = `Critical file missing: ${file.name} at ${file.path}`
        laravelErrorLogStream.write(error + '\n')
        reject(new Error(error))
        return
      }
    }

    laravelLogStream.write('\nStarting Laravel server...\n\n')

    laravelProcess = spawn(phpPath, ['-c', phpIniPath, 'artisan', 'serve', '--port=8000', '--host=127.0.0.1'], {
      cwd: backendPath,
      shell: false,
      env: {
        ...process.env,
        // Laravel will read .env from backend folder automatically
        APP_ENV: 'production',
        DB_CONNECTION: 'sqlite',
        DB_DATABASE: dbPath
      }
    })

    let serverStarted = false
    let errorOutput = ''

    laravelProcess.stdout.on('data', (data) => {
      const output = data.toString()
      console.log(`[Laravel] ${output}`)
      laravelLogStream.write(output)

      // Check if server started successfully
      if (output.includes('started') || output.includes('Development Server')) {
        if (!serverStarted) {
          serverStarted = true
          console.log('[Laravel] Server is ready!')
          laravelLogStream.write('✓ Laravel server started successfully!\n')
          resolve()
        }
      }
    })

    laravelProcess.stderr.on('data', (data) => {
      const error = data.toString()
      console.error(`[Laravel Error] ${error}`)
      errorOutput += error + '\n'
      laravelErrorLogStream.write(error)
    })

    laravelProcess.on('error', (err) => {
      const errorMsg = `Failed to start Laravel process: ${err.message}\n`
      console.error(errorMsg)
      laravelErrorLogStream.write(errorMsg)
      reject(err)
    })

    laravelProcess.on('exit', (code) => {
      const exitMsg = `Laravel process exited with code ${code}\n`
      laravelLogStream.write(exitMsg)
      laravelErrorLogStream.write(exitMsg)

      if (code !== 0 && !serverStarted) {
        const logPath = laravelErrorLogPath
        const errorMessage = errorOutput
          ? `Laravel exited with code ${code}\n\nDetalhes:\n${errorOutput}\n\nLogs completos em: ${logPath}`
          : `Laravel exited with code ${code}\n\nNenhum erro capturado no stderr.\n\nVerifique os logs em:\n${logPath}\n${phpErrorLogPath}`
        reject(new Error(errorMessage))
      }

      laravelLogStream.end()
      laravelErrorLogStream.end()
    })

    // Timeout after 10 seconds
    setTimeout(() => {
      if (!serverStarted) {
        reject(new Error('Laravel server timeout'))
      }
    }, 10000)
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
    // Production mode: wait for backend to be ready, then load frontend
    const frontendPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app', 'frontend', 'dist', 'index.html')
      : path.join(__dirname, '..', 'frontend', 'dist', 'index.html')

    console.log('Loading frontend from:', frontendPath)
    mainWindow.loadFile(frontendPath)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  console.log('Electron app is ready!')

  try {
    // Start backend and wait for it to be ready
    await startBackend()
    console.log('Backend started successfully!')

    // In development, also start frontend
    if (process.env.NODE_ENV === 'development') {
      startFrontend()
      // Wait a bit more for Vite
      await new Promise(resolve => setTimeout(resolve, 3000))
    }

    // Create window after backend is ready
    createWindow()
  } catch (error) {
    console.error('Failed to start application:', error)

    // Show error dialog
    const { dialog } = require('electron')
    dialog.showErrorBox(
      'Erro ao Iniciar',
      `Não foi possível iniciar o servidor:\n\n${error.message}\n\nVerifique os logs para mais detalhes.`
    )

    app.quit()
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
