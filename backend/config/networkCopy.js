const fs = require('fs');
const path = require('path');

async function copyToNetworkPath({ srcPath, destPath }) {
  console.log('[networkCopy] source:', srcPath);
  console.log('[networkCopy] destination:', destPath);

  try {
    fs.copyFileSync(srcPath, destPath);
    console.log('[networkCopy] copy SUCCESS:', destPath);
    return destPath;
  } catch (err) {
    console.error('[networkCopy] copy FAILED:', err.message);
    console.error('[networkCopy] error code:', err.code);
    throw err;
  }
}

module.exports = { copyToNetworkPath };