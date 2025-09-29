/**
 * Express Application - Custom Tickets Microservice
 * Independent deployable MVC application
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { CustomTicketService } from './services/CustomTicketService.js';
import customTicketsRoutes from './routes/customTicketsRoutes.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());

// CORS configuration for microservice
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    service: 'custom-tickets-microservice',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
app.use('/api', customTicketsRoutes);

// Root endpoint with service info
app.get('/', (req, res) => {
  res.json({
    service: 'Custom Tickets Microservice',
    version: '1.0.0',
    description: 'Independent custom tickets management service',
    endpoints: {
      health: '/health',
      tickets: '/api/tickets',
      summary: '/api/tickets/stats/summary'
    },
    documentation: 'See README.md for API documentation'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'GET /api/tickets',
      'GET /api/tickets/:id',
      'POST /api/tickets',
      'PUT /api/tickets/:id',
      'PATCH /api/tickets/:id/status',
      'DELETE /api/tickets/:id',
      'GET /api/tickets/stats/summary'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    // Initialize database connection
    await CustomTicketService.initializeDatabase();
    
    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Custom Tickets Microservice running on port ${PORT}`, {
        environment: process.env.NODE_ENV || 'development',
        port: PORT
      });
    });

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, startServer };
export default app;