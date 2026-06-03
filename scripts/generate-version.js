const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');
const versionFile = path.join(__dirname, '..', 'public', 'version.json');
fs.writeFileSync(versionFile, JSON.stringify({
  timestamp: Date.now(),
  version: pkg.version,
}));
console.log('✓ version.json generated');
