/**
 * Logger Utility - Constitutional Microservice with Fallback
 * Winston-based logging with console fallback for embedded mode
 */

let winston = null;
let logger = null;

try {
  // Try to import winston - may fail in Next.js embedded context
  winston = require('winston');
  
  // Create winston logger instance
  logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: {
      service: 'custom-tickets-microservice',
      version: '1.0.0'
    },
    transports: [
      // Console transport for all environments
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      })
    ]
  });

  // Only add file transports in standalone microservice mode
  if (process.env.MICROSERVICE_MODE === 'standalone') {
    try {
      const fs = require('fs');
      const logsDir = 'logs';
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      logger.add(new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
      
      logger.add(new winston.transports.File({
        filename: 'logs/combined.log',
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }));
    } catch (fileError) {
      // Ignore file transport errors in embedded mode
    }
  }

} catch (winstonError) {
  // Fallback to console logging when winston is not available
  logger = {
    error: (message, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} custom-tickets-microservice:`, message, meta),
    warn: (message, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} custom-tickets-microservice:`, message, meta),
    info: (message, meta = {}) => console.info(`[INFO] ${new Date().toISOString()} custom-tickets-microservice:`, message, meta),
    debug: (message, meta = {}) => console.debug(`[DEBUG] ${new Date().toISOString()} custom-tickets-microservice:`, message, meta),
  };
}

module.exports = logger;