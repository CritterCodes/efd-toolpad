import fs from 'fs';
const text = fs.readFileSync('src/api-clients/customTicketsMicroserviceAdapter.js', 'utf8');

// I will extract: initializeEmbeddedService, makeApiRequest, healthCheck, switchMode to base adapter.
// getAllTickets, getTicketById, createTicket, updateTicket, updateTicketStatus, deleteTicket, getTicketsSummary -> ticketsAdapter.js

const ticketsAdapter = text.substring(
    text.indexOf('  async getAllTickets'), 
    text.indexOf('  async healthCheck')
);

const newAdapter = text.substring(0, text.indexOf('  async getAllTickets')) + 
`  // DELEGATED TO TICKETS ADAPTER
  async getAllTickets(filters = {}) { return this.ticketsAdapter.getAllTickets(filters); }
  async getTicketById(id) { return this.ticketsAdapter.getTicketById(id); }
  async createTicket(ticketData) { return this.ticketsAdapter.createTicket(ticketData); }
  async updateTicket(id, updateData) { return this.ticketsAdapter.updateTicket(id, updateData); }
  async updateTicketStatus(id, status, metadata = {}) { return this.ticketsAdapter.updateTicketStatus(id, status, metadata); }
  async deleteTicket(id) { return this.ticketsAdapter.deleteTicket(id); }
  async getTicketsSummary() { return this.ticketsAdapter.getTicketsSummary(); }

` + text.substring(text.indexOf('  async healthCheck'));

fs.mkdirSync('src/api-clients/custom-tickets-adapters', {recursive: true});
fs.writeFileSync('src/api-clients/custom-tickets-adapters/ticketsAdapter.js', 
`export class TicketsAdapter {
  constructor(adapter) { this.adapter = adapter; }
${ticketsAdapter}
}
`, 'utf8');

const finalAdapterText = newAdapter.replace('constructor(options = {}) {', `constructor(options = {}) {
    // Initialize delegates
    const { TicketsAdapter } = require('./custom-tickets-adapters/ticketsAdapter.js');
    this.ticketsAdapter = new TicketsAdapter(this);
`);
fs.writeFileSync('src/api-clients/customTicketsMicroserviceAdapter.js', finalAdapterText, 'utf8');
console.log('Adapter split successfully.');
