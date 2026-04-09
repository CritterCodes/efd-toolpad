import fs from 'fs';
const text = fs.readFileSync('src/api-clients/custom-tickets-adapters/ticketsAdapter.js', 'utf8');

// Replace this.makeApiRequest, this.embeddedService with this.adapter...
const fixedText = text
    .replace(/this\.makeApiRequest/g, 'this.adapter.makeApiRequest')
    .replace(/this\.embeddedService/g, 'this.adapter.embeddedService')
    .replace(/this\.mode/g, 'this.adapter.mode');

fs.writeFileSync('src/api-clients/custom-tickets-adapters/ticketsAdapter.js', fixedText, 'utf8');
console.log('Adapter inner bindings fixed.');
