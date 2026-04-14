import CustomTicketInvoicesController from './controller.js';

export async function POST(request) {
  return await CustomTicketInvoicesController.createInvoice(request);
}

export async function GET(request) {
  return await CustomTicketInvoicesController.getInvoices(request);
}

export async function PATCH(request) {
  return await CustomTicketInvoicesController.updateInvoiceStatus(request);
}
