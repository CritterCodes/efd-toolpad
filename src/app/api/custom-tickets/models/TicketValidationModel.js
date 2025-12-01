/**
 * Ticket Validation Model - Data Validation Logic
 * Constitutional Architecture: Model Layer - Validation
 * Responsibility: Input validation and format checking
 */

export default class TicketValidationModel {
  /**
   * Validate ticket ID format
   */
  static async validateTicketId(ticketId) {
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
  }

  /**
   * Validate ticket creation data
   */
  static async validateTicketData(ticketData) {
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
  }

  /**
   * Validate ticket update data
   */
  static async validateUpdateData(updateData) {
    const errors = [];

    // Only validate provided fields
    if (updateData.title !== undefined) {
      if (!updateData.title || typeof updateData.title !== 'string') {
        errors.push('Title must be a non-empty string');
      }
    }

    if (updateData.customerEmail !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.customerEmail)) {
        errors.push('Customer email must be a valid email address');
      }
    }

    if (updateData.type !== undefined) {
      const validTypes = ['custom-design', 'repair', 'consultation', 'quote', 'rush-order'];
      if (!validTypes.includes(updateData.type)) {
        errors.push(`Type must be one of: ${validTypes.join(', ')}`);
      }
    }

    if (updateData.priority !== undefined) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(updateData.priority)) {
        errors.push(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
    }

    if (updateData.quoteTotal !== undefined) {
      if (typeof updateData.quoteTotal !== 'number' || updateData.quoteTotal < 0) {
        errors.push('Quote total must be a non-negative number');
      }
    }

    if (updateData.amountOwedToCard !== undefined) {
      if (typeof updateData.amountOwedToCard !== 'number' || updateData.amountOwedToCard < 0) {
        errors.push('Amount owed to card must be a non-negative number');
      }
    }

    // Artisan assignments validation
    if (updateData.assignedArtisans !== undefined) {
      if (!Array.isArray(updateData.assignedArtisans)) {
        errors.push('Assigned artisans must be an array');
      } else {
        updateData.assignedArtisans.forEach((artisan, index) => {
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

    // Validate quote/financial fields
    if (updateData.quote !== undefined) {
      if (typeof updateData.quote !== 'object' || updateData.quote === null) {
        errors.push('Quote must be an object');
      } else {
        // Validate quote sub-fields
        const quote = updateData.quote;
        
        if (quote.centerstone !== undefined && typeof quote.centerstone !== 'object') {
          errors.push('Quote centerstone must be an object');
        }
        
        if (quote.mounting !== undefined && typeof quote.mounting !== 'object') {
          errors.push('Quote mounting must be an object');
        }
        
        if (quote.accentStones !== undefined && !Array.isArray(quote.accentStones)) {
          errors.push('Quote accent stones must be an array');
        }
        
        if (quote.laborTasks !== undefined && !Array.isArray(quote.laborTasks)) {
          errors.push('Quote labor tasks must be an array');
        }
        
        if (quote.shippingCosts !== undefined && !Array.isArray(quote.shippingCosts)) {
          errors.push('Quote shipping costs must be an array');
        }
        
        if (quote.additionalMaterials !== undefined && !Array.isArray(quote.additionalMaterials)) {
          errors.push('Quote additional materials must be an array');
        }
        
        if (quote.customDesignFee !== undefined && (typeof quote.customDesignFee !== 'number' || quote.customDesignFee < 0)) {
          errors.push('Quote custom design fee must be a non-negative number');
        }
        
        if (quote.quoteTotal !== undefined && (typeof quote.quoteTotal !== 'number' || quote.quoteTotal < 0)) {
          errors.push('Quote total must be a non-negative number');
        }
        
        if (quote.analytics !== undefined && typeof quote.analytics !== 'object') {
          errors.push('Quote analytics must be an object');
        }
        
        if (quote.quotePublished !== undefined && typeof quote.quotePublished !== 'boolean') {
          errors.push('Quote published must be a boolean');
        }
        
        if (quote.publishedAt !== undefined && quote.publishedAt !== null && typeof quote.publishedAt !== 'string') {
          errors.push('Quote published at must be a string or null');
        }
      }
    }

    // Legacy validation for backward compatibility (in case old structure is still used)
    if (updateData.centerstone !== undefined) {
      if (typeof updateData.centerstone !== 'object') {
        errors.push('Centerstone must be an object');
      }
    }

    if (updateData.mounting !== undefined) {
      if (typeof updateData.mounting !== 'object') {
        errors.push('Mounting must be an object');
      }
    }

    if (updateData.accentStones !== undefined) {
      if (!Array.isArray(updateData.accentStones)) {
        errors.push('Accent stones must be an array');
      }
    }

    if (updateData.laborTasks !== undefined) {
      if (!Array.isArray(updateData.laborTasks)) {
        errors.push('Labor tasks must be an array');
      }
    }

    if (updateData.shippingCosts !== undefined) {
      if (!Array.isArray(updateData.shippingCosts)) {
        errors.push('Shipping costs must be an array');
      }
    }

    if (updateData.additionalMaterials !== undefined) {
      if (!Array.isArray(updateData.additionalMaterials)) {
        errors.push('Additional materials must be an array');
      }
    }

    if (updateData.customDesignFee !== undefined) {
      if (typeof updateData.customDesignFee !== 'number' || updateData.customDesignFee < 0) {
        errors.push('Custom design fee must be a non-negative number');
      }
    }

    if (updateData.analytics !== undefined) {
      if (typeof updateData.analytics !== 'object') {
        errors.push('Analytics must be an object');
      }
    }

    if (updateData.quotePublished !== undefined) {
      if (typeof updateData.quotePublished !== 'boolean') {
        errors.push('Quote published must be a boolean');
      }
    }

    if (updateData.publishedAt !== undefined) {
      if (updateData.publishedAt !== null && typeof updateData.publishedAt !== 'string') {
        errors.push('Published at must be a string or null');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return updateData;
  }

  /**
   * Validate order data
   */
  static async validateOrderData(orderData) {
    const errors = [];

    if (!orderData.amount || typeof orderData.amount !== 'number' || orderData.amount <= 0) {
      errors.push('Amount is required and must be a positive number');
    }

    if (!orderData.customerEmail || typeof orderData.customerEmail !== 'string') {
      errors.push('Customer email is required');
    }

    if (orderData.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(orderData.customerEmail)) {
        errors.push('Customer email must be a valid email address');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Order validation failed: ${errors.join(', ')}`);
    }

    return true;
  }
}