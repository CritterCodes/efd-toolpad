/**
 * Validates the ticket ID format.
 */
export const validateTicketId = async (ticketId) => {
  if (!ticketId) {
    throw new Error('Ticket ID is required');
  }

  if (typeof ticketId !== 'string') {
    throw new Error('Ticket ID must be a string');
  }

  if (ticketId.length < 3) {
    throw new Error('Ticket ID must be at least 3 characters');
  }

  return true;
};
