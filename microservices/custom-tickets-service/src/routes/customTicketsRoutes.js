/**
 * Custom Tickets Routes - MVC Architecture
 * Independent microservice routing layer
 */

import express from 'express';
import { CustomTicketsController } from '../controllers/CustomTicketsController.js';

const router = express.Router();

/**
 * @route GET /api/tickets
 * @desc Get all tickets with optional filtering
 * @query {string} type - Filter by ticket type
 * @query {string} status - Filter by status
 * @query {string} priority - Filter by priority
 * @query {boolean} paymentReceived - Filter by payment status
 * @query {boolean} needsAttention - Filter by attention status
 * @query {number} page - Page number for pagination (default: 1)
 * @query {number} limit - Items per page (default: 50)
 * @query {string} sortBy - Field to sort by (default: createdAt)
 * @query {string} sortOrder - Sort order: asc/desc (default: desc)
 */
router.get('/tickets', CustomTicketsController.getAllTickets);

/**
 * @route GET /api/tickets/stats/summary
 * @desc Get tickets summary statistics
 */
router.get('/tickets/stats/summary', CustomTicketsController.getTicketsSummary);

/**
 * @route GET /api/tickets/:id
 * @desc Get single ticket by ID
 * @param {string} id - Ticket ID
 */
router.get('/tickets/:id', CustomTicketsController.getTicketById);

/**
 * @route POST /api/tickets
 * @desc Create new ticket
 * @body {object} ticket - Ticket data
 */
router.post('/tickets', CustomTicketsController.createTicket);

/**
 * @route PUT /api/tickets/:id
 * @desc Update ticket
 * @param {string} id - Ticket ID
 * @body {object} updateData - Updated ticket data
 */
router.put('/tickets/:id', CustomTicketsController.updateTicket);

/**
 * @route PATCH /api/tickets/:id/status
 * @desc Update ticket status
 * @param {string} id - Ticket ID
 * @body {string} status - New status
 * @body {string} reason - Optional reason for status change
 */
router.patch('/tickets/:id/status', CustomTicketsController.updateTicketStatus);

/**
 * @route DELETE /api/tickets/:id
 * @desc Delete ticket
 * @param {string} id - Ticket ID
 */
router.delete('/tickets/:id', CustomTicketsController.deleteTicket);

export default router;