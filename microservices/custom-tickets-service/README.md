# Custom Tickets Microservice

Independent deployable microservice for custom ticket management following MVC architecture.

## Architecture

- **Model**: Business logic and data validation
- **View**: JSON response formatting (REST API)
- **Controller**: HTTP request handling and routing

## Features

- Independent MongoDB connection
- Express.js REST API
- Winston-based logging
- Docker deployment ready
- Health checks and monitoring
- Graceful shutdown handling

## Quick Start

```bash
# Install dependencies
npm install

# Start in development
npm run dev

# Start in production
npm start

# Build Docker image
npm run docker:build

# Run in Docker
npm run docker:run
```

## API Endpoints

### Tickets Management
- `GET /api/tickets` - List all tickets
- `GET /api/tickets/:id` - Get ticket by ID
- `POST /api/tickets` - Create new ticket
- `PUT /api/tickets/:id` - Update ticket
- `PATCH /api/tickets/:id/status` - Update ticket status
- `DELETE /api/tickets/:id` - Delete ticket

### Statistics
- `GET /api/tickets/stats/summary` - Get tickets summary

### System
- `GET /health` - Health check
- `GET /` - Service info

## Environment Variables

```env
PORT=3002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/custom-tickets
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## Docker Deployment

```bash
# Build image
docker build -t custom-tickets-service .

# Run container
docker run -p 3002:3002 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/custom-tickets \
  custom-tickets-service
```

## MVC Structure

```
src/
├── app.js              # Express application entry point
├── controllers/        # HTTP request controllers
├── models/            # Business logic and validation
├── routes/            # Express routing
├── services/          # Data access layer
├── utils/             # Utilities (logger, etc.)
└── views/             # Response formatting (JSON)
```

## Integration with Main Application

When deployed independently, the main application connects via HTTP API:

```javascript
// Main app integration
const customTicketsClient = {
  async getTickets() {
    const response = await fetch('http://custom-tickets-service:3002/api/tickets');
    return response.json();
  }
};
```

When embedded locally, direct service imports can be used for development.

## Monitoring

- Winston logging to console and files
- Health check endpoint at `/health`
- Request/response logging
- Error tracking with stack traces

## Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## Development

```bash
# Watch mode
npm run dev

# Debug mode
npm run debug
```