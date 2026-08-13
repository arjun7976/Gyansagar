const fs = require('fs');

const sourcePath = 'C:\\Users\\ARJUN\\.gemini\\antigravity\\brain\\56dd5b0e-d746-4153-b95f-ff958894b73c\\media__1786610281779.jpg';
const destPath = 'c:\\Users\\ARJUN\\Desktop\\Gyan sagar\\gyansagar-test-system\\public\\logo.jpg';

try {
  fs.copyFileSync(sourcePath, destPath);
  console.log('✅ Logo copied successfully! You can now start your server and see the new logo.');
} catch (err) {
  console.error('❌ Error copying logo:', err);
}
