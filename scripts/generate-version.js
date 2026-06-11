const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const versionFile = path.join(__dirname, '..', 'public', 'version.json');
const buildNumberFile = path.join(__dirname, '..', 'BUILD_NUMBER');

// Lê ou inicia o BUILD_NUMBER (armazenado em arquivo versionado no git)
let buildNumber = 0;
try {
  const raw = fs.readFileSync(buildNumberFile, 'utf-8').trim();
  buildNumber = parseInt(raw, 10) || 0;
} catch {
  buildNumber = 0;
}
buildNumber += 1;
fs.writeFileSync(buildNumberFile, String(buildNumber));

const base = pkg.version.split('.').slice(0, 2).join('.');
const version = `${base}.${buildNumber}`;

fs.writeFileSync(versionFile, JSON.stringify({
  timestamp: Date.now(),
  version,
}));
console.log(`✓ version.json generated (v${version})`);
