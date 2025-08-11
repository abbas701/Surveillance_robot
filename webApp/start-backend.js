#!/usr/bin/env node

// Simple backend start script
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 Starting Surveillance Robot Backend...');
console.log('📁 Backend directory:', join(__dirname, 'backend'));

const backend = spawn('node', ['backend/src/server.js'], {
  stdio: 'inherit',
  cwd: __dirname
});

backend.on('error', (error) => {
  console.error('❌ Backend error:', error);
  process.exit(1);
});

backend.on('exit', (code) => {
  console.log(`🛑 Backend exited with code ${code}`);
  process.exit(code);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend...');
  backend.kill('SIGTERM');
});
