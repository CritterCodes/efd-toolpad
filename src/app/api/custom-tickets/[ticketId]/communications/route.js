/**
 * Custom Ticket Communications API Endpoint
 * Handles adding communications/messages to tickets
 * Constitutional API following CRUD patterns
 */

import { NextResponse } from 'next/server';
import TicketCommunicationsController from '../../controllers/TicketCommunicationsController';

export async function POST(request, { params }) {
  const awaitedParams = await params;
  return TicketCommunicationsController.addCommunication(request, { params: awaitedParams });
}

export async function GET(request, { params }) {
  const awaitedParams = await params;
  return TicketCommunicationsController.getCommunications(request, { params: awaitedParams });
}