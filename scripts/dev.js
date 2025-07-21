#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');

console.log('🚀 Starting Heads Up in development mode...\n');

// Check if dependencies are installed
if (!fs.existsSync('node_modules')) {
  console.log('📥 Installing dependencies...');
  const install = spawn('npm', ['install'], { stdio: 'inherit' });
  
  install.on('close', (code) => {
    if (code === 0) {
      startApp();
    } else {
      console.error('❌ Failed to install dependencies');
      process.exit(1);
    }
  });
} else {
  startApp();
}

function startApp() {
  console.log('⚡ Starting Electron app...');
  
  const electron = spawn('npm', ['run', 'dev'], { 
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });

  electron.on('close', (code) => {
    console.log(`\n👋 Heads Up closed with code ${code}`);
  });

  electron.on('error', (error) => {
    console.error('❌ Failed to start:', error);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    electron.kill('SIGINT');
  });
}