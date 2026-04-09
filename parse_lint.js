const fs = require('fs');
try {
  const errors = JSON.parse(fs.readFileSync('lint_errors.json', 'utf8'));
  errors.forEach(e => {
    if (e.errorCount > 0) {
      console.log(`\nFile: ${e.filePath}`);
      e.messages.forEach(m => console.log(`  Line ${m.line}: ${m.message} (${m.ruleId})`));
    }
  });
} catch(e) {}
