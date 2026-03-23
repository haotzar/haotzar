const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎨 Generating Tauri icons...\n');

// Step 1: Create base icon
console.log('Step 1: Creating base icon...');
try {
  require('./create-base-icon.js');
} catch (err) {
  console.error('❌ Failed to create base icon:', err.message);
  process.exit(1);
}

// Step 2: Use Tauri CLI to generate all icon formats
console.log('\nStep 2: Generating icon formats with Tauri CLI...');
const baseIconPath = 'src-tauri/base-icon.png';

if (!fs.existsSync(baseIconPath)) {
  console.error('❌ Base icon not found');
  process.exit(1);
}

try {
  // Run tauri icon command
  execSync(`npx tauri icon "${baseIconPath}"`, {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('\n✅ All icons generated successfully!');
  
  // Clean up base icon
  if (fs.existsSync(baseIconPath)) {
    fs.unlinkSync(baseIconPath);
    console.log('✓ Cleaned up temporary base icon');
  }
  
  // Verify icons were created
  const requiredIcons = [
    'src-tauri/icons/32x32.png',
    'src-tauri/icons/128x128.png',
    'src-tauri/icons/128x128@2x.png',
    'src-tauri/icons/icon.ico',
    'src-tauri/icons/icon.icns'
  ];
  
  console.log('\nVerifying generated icons:');
  let allExist = true;
  for (const iconPath of requiredIcons) {
    const exists = fs.existsSync(iconPath);
    const status = exists ? '✓' : '✗';
    const size = exists ? `(${fs.statSync(iconPath).size} bytes)` : '';
    console.log(`  ${status} ${path.basename(iconPath)} ${size}`);
    if (!exists) allExist = false;
  }
  
  if (!allExist) {
    console.error('\n❌ Some icons were not generated');
    process.exit(1);
  }
  
  console.log('\n🎉 Icon generation complete!');
  
} catch (err) {
  console.error('\n❌ Failed to generate icons with Tauri CLI:', err.message);
  console.error('\nTrying fallback method...');
  
  // Fallback: copy base icon to required locations
  try {
    const targetDir = 'src-tauri/icons';
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    const baseIcon = fs.readFileSync(baseIconPath);
    fs.writeFileSync(path.join(targetDir, '32x32.png'), baseIcon);
    fs.writeFileSync(path.join(targetDir, '128x128.png'), baseIcon);
    fs.writeFileSync(path.join(targetDir, '128x128@2x.png'), baseIcon);
    fs.writeFileSync(path.join(targetDir, 'icon.png'), baseIcon);
    fs.writeFileSync(path.join(targetDir, 'icon.ico'), baseIcon);
    fs.writeFileSync(path.join(targetDir, 'icon.icns'), Buffer.alloc(0));
    
    console.log('✓ Created fallback icons');
    console.log('⚠️  Warning: ICO and ICNS may not be in correct format');
  } catch (fallbackErr) {
    console.error('❌ Fallback also failed:', fallbackErr.message);
    process.exit(1);
  }
}
