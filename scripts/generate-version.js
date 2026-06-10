const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pkg = require('../package.json');
const versionFile = path.join(__dirname, '..', 'public', 'version.json');

// Deriva o patch da contagem de commits do git (auto-incrementa a cada commit)
let commitCount = '0';
try {
  commitCount = execSync('git rev-list --count HEAD', { encoding: 'utf-8' }).trim();
} catch {
  commitCount = pkg.version.split('.')[2] || '0';
}

const base = pkg.version.split('.').slice(0, 2).join('.');
const version = `${base}.${commitCount}`;

fs.writeFileSync(versionFile, JSON.stringify({
  timestamp: Date.now(),
  version,
}));
console.log(`✓ version.json generated (v${version})`);
