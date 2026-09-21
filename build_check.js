const { execSync } = require('child_process');
try {
  console.log("Starting Next.js build...");
  const output = execSync('npm run build', { encoding: 'utf-8', stdio: 'pipe' });
  console.log("Build SUCCESS:");
  console.log(output);
} catch (error) {
  console.log("Build FAILED:");
  console.log(error.stdout);
  console.log(error.stderr);
}
