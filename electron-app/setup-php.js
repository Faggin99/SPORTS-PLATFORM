const https = require('https');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const PHP_VERSION = '8.2';
const PHP_URL = `https://windows.php.net/downloads/releases/php-${PHP_VERSION}-nts-Win32-vs16-x64.zip`;
const PHP_DIR = path.join(__dirname, 'php-portable');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
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

  // Copy php.ini
  const phpIniDev = path.join(PHP_DIR, 'php.ini-development');
  const phpIni = path.join(PHP_DIR, 'php.ini');

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

  // Cleanup
  fs.unlinkSync(zipPath);

  console.log('✅ PHP setup complete!');
}

// Run if called directly
if (require.main === module) {
  setupPHP().catch(console.error);
}

module.exports = { setupPHP, PHP_DIR };
