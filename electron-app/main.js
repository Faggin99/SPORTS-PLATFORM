const { app, BrowserWindow } = require('electron')
const path = require('path')
const { spawn, spawnSync } = require('child_process')
const fs = require('fs')

let mainWindow
let laravelProcess
let frontendProcess

// Versão atual do app (deve corresponder ao package.json)
const APP_VERSION = '1.2.0'

/**
 * Verifica se precisa atualizar os arquivos do backend
 * Isso permite que atualizações do instalador sejam propagadas
 * sem precisar desinstalar/reinstalar
 */
function checkAndUpdateBackend() {
  const userDataPath = app.getPath('userData')
  const versionFile = path.join(userDataPath, '.app-version')
  const backendPath = path.join(userDataPath, 'backend')

  console.log('=== Verificando atualização ===')
  console.log('User data path:', userDataPath)
  console.log('Version file:', versionFile)
  console.log('Backend path:', backendPath)

  let installedVersion = '0.0.0'

  // Ler versão instalada
  if (fs.existsSync(versionFile)) {
    try {
      installedVersion = fs.readFileSync(versionFile, 'utf8').trim()
    } catch (e) {
      console.log('Erro ao ler versão:', e.message)
    }
  }

  console.log(`Versão instalada: ${installedVersion}`)
  console.log(`Versão atual: ${APP_VERSION}`)

  const sourceBackendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'backend')
    : path.join(__dirname, '..', 'backend')

  console.log('Source backend path:', sourceBackendPath)
  console.log('Source backend exists:', fs.existsSync(sourceBackendPath))

  // Se a versão mudou, atualizar o backend
  if (installedVersion !== APP_VERSION) {
    console.log('🔄 Nova versão detectada! Atualizando backend...')

    // Se o backend existir, atualizá-lo
    if (fs.existsSync(backendPath)) {
      try {
        // Preservar arquivos importantes do usuário
        const preserveFiles = ['.env']
        const preserved = {}

        for (const file of preserveFiles) {
          const filePath = path.join(backendPath, file)
          if (fs.existsSync(filePath)) {
            preserved[file] = fs.readFileSync(filePath, 'utf8')
            console.log(`📦 Preservando ${file}`)
          }
        }

        // Remover backend antigo
        console.log('🗑️  Removendo backend antigo...')
        fs.rmSync(backendPath, { recursive: true, force: true })

        // Copiar novo backend
        console.log('📁 Copiando novo backend de:', sourceBackendPath)
        fs.cpSync(sourceBackendPath, backendPath, {
          recursive: true,
          filter: (src) => !src.includes('vendor')
        })
        console.log('📁 Backend copiado (sem vendor)')

        // Verificar se artisan foi copiado
        const artisanPath = path.join(backendPath, 'artisan')
        console.log('Artisan path:', artisanPath)
        console.log('Artisan exists:', fs.existsSync(artisanPath))

        // Copiar vendor
        const sourceVendor = path.join(sourceBackendPath, 'vendor')
        const destVendor = path.join(backendPath, 'vendor')
        if (fs.existsSync(sourceVendor)) {
          console.log('📁 Copiando vendor de:', sourceVendor)
          fs.cpSync(sourceVendor, destVendor, { recursive: true })
          console.log('📁 Vendor copiado')
        } else {
          console.error('❌ Vendor não encontrado em:', sourceVendor)
        }

        // Restaurar arquivos preservados
        for (const [file, content] of Object.entries(preserved)) {
          const filePath = path.join(backendPath, file)
          fs.writeFileSync(filePath, content)
          console.log(`📦 Restaurando ${file}`)
        }

        console.log('✅ Backend atualizado com sucesso!')
      } catch (e) {
        console.error('❌ Erro ao atualizar backend:', e.message)
        console.error('Stack:', e.stack)
      }
    } else {
      console.log('Backend não existe ainda, será criado na primeira execução')
    }

    // Salvar nova versão
    try {
      fs.writeFileSync(versionFile, APP_VERSION)
      console.log(`✅ Versão atualizada para ${APP_VERSION}`)
    } catch (e) {
      console.error('❌ Erro ao salvar versão:', e.message)
    }

    return true // Indica que houve atualização
  }

  return false // Não houve atualização
}

function initializeDatabase() {
  const dbPath = path.join(app.getPath('userData'), 'database.sqlite')
  const backendPath = app.isPackaged
    ? path.join(process.resourcesPath, 'app', 'backend')
    : path.join(__dirname, '..', 'backend')

  console.log('Database path:', dbPath)

  // Copy pre-populated database if doesn't exist
  if (!fs.existsSync(dbPath)) {
    console.log('First run - copying pre-populated database...')
    const sourceDb = path.join(backendPath, 'database', 'database.sqlite')

    if (fs.existsSync(sourceDb)) {
      fs.copyFileSync(sourceDb, dbPath)
      console.log('✅ Database copied successfully with existing users!')
    } else {
      console.log('⚠️  Source database not found, creating empty database...')
      fs.writeFileSync(dbPath, '')

      // Run migrations if we had to create empty database
      const phpPath = getPHPPath()
      const phpDir = path.dirname(phpPath)
      const phpIniPath = path.join(phpDir, 'php.ini')
      const artisanPath = path.join(backendPath, 'artisan')

      console.log('Running migrations and seeding (this may take a moment)...')

      // Use spawnSync to wait for migrations to complete BEFORE starting the server
      const migrateResult = spawnSync(phpPath, ['-c', phpIniPath, artisanPath, 'migrate:fresh', '--force', '--seed'], {
        cwd: backendPath,
        shell: false,
        env: {
          ...process.env,
          DB_CONNECTION: 'sqlite',
          DB_DATABASE: dbPath,
          APP_ENV: 'production'
        },
        encoding: 'utf8'
      })

      if (migrateResult.stdout) {
        console.log('[Migration]', migrateResult.stdout)
      }

      if (migrateResult.stderr) {
        console.error('[Migration Error]', migrateResult.stderr)
      }

      console.log(`Migration completed with code ${migrateResult.status}`)

      // After migrations, ensure trainer user exists
      if (migrateResult.status === 0) {
        console.log('Creating/updating trainer user...')
        const createTrainerScript = path.join(backendPath, 'create_trainer.php')

        const trainerResult = spawnSync(phpPath, ['-c', phpIniPath, createTrainerScript], {
          cwd: backendPath,
          shell: false,
          env: {
            ...process.env,
            DB_CONNECTION: 'sqlite',
            DB_DATABASE: dbPath
          },
          encoding: 'utf8'
        })

        if (trainerResult.stdout) {
          console.log('[Trainer]', trainerResult.stdout)
        }

        if (trainerResult.stderr) {
          console.error('[Trainer Error]', trainerResult.stderr)
        }

        console.log(`Trainer setup completed with code ${trainerResult.status}`)
      }
    }
  } else {
    console.log('Database already exists, using existing data')
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

    // Verificar se precisa atualizar (nova versão instalada)
    const wasUpdated = checkAndUpdateBackend()

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

      // Salvar versão após primeira instalação
      const versionFile = path.join(userDataPath, '.app-version')
      fs.writeFileSync(versionFile, APP_VERSION)

      console.log('Backend setup complete')
    } else if (!wasUpdated) {
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

    console.log('Starting Laravel backend on port 8080...')
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
APP_URL=http://localhost:8080

DB_CONNECTION=sqlite
DB_DATABASE=${dbPath.replace(/\\/g, '\\\\')}

CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=sync

LOG_CHANNEL=single
LOG_LEVEL=debug

VIEW_COMPILED_PATH=${path.join(storagePath, 'framework', 'views').replace(/\\/g, '\\\\')}
CACHE_PATH=${path.join(storagePath, 'framework', 'cache').replace(/\\/g, '\\\\')}
`
    fs.writeFileSync(backendEnvPath, backendEnvContent)
    console.log('Created .env file at:', backendEnvPath)

    // Setup logging directory
    const logsDir = path.join(userDataPath, 'logs')
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }

    // Create log files for Laravel output
    const laravelLogPath = path.join(userDataPath, 'logs', 'laravel-output.log')
    const laravelErrorLogPath = path.join(userDataPath, 'logs', 'laravel-error.log')
    const laravelLogStream = fs.createWriteStream(laravelLogPath, { flags: 'a' })
    const laravelErrorLogStream = fs.createWriteStream(laravelErrorLogPath, { flags: 'a' })

    // Get PHP ini path
    const phpDir = path.dirname(phpPath)
    const phpIniPath = path.join(phpDir, 'php.ini')

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
      { path: phpIniPath, name: 'php.ini' },
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

    // Use PHP built-in server directly instead of artisan serve to avoid socket issues
    // The router script will be public/index.php (Laravel's default)
    const publicPath = path.join(backendPath, 'public')
    const routerScript = path.join(publicPath, 'index.php')

    // Use shell: false to avoid issues with spaces in paths - Node.js handles path quoting automatically
    laravelProcess = spawn(phpPath, ['-c', phpIniPath, '-S', '127.0.0.1:8080', '-t', publicPath, routerScript], {
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

      // PHP built-in server outputs startup info to stderr
      if (error.includes('started') || error.includes('Development Server')) {
        if (!serverStarted) {
          serverStarted = true
          console.log('[Laravel] Server is ready!')
          laravelLogStream.write('✓ Laravel server started successfully!\n')
          resolve()
        }
      }
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
