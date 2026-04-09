const http = require('http');

const pages = [
  '/',
  '/dashboard/requests/custom-tickets',
  '/dashboard/requests/cad-requests',
  '/dashboard/repairs/quality-control'
];

async function testPages() {
  for (const page of pages) {
    console.log(`Testing SSR for: ${page}`);
    try {
      const res = await new Promise((resolve, reject) => {
        http.get(`http://localhost:3003${page}`, (r) => {
          let data = '';
          r.on('data', chunk => data += chunk);
          r.on('end', () => resolve({ statusCode: r.statusCode, length: data.length }));
        }).on('error', reject);
      });
      console.log(`Status: ${res.statusCode}, Byte Length: ${res.length}`);
    } catch (e) {
      console.error(`Error fetching ${page}: ${e.message}`);
    }
  }
}
testPages();
