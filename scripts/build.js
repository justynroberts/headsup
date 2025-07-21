#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Heads Up for production...\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Please run this script from the project root directory');
  process.exit(1);
}

// Read package.json
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`📦 Building ${packageJson.productName || packageJson.name} v${packageJson.version}`);

// Determine build target
const platform = process.argv[2] || process.platform;
let buildCommand = 'npm run build';

switch (platform) {
  case 'mac':
  case 'darwin':
    buildCommand = 'npm run build:mac';
    console.log('🍎 Building for macOS...');
    break;
  case 'win':
  case 'win32':
    buildCommand = 'npm run build:win';
    console.log('🪟 Building for Windows...');
    break;
  case 'linux':
    buildCommand = 'npm run build:linux';
    console.log('🐧 Building for Linux...');
    break;
  default:
    console.log('🔧 Building for current platform...');
}

try {
  // Clean previous builds
  console.log('\n🧹 Cleaning previous builds...');
  if (fs.existsSync('dist')) {
    execSync('rm -rf dist', { stdio: 'inherit' });
  }

  // Install dependencies if needed
  if (!fs.existsSync('node_modules')) {
    console.log('📥 Installing dependencies...');
    execSync('npm install', { stdio: 'inherit' });
  }

  // Run the build
  console.log('\n⚡ Building application...');
  execSync(buildCommand, { stdio: 'inherit' });

  console.log('\n✅ Build completed successfully!');
  console.log('📁 Output directory: ./dist');
  
  // List built files
  if (fs.existsSync('dist')) {
    const files = fs.readdirSync('dist');
    console.log('\n📄 Built files:');
    files.forEach(file => {
      const filePath = path.join('dist', file);
      const stats = fs.statSync(filePath);
      const size = (stats.size / 1024 / 1024).toFixed(2);
      console.log(`  • ${file} (${size} MB)`);
    });
  }

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  process.exit(1);
}