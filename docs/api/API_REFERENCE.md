# 🔌 API Reference

## Overview
Complete API documentation for the Engel Fine Design Admin CRM System.

## 🔐 Authentication

All API routes require authentication unless otherwise specified.

### Authentication Methods
- **NextAuth.js Session**: Cookie-based authentication for web interface
- **JWT Tokens**: For API access and middleware protection

---

## 📋 **Admin Settings API**

### **`GET /api/admin/settings`**
Retrieve all admin settings (store settings, integrations, etc.)

**Response:**
```json
{
  "storeSettings": {
    "hourlyWage": 45,
    "adminFee": 0.15,
    "businessFee": 0.25,
    "handlingFee": 0.08,
    "consumablesFee": 0.08,
    "materialMarkup": 1.5
  },
  "integrations": {
    "shopify": {
      "enabled": true,
      "storeUrl": "https://example.myshopify.com",
      "connectionStatus": "connected"
    }
  }
}
```

### **`POST /api/admin/settings`**
Update admin settings with PIN verification

**Request Body:**
```json
{
  "pin": "1234",
  "settings": {
    "storeSettings": {
      "hourlyWage": 50
    }
  }
}
```

---

## 🛒 **Shopify Integration API**

### **`GET /api/admin/settings/shopify`**
Get Shopify integration settings and connection status

**Response:**
```json
{
  "settings": {
    "storeUrl": "https://example.myshopify.com",
    "enabled": true,
    "lastTested": "2025-08-02T10:30:00Z"
  },
  "connectionStatus": "connected"
}
```

### **`POST /api/admin/settings/shopify`**
Update Shopify integration settings

**Request Body:**
```json
{
  "storeUrl": "https://example.myshopify.com",
  "accessToken": "shpat_xxxxx",
  "enabled": true
}
```

### **`PUT /api/admin/settings/shopify`**
Test Shopify connection

**Response:**
```json
{
  "success": true,
  "connectionStatus": "connected",
  "shopInfo": {
    "name": "Example Store",
    "domain": "example.myshopify.com"
  }
}
```

---

## ⚙️ **Repair Tasks API**

### **`GET /api/tasks`**
Get all repair tasks with optional filtering

**Query Parameters:**
- `category` - Filter by category (sizing, prongs, chains, etc.)
- `metalType` - Filter by metal type compatibility
- `search` - Search in title and description

**Response:**
```json
{
  "tasks": [
    {
      "_id": "60a7c9b4f1b2c3d4e5f6a7b8",
      "sku": "RT-SIZING-001",
      "taskCode": "SZ001",
      "title": "Ring Sizing Up/Down",
      "category": "sizing",
      "laborHours": 0.75,
      "materialCost": 12.50,
      "basePrice": 67.89,
      "metalType": "gold"
    }
  ],
  "total": 92
}
```

### **`POST /api/tasks`**
Create a new repair task

**Request Body:**
```json
{
  "title": "New Repair Task",
  "category": "sizing",
  "laborHours": 1.0,
  "materialCost": 15.00,
  "metalType": "gold",
  "description": "Task description"
}
```

---

## 🔧 **Repair Materials API**

### **`GET /api/repair-materials`**
Get all repair materials

**Query Parameters:**
- `category` - Filter by material category
- `metalType` - Filter by compatible metal type

**Response:**
```json
{
  "materials": [
    {
      "_id": "60a7c9b4f1b2c3d4e5f6a7b9",
      "sku": "MAT-GOLD-001",
      "name": "14K Gold Wire",
      "category": "wire",
      "costPerUnit": 25.00,
      "unit": "gram",
      "compatibleMetals": ["gold", "white_gold"]
    }
  ]
}
```

### **`POST /api/repair-materials`**
Create a new repair material

**Request Body:**
```json
{
  "name": "Material Name",
  "category": "wire",
  "costPerUnit": 20.00,
  "unit": "gram",
  "compatibleMetals": ["gold"]
}
```

---

## 🔄 **Repair Processes API**

### **`GET /api/repair-processes`**
Get all repair processes

**Response:**
```json
{
  "processes": [
    {
      "_id": "60a7c9b4f1b2c3d4e5f6a7ba",
      "name": "Ring Sizing Process",
      "category": "sizing",
      "steps": [
        "Measure current size",
        "Calculate material needed",
        "Resize ring"
      ],
      "estimatedTime": 45,
      "difficulty": "medium"
    }
  ]
}
```

---

## 🛠️ **Repairs Management API**

### **`GET /api/repairs`**
Get all repairs with status filtering

**Query Parameters:**
- `status` - Filter by repair status
- `customer` - Filter by customer ID
- `dateRange` - Filter by date range

**Response:**
```json
{
  "repairs": [
    {
      "_id": "60a7c9b4f1b2c3d4e5f6a7bb",
      "ticketNumber": "R-2025-001",
      "customer": {
        "name": "John Doe",
        "email": "john@example.com"
      },
      "status": "in_progress",
      "tasks": ["60a7c9b4f1b2c3d4e5f6a7b8"],
      "totalPrice": 125.50,
      "createdAt": "2025-08-02T10:00:00Z"
    }
  ]
}
```

### **`POST /api/repairs`**
Create a new repair order

**Request Body:**
```json
{
  "customer": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890"
  },
  "tasks": ["60a7c9b4f1b2c3d4e5f6a7b8"],
  "notes": "Customer notes",
  "rushOrder": false
}
```

---

## 👥 **Users/Customers API**

### **`GET /api/users`**
Get all customers/users

**Query Parameters:**
- `search` - Search by name or email
- `limit` - Limit results
- `page` - Pagination

**Response:**
```json
{
  "users": [
    {
      "_id": "60a7c9b4f1b2c3d4e5f6a7bc",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "address": {
        "street": "123 Main St",
        "city": "Anytown",
        "state": "ST",
        "zip": "12345"
      },
      "repairHistory": 5
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

---

## 🎫 **Custom Tickets API**

### **`GET /api/custom-tickets`**
Get all custom tickets

**Response:**
```json
{
  "tickets": [
    {
      "_id": "60a7c9b4f1b2c3d4e5f6a7bd",
      "ticketNumber": "CT-2025-001",
      "customer": "John Doe",
      "description": "Custom repair request",
      "status": "pending",
      "estimatedPrice": 200.00,
      "createdAt": "2025-08-02T10:00:00Z"
    }
  ]
}
```

---

## 📊 **Analytics API**

### **`GET /api/analytics/overview`**
Get business analytics overview

**Response:**
```json
{
  "metrics": {
    "totalRepairs": 1250,
    "monthlyRevenue": 15000,
    "averageTicketValue": 125.50,
    "pendingRepairs": 45
  },
  "trends": {
    "repairsByCategory": {
      "sizing": 45,
      "prongs": 23,
      "chains": 15
    },
    "monthlyGrowth": 0.15
  }
}
```

---

## 🔒 **Authentication API**

### **`POST /api/auth/signin`**
Admin sign in (handled by NextAuth.js)

### **`POST /api/auth/signout`**
Admin sign out (handled by NextAuth.js)

### **`GET /api/auth/session`**
Get current session information

---

## ⚠️ **Error Responses**

All API endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## 🔐 **Security**

### Authentication Required
All API endpoints require valid authentication except:
- `/api/auth/*` - Authentication endpoints
- Health check endpoints (if implemented)

### Rate Limiting
API requests are rate-limited to prevent abuse:
- **Admin Operations**: 100 requests per minute
- **Data Retrieval**: 200 requests per minute

### Data Encryption
Sensitive data is encrypted using AES-256-GCM:
- API credentials
- Customer payment information
- Admin settings
