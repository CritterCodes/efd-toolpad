const fs = require('fs');
const filepath = 'src/lib/roleBasedNavigation.js';
let content = fs.readFileSync(filepath, 'utf8');

// Fix the actual variable use that causes the error
content = content.replace(
  'const navigation = artisanNavigationConfig.generateArtisanNavigation ? artisanNavigationConfig.generateArtisanNavigation(artisanTypes) : artisanNavigation[USER_ROLES.ARTISAN];',
  'const navigation = artisanNavigation[USER_ROLES.ARTISAN] || [];'
);

fs.writeFileSync(filepath, content);
console.log('Fixed navigation');
