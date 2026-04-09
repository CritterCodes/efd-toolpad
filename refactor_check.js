const fs = require('fs');
const content = fs.readFileSync('src/lib/roleBasedNavigation.js', 'utf8');

// The file has imports, SHARED_NAVIGATION, generateArtisanNavigation, ROLE_NAVIGATION, and some functions.
// Let's print out the sections to make sure we understand the file.

const sections = [];
let idx = 0;
while(idx < content.length) {
    let nextIdx = content.indexOf('export ', idx + 1);
    if (nextIdx === -1) nextIdx = content.length;
    sections.push(content.substring(idx, nextIdx));
    idx = nextIdx;
}

console.log(sections.map(s => s.substring(0, 100).replace(/\n/g, ' ')));