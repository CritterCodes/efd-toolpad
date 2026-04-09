export class TicketsAdapter {
  constructor(adapter) { this.adapter = adapter; }
  async getAllTickets(filters = {}) { return this.ticketsAdapter.getAllTickets(filters); }
  async getTicketById(id) { return this.ticketsAdapter.getTicketById(id); }
  async createTicket(ticketData) { return this.ticketsAdapter.createTicket(ticketData); }
  async updateTicket(id, updateData) { return this.ticketsAdapter.updateTicket(id, updateData); }
  async updateTicketStatus(id, status, metadata = {}) { return this.ticketsAdapter.updateTicketStatus(id, status, metadata); }
  async deleteTicket(id) { return this.ticketsAdapter.deleteTicket(id); }
  async getTicketsSummary() { return this.ticketsAdapter.getTicketsSummary(); }


}
