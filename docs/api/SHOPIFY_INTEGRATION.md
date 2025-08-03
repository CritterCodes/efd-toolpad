# 🛒 Shopify Integration Guide

## Overview
Comprehensive guide for the Shopify API 2025-07 integration in the Engel Fine Design Admin CRM.

## 🔧 **Configuration**

### Database-Driven Configuration
The system uses encrypted database storage for Shopify credentials instead of environment variables for enhanced security.

### Admin Settings Interface
Configure Shopify integration through the admin dashboard:
1. Navigate to **Admin Settings → Integrations Tab**
2. Enter Shopify store details
3. Test connection before saving
4. Credentials are automatically encrypted and stored

---

## 🔌 **API Integration Details**

### **API Version**
- **Current Version**: 2025-07 (Latest)
- **Protocol**: REST API (replacing GraphQL for simplicity)
- **Base URL**: `https://{store}.myshopify.com/admin/api/2025-07/`

### **Authentication**
```javascript
headers: {
  'X-Shopify-Access-Token': '[encrypted_token_from_database]',
  'Content-Type': 'application/json'
}
```

---

## 🛍️ **Order Management**

### **Order Types Supported**

#### **1. Draft Orders**
Used for customer approval and estimates

```javascript
// Create Draft Order
POST /admin/api/2025-07/draft_orders.json

{
  "draft_order": {
    "line_items": [
      {
        "title": "Ring Sizing Up/Down",
        "price": "67.89",
        "quantity": 1,
        "properties": [
          {
            "name": "Task Code",
            "value": "SZ001"
          },
          {
            "name": "Labor Hours", 
            "value": "0.75"
          }
        ]
      }
    ],
    "customer": {
      "email": "customer@example.com"
    },
    "note": "Repair estimate - requires customer approval"
  }
}
```

#### **2. Deposit Orders**
For partial payment collection

```javascript
// Create Deposit Order
POST /admin/api/2025-07/orders.json

{
  "order": {
    "line_items": [
      {
        "title": "Repair Deposit - Ring Sizing",
        "price": "33.95", // 50% of total
        "quantity": 1
      }
    ],
    "financial_status": "pending",
    "tags": "repair-deposit"
  }
}
```

#### **3. Final Orders**
For final payment and fulfillment

```javascript
// Create Final Order
POST /admin/api/2025-07/orders.json

{
  "order": {
    "line_items": [
      {
        "title": "Ring Sizing Up/Down - Final Payment",
        "price": "33.94", // Remaining balance
        "quantity": 1
      }
    ],
    "fulfillment_status": "unfulfilled",
    "tags": "repair-final"
  }
}
```

---

## 🔄 **Integration Workflow**

### **1. Connection Setup**
```javascript
// Test connection
const testConnection = async (storeUrl, accessToken) => {
  const response = await fetch(`${storeUrl}/admin/api/2025-07/shop.json`, {
    headers: {
      'X-Shopify-Access-Token': accessToken
    }
  });
  
  return response.ok;
};
```

### **2. Order Creation Process**
1. **Repair Task Selection** - Customer selects needed repairs
2. **Price Calculation** - Dynamic pricing based on business formula
3. **Draft Order Creation** - Generate estimate for customer approval
4. **Deposit Collection** - Create deposit order when approved
5. **Work Completion** - Update order status and create final payment
6. **Fulfillment** - Mark as completed when customer picks up

### **3. Error Handling**
```javascript
try {
  const order = await createShopifyOrder(orderData);
  console.log('Order created:', order.id);
} catch (error) {
  if (error.status === 401) {
    // Token expired or invalid
    console.error('Authentication failed');
  } else if (error.status === 429) {
    // Rate limit exceeded
    console.error('Rate limit exceeded, retry after delay');
  } else {
    // Other errors
    console.error('Order creation failed:', error.message);
  }
}
```

---

## 🔐 **Security Implementation**

### **Credential Encryption**
```javascript
// Encryption when storing
const encryptedToken = await encryptSensitiveData(accessToken);
await db.collection('adminSettings').updateOne(
  { type: 'shopify' },
  { 
    $set: { 
      accessToken: encryptedToken,
      lastUpdated: new Date()
    }
  }
);

// Decryption when using
const decryptedToken = await decryptSensitiveData(storedToken);
```

### **Connection Testing**
Real-time validation ensures credentials are always working:
- **Automatic Testing**: Every 24 hours
- **Manual Testing**: Available in admin interface
- **Error Alerts**: Immediate notification of connection issues

---

## 📊 **Product Management**

### **Repair Task as Products**
Each repair task can be created as a Shopify product for easier order management:

```javascript
// Create repair task product
POST /admin/api/2025-07/products.json

{
  "product": {
    "title": "Ring Sizing Up/Down",
    "product_type": "Repair Service",
    "vendor": "Engel Fine Design",
    "variants": [
      {
        "price": "67.89",
        "sku": "RT-SIZING-001",
        "inventory_management": null,
        "inventory_policy": "continue"
      }
    ],
    "tags": "repair-service,sizing,jewelry",
    "metafields": [
      {
        "namespace": "repair",
        "key": "labor_hours",
        "value": "0.75",
        "type": "number_decimal"
      },
      {
        "namespace": "repair", 
        "key": "task_code",
        "value": "SZ001",
        "type": "single_line_text_field"
      }
    ]
  }
}
```

---

## 📈 **Analytics Integration**

### **Order Tracking**
```javascript
// Get repair orders
GET /admin/api/2025-07/orders.json?tag=repair-service&status=any

// Response includes:
{
  "orders": [
    {
      "id": 12345,
      "name": "#R001",
      "financial_status": "paid",
      "fulfillment_status": "fulfilled",
      "tags": "repair-service,sizing",
      "total_price": "67.89",
      "created_at": "2025-08-02T10:00:00Z"
    }
  ]
}
```

### **Revenue Analytics**
- Track repair service revenue separately from product sales
- Monitor completion rates and average ticket values  
- Generate reports on popular repair types

---

## 🔧 **Configuration Reference**

### **Required Shopify Settings**
1. **Private App Creation**:
   - Admin API access
   - Orders read/write permissions
   - Products read/write permissions (optional)
   - Customers read permissions

2. **Webhook Configuration** (Optional):
   - Order payment status updates
   - Order fulfillment updates
   - Customer updates

### **Database Schema**
```javascript
{
  type: 'shopify',
  settings: {
    storeUrl: 'https://example.myshopify.com',
    accessToken: '[encrypted_token]',
    enabled: true,
    lastTested: Date,
    connectionStatus: 'connected' | 'disconnected' | 'error'
  },
  audit: {
    lastUpdated: Date,
    updatedBy: 'admin_user_id'
  }
}
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Authentication Errors**
- Verify access token is correct and not expired
- Check if private app has necessary permissions
- Ensure store URL format is correct

#### **Rate Limiting**  
- Shopify allows 40 requests per app per minute
- Implement exponential backoff for retries
- Monitor API usage in Shopify admin

#### **Order Creation Failures**
- Validate all required fields are present
- Check customer email format
- Ensure product variants exist if using product-based orders

### **Debug Mode**
Enable detailed logging in development:
```javascript
process.env.SHOPIFY_DEBUG = 'true'
```

---

## 🔄 **Migration Notes**

### **From Environment Variables**
The system was migrated from environment-based configuration:

**OLD (Deprecated):**
```bash
SHOPIFY_STORE_URL=https://example.myshopify.com  
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

**NEW (Current):**
- Database-driven configuration
- Encrypted credential storage
- Real-time connection testing
- Admin interface management

### **API Version Upgrade**
Updated from older Shopify API versions to 2025-07:
- Simplified REST endpoint structure
- Improved error handling
- Enhanced security features
- Better rate limiting controls
