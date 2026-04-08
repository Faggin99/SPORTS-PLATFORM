const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PHP_VERSION = '8.3.27';
const PHP_URL = `https://windows.php.net/downloads/releases/php-${PHP_VERSION}-nts-Win32-vs16-x64.zip`;
const PHP_DIR = path.join(__dirname, 'php-portable');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log('Downloading from:', url);

    const protocol = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);

    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Sports-Platform-Setup/1.0'
      }
    };

    const request = protocol.get(url, options, (response) => {
      // Handle redirects
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        console.log('Following redirect to:', response.headers.location);
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
      }

      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloaded = 0;

      response.on('data', (chunk) => {
        downloaded += chunk.length;
        const percent = ((downloaded / totalSize) * 100).toFixed(1);
        process.stdout.write(`\rDownloading... ${percent}%`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete!');
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
    });

    request.on('error', (err) => {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    });

    request.setTimeout(30000, () => {
      request.abort();
      file.close();
      fs.unlink(dest, () => {});
      reject(new Error('Download timeout'));
    });
  });
}

async function extractZip(zipPath, extractPath) {
  const sevenZip = path.join(__dirname, 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe');

  if (!fs.existsSync(sevenZip)) {
    throw new Error('7zip not found. Run npm install first.');
  }

  await execAsync(`"${sevenZip}" x "${zipPath}" -o"${extractPath}" -y`);
}

async function setupPHP() {
  console.log('🚀 Setting up PHP portable...');

  // Create directory
  if (!fs.existsSync(PHP_DIR)) {
    fs.mkdirSync(PHP_DIR, { recursive: true });
  }

  const zipPath = path.join(__dirname, 'php.zip');

  // Check if already downloaded
  if (fs.existsSync(path.join(PHP_DIR, 'php.exe'))) {
    console.log('✅ PHP already set up!');
    return;
  }

  console.log('📥 Downloading PHP...');
  await downloadFile(PHP_URL, zipPath);

  console.log('📦 Extracting PHP...');
  await extractZip(zipPath, PHP_DIR);

  // Copy production php.ini
  console.log('📄 Creating production php.ini...');
  const phpIni = path.join(PHP_DIR, 'php.ini');
  const productionIni = path.join(__dirname, 'php-portable-production.ini');

  if (fs.existsSync(productionIni)) {
    // Copy production INI
    fs.copyFileSync(productionIni, phpIni);
    console.log('✅ Production php.ini installed');
  } else {
    // Fallback: use development INI
    console.log('⚠️  Production INI not found, using development INI...');
    const phpIniDev = path.join(PHP_DIR, 'php.ini-development');
    if (fs.existsSync(phpIniDev)) {
      fs.copyFileSync(phpIniDev, phpIni);

      // Enable required extensions
      let iniContent = fs.readFileSync(phpIni, 'utf8');
      iniContent = iniContent
        .replace(/;extension=fileinfo/g, 'extension=fileinfo')
        .replace(/;extension=mbstring/g, 'extension=mbstring')
        .replace(/;extension=openssl/g, 'extension=openssl')
        .replace(/;extension=pdo_sqlite/g, 'extension=pdo_sqlite')
        .replace(/;extension=sqlite3/g, 'extension=sqlite3');

      fs.writeFileSync(phpIni, iniContent);
    }
  }

  // Cleanup
  fs.unlinkSync(zipPath);

  console.log('✅ PHP setup complete!');
}

// Run if called directly
if (require.main === module) {
  setupPHP().catch(console.error);
}

module.exports = { setupPHP, PHP_DIR };
