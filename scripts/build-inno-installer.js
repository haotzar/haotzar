#!/usr/bin/env node

/**
 * Build Inno Setup Installer
 * This script builds the Electron app and creates an Inno Setup installer
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Inno Setup Installer...\n');

// Check if Inno Setup is installed
function checkInnoSetup() {
  const possiblePaths = [
    'C:\\Program Files (x86)\\Inno Setup 6\\iscc.exe',
    'C:\\Program Files\\Inno Setup 6\\iscc.exe',
    'C:\\Program Files (x86)\\Inno Setup 5\\iscc.exe',
    'C:\\Program Files\\Inno Setup 5\\iscc.exe',
  ];

  for (const innoPath of possiblePaths) {
    if (fs.existsSync(innoPath)) {
      console.log('✅ Found Inno Setup at:', innoPath);
      return innoPath;
    }
  }

  // Try to find in PATH
  try {
    execSync('iscc', { stdio: 'ignore' });
    console.log('✅ Found Inno Setup in PATH');
    return 'iscc';
  } catch (e) {
    console.error('❌ Inno Setup not found!');
    console.error('\nPlease install Inno Setup from: https://jrsoftware.org/isdl.php');
    console.error('Or add it to your PATH environment variable.\n');
    process.exit(1);
  }
}

// Check if installer.iss exists
function checkInstallerScript() {
  const issPath = path.join(process.cwd(), 'installer.iss');
  if (!fs.existsSync(issPath)) {
    console.error('❌ installer.iss not found!');
    console.error('Please create installer.iss in the project root.\n');
    process.exit(1);
  }
  console.log('✅ Found installer.iss\n');
  return issPath;
}

// Main build process
async function build() {
  try {
    // Step 1: Check prerequisites
    console.log('📋 Step 1: Checking prerequisites...');
    const isccPath = checkInnoSetup();
    const issPath = checkInstallerScript();

    // Step 2: Build Electron app
    console.log('\n📦 Step 2: Building Electron app...');
    console.log('Running: npm run build:electron\n');
    execSync('npm run build:electron', { stdio: 'inherit' });

    // Step 3: Create unpacked directory
    console.log('\n📂 Step 3: Creating unpacked directory...');
    console.log('Running: electron-builder --win --x64 --dir\n');
    execSync('electron-builder --win --x64 --dir', { stdio: 'inherit' });

    // Check if unpacked directory exists
    const unpackedDir = path.join(process.cwd(), 'release', 'win-unpacked');
    if (!fs.existsSync(unpackedDir)) {
      console.error('❌ Unpacked directory not found at:', unpackedDir);
      process.exit(1);
    }
    console.log('✅ Unpacked directory created\n');

    // Step 4: Build Inno Setup installer
    console.log('🔨 Step 4: Building Inno Setup installer...');
    const isccCommand = isccPath === 'iscc' ? 'iscc' : `"${isccPath}"`;
    console.log(`Running: ${isccCommand} installer.iss\n`);
    execSync(`${isccCommand} installer.iss`, { stdio: 'inherit' });

    // Success!
    console.log('\n✅ Build completed successfully!');
    console.log('\n📦 Installer created in: release/');
    console.log('Look for: haotzar-Setup-*.exe\n');

  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exit(1);
  }
}

// Run the build
build();
