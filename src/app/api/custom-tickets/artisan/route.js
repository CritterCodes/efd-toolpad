/**
 * Artisan Custom Tickets API Route
 * Handles fetching tickets assigned to specific artisan
 */

import CustomTicketController from '../controller.js';

export async function GET(request) {
  console.log('🎯 [ARTISAN ROUTE] GET /api/custom-tickets/artisan called');
  console.log('🔍 [ARTISAN ROUTE] Request URL:', request.url);
  const { searchParams } = new URL(request.url);
  console.log('🔍 [ARTISAN ROUTE] artisanUserId:', searchParams.get('artisanUserId'));
  
  try {
    const result = await CustomTicketController.getArtisanTickets(request);
    console.log('✅ [ARTISAN ROUTE] Controller returned result');
    return result;
  } catch (error) {
    console.error('❌ [ARTISAN ROUTE] Error:', error);
    throw error;
  }
}