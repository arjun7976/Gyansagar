const { exec } = require('child_process');
const fs = require('fs');

console.log('Starting Next.js build...');
exec('npm run build', (error, stdout, stderr) => {
  const result = `
ERROR:
${error}

STDOUT:
${stdout}

STDERR:
${stderr}
`;
  fs.writeFileSync('build_output.txt', result);
  console.log('Build finished. Check build_output.txt');
});
