const fs = require('fs');
const path = require('path');

const wwwDir = path.join(__dirname, 'www');

// Create www directory if not exists
if (!fs.existsSync(wwwDir)) {
  fs.mkdirSync(wwwDir, { recursive: true });
}

// Function to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// Copy single files
const filesToCopy = ['index.html', 'style.css', 'manifest.json', 'service-worker.js'];
filesToCopy.forEach(file => {
  const src = path.join(__dirname, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, path.join(wwwDir, file));
  }
});

// Copy js directory
copyDirSync(path.join(__dirname, 'js'), path.join(wwwDir, 'js'));

console.log('✅ Mobile web assets built successfully to www/ directory!');
