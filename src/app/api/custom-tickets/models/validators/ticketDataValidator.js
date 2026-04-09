/**
 * Validates ticket creation data format.
 */
export const validateTicketData = async (ticketData) => {
  const errors = [];

  // Required fields validation
  if (!ticketData.title || typeof ticketData.title !== 'string') {
    errors.push('Title is required and must be a string');
  }

  if (!ticketData.customerName || typeof ticketData.customerName !== 'string') {
    errors.push('Customer name is required and must be a string');
  }

  if (!ticketData.customerEmail || typeof ticketData.customerEmail !== 'string') {
    errors.push('Customer email is required and must be a string');
  }

  // Email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (ticketData.customerEmail && !emailRegex.test(ticketData.customerEmail)) {
    errors.push('Customer email must be a valid email address');
  }

  // Type validation
  const validTypes = ['custom-design', 'repair', 'consultation', 'quote', 'rush-order'];
  if (ticketData.type && !validTypes.includes(ticketData.type)) {
    errors.push(`Type must be one of: ${validTypes.join(', ')}`);
  }

  // Priority validation
  const validPriorities = ['low', 'normal', 'high', 'urgent'];
  if (ticketData.priority && !validPriorities.includes(ticketData.priority)) {
    errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
  }

  // Numeric fields validation
  if (ticketData.quoteTotal !== undefined) {
    if (typeof ticketData.quoteTotal !== 'number' || ticketData.quoteTotal < 0) {
      errors.push('Quote total must be a non-negative number');
    }
  }

  if (ticketData.amountOwedToCard !== undefined) {
    if (typeof ticketData.amountOwedToCard !== 'number' || ticketData.amountOwedToCard < 0) {
      errors.push('Amount owed to card must be a non-negative number');
    }
  }

  // Artisan assignments validation
  if (ticketData.assignedArtisans !== undefined) {
    if (!Array.isArray(ticketData.assignedArtisans)) {
      errors.push('Assigned artisans must be an array');
    } else {
      ticketData.assignedArtisans.forEach((artisan, index) => {
        if (!artisan.userId || typeof artisan.userId !== 'string') {
          errors.push(`Assigned artisan ${index + 1} must have a valid userId`);
        }
        if (!artisan.artisanType || typeof artisan.artisanType !== 'string') {
          errors.push(`Assigned artisan ${index + 1} must have a valid artisanType`);
        }
        if (artisan.assignedAt && typeof artisan.assignedAt !== 'string') {
          errors.push(`Assigned artisan ${index + 1} assignedAt must be a string`);
        }
      });
    }
  }

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }

  return true;
};
