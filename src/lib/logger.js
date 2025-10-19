// Simple logging utility for development
const isDevelopment = process.env.NODE_ENV === 'development';
const enableVerboseLogging = process.env.ENABLE_VERBOSE_LOGGING === 'true';

export const logger = {
  // Only log errors and critical messages by default
  error: (...args) => console.error(...args),
  warn: (...args) => console.warn(...args),
  
  // Info logs only in development with verbose flag
  info: (...args) => {
    if (isDevelopment && enableVerboseLogging) {
      console.log(...args);
    }
  },
  
  // Debug logs only with verbose flag
  debug: (...args) => {
    if (enableVerboseLogging) {
      console.log(...args);
    }
  }
};

// Helper for conditional logging
export const shouldLog = (level = 'info') => {
  if (level === 'error' || level === 'warn') return true;
  if (level === 'info') return isDevelopment && enableVerboseLogging;
  if (level === 'debug') return enableVerboseLogging;
  return false;
};