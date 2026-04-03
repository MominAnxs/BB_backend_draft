// Wrapper to ensure node is in PATH for Turbopack's PostCSS child processes
const { execSync, spawn } = require('child_process');
const path = require('path');

// Add our node binary to PATH
const nodeBinDir = path.dirname(process.execPath);
process.env.PATH = `${nodeBinDir}:${process.env.PATH || ''}`;

const child = spawn(process.execPath, [
  path.join(__dirname, 'node_modules', '.bin', 'next'),
  'dev',
  '--port', process.env.PORT || '3000'
], {
  stdio: 'inherit',
  env: process.env,
  cwd: __dirname,
});

child.on('exit', (code) => process.exit(code || 0));
