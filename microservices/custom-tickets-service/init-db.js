// Database initialization script for MongoDB
// This runs when MongoDB container starts for the first time

db = db.getSiblingDB('custom-tickets');

// Create collections
db.createCollection('tickets');
db.createCollection('processes');
db.createCollection('materials');

// Create indexes for performance
db.tickets.createIndex({ "ticketId": 1 }, { unique: true });
db.tickets.createIndex({ "status": 1 });
db.tickets.createIndex({ "priority": 1 });
db.tickets.createIndex({ "createdAt": -1 });
db.tickets.createIndex({ "customerId": 1 });

// Create compound indexes
db.tickets.createIndex({ "status": 1, "createdAt": -1 });
db.tickets.createIndex({ "customerId": 1, "status": 1 });

print('Custom Tickets database initialized successfully');