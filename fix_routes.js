const fs = require('fs');
const path = require('path');

const adminDir = path.join(__dirname, 'app', 'admin');
const protectedDir = path.join(adminDir, '(protected)');

// Create protected directory if it doesn't exist
if (!fs.existsSync(protectedDir)) {
  fs.mkdirSync(protectedDir, { recursive: true });
}

const foldersToMove = [
  'chapters',
  'notifications',
  'question-bank',
  'results',
  'subjects',
  'topics',
  'tests'
];

function moveFolder(srcPath, destPath) {
  if (!fs.existsSync(srcPath)) return;
  
  if (!fs.existsSync(destPath)) {
    fs.mkdirSync(destPath, { recursive: true });
  }

  const entries = fs.readdirSync(srcPath, { withFileTypes: true });

  for (const entry of entries) {
    const srcEntryPath = path.join(srcPath, entry.name);
    const destEntryPath = path.join(destPath, entry.name);

    if (entry.isDirectory()) {
      moveFolder(srcEntryPath, destEntryPath);
    } else {
      // Overwrite if exists
      fs.copyFileSync(srcEntryPath, destEntryPath);
    }
  }
  
  // Try to remove original directory
  try {
    fs.rmSync(srcPath, { recursive: true, force: true });
  } catch (e) {
    console.log(`Note: Could not delete original folder ${srcPath} (might be in use), but contents were copied.`);
  }
}

console.log("Fixing GyanSagar Admin Routing Structure...");

for (const folder of foldersToMove) {
  const src = path.join(adminDir, folder);
  const dest = path.join(protectedDir, folder);
  
  if (fs.existsSync(src)) {
    console.log(`Moving ${folder} to (protected)...`);
    moveFolder(src, dest);
  }
}

console.log("\nDone! All admin pages are now secure.");
console.log("Please restart your Next.js server (npm run dev).");
