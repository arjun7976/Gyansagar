const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../app/admin/(protected)/omr/page.js');
const code = fs.readFileSync(filePath, 'utf8');

try {
  const babelParser = require('@babel/parser');
  babelParser.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('SUCCESS: No JSX syntax error found!');
} catch (err) {
  console.error('Babel Parse Error:', err.message);
  if (err.loc) {
    console.error(`Line: ${err.loc.line}, Column: ${err.loc.column}`);
    const lines = code.split('\n');
    const start = Math.max(0, err.loc.line - 5);
    const end = Math.min(lines.length, err.loc.line + 5);
    for (let i = start; i < end; i++) {
      console.error(`${i + 1}: ${lines[i]}`);
    }
  }
}
