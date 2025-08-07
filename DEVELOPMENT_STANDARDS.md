# EFD CRM Development Standards & Architecture Guidelines

## 🏗️ MANDATORY ARCHITECTURAL REQUIREMENTS

**ALL NEW DEVELOPMENT MUST FOLLOW THESE STANDARDS - NO EXCEPTIONS**

---

## 📐 Modular MVC(C) Architecture

### Required Structure for ALL New Features:

```
src/
├── app/
│   ├── api/
│   │   └── [feature]/
│   │       ├── model.js          # Data models & schemas
│   │       ├── controller.js     # Request handling & validation
│   │       ├── service.js        # Business logic
│   │       └── route.js          # API endpoints
│   ├── components/
│   │   └── [feature]/
│   │       ├── [Feature]Form.js      # Form components
│   │       ├── [Feature]Card.js      # Display components
│   │       ├── [Feature]Grid.js      # List/Grid components
│   │       ├── [Feature]Dialog.js    # Modal components
│   │       └── index.js              # Component exports
│   └── dashboard/
│       └── [feature]/
│           └── page.js           # Page composition only
├── services/
│   └── [feature].service.js      # API calls & external integrations
├── utils/
│   └── [feature].util.js         # Pure utility functions
└── schemas/
    └── [feature].schema.js       # Validation schemas
```

---

## 🎯 Layer Responsibilities

### **1. Model Layer (`model.js`)**
```javascript
// ✅ CORRECT: Pure data structure
export class PaymentOrder {
    constructor(data) {
        this.id = data.id;
        this.clientId = data.clientId;
        this.repairs = data.repairs || [];
        this.totalAmount = data.totalAmount || 0;
        this.status = data.status || 'pending';
        this.createdAt = data.createdAt || new Date();
    }

    // Only data transformation methods
    toObject() {
        return { /* ... */ };
    }
}
```

### **2. Controller Layer (`controller.js`)**
```javascript
// ✅ CORRECT: Request handling only
import { PaymentOrderService } from './service.js';

export const PaymentOrderController = {
    async create(req, res) {
        try {
            const result = await PaymentOrderService.create(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
};
```

### **3. Service Layer (`service.js`)**
```javascript
// ✅ CORRECT: Business logic & database operations
import { PaymentOrder } from './model.js';

export const PaymentOrderService = {
    async create(data) {
        // Validation
        if (!data.clientId) throw new Error('Client ID required');
        
        // Business logic
        const paymentOrder = new PaymentOrder(data);
        
        // Database operations
        return await db.collection('paymentOrders').add(paymentOrder.toObject());
    }
};
```

### **4. API Service Layer (`services/[feature].service.js`)**
```javascript
// ✅ CORRECT: External API calls only
export const paymentOrderApiService = {
    async getAll() {
        const response = await fetch('/api/payment-orders');
        return response.json();
    },

    async create(data) {
        const response = await fetch('/api/payment-orders', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        return response.json();
    }
};
```

### **5. Utility Layer (`utils/[feature].util.js`)**
```javascript
// ✅ CORRECT: Pure utility functions
export const paymentOrderUtils = {
    calculateTotalAmount(repairs) {
        return repairs.reduce((sum, repair) => sum + repair.totalCost, 0);
    },

    formatPaymentOrderId(id) {
        return `PO-${id.slice(-8).toUpperCase()}`;
    },

    groupRepairsByClient(repairs) {
        return repairs.reduce((acc, repair) => {
            if (!acc[repair.clientId]) acc[repair.clientId] = [];
            acc[repair.clientId].push(repair);
            return acc;
        }, {});
    }
};
```

### **6. Component Layer (Modular Components)**
```javascript
// ✅ CORRECT: Single responsibility components
import { paymentOrderApiService } from '@/services/paymentOrder.service';

// Form Component
export const PaymentOrderForm = ({ onSubmit, initialData }) => {
    // Form logic only
};

// Display Component  
export const PaymentOrderCard = ({ paymentOrder, onEdit, onDelete }) => {
    // Display logic only
};

// List Component
export const PaymentOrderGrid = ({ filters, onSelect }) => {
    // Grid/list logic only
};
```

### **7. Page Layer (`page.js`)**
```javascript
// ✅ CORRECT: Composition only, minimal logic
import { PaymentOrderGrid } from '@/components/payment-orders/PaymentOrderGrid';
import { PaymentOrderForm } from '@/components/payment-orders/PaymentOrderForm';

export default function PaymentOrdersPage() {
    return (
        <div>
            <PageHeader title="Payment Orders" />
            <PaymentOrderGrid />
            <PaymentOrderForm />
        </div>
    );
}
```

---

## 🚫 ANTI-PATTERNS (Forbidden)

### **❌ NEVER DO THIS:**

```javascript
// ❌ BAD: Mixed responsibilities in page
export default function BadPage() {
    const [data, setData] = useState([]);
    
    // ❌ NO: API calls directly in page
    useEffect(() => {
        fetch('/api/payment-orders').then(/* ... */);
    }, []);
    
    // ❌ NO: Business logic in page
    const calculateTotal = (items) => {
        return items.reduce(/* ... */);
    };
    
    // ❌ NO: Inline components
    return (
        <div>
            {data.map(item => (
                <div key={item.id}>
                    {/* Complex inline JSX */}
                </div>
            ))}
        </div>
    );
}

// ❌ BAD: Business logic in controller
export const BadController = {
    async create(req, res) {
        // ❌ NO: Business logic in controller
        const total = req.body.items.reduce((sum, item) => sum + item.price, 0);
        
        // ❌ NO: Direct database calls in controller
        const result = await db.collection('orders').add({
            ...req.body,
            total
        });
        
        res.json(result);
    }
};

// ❌ BAD: API calls in components
export const BadComponent = () => {
    useEffect(() => {
        // ❌ NO: Direct API calls in components
        fetch('/api/data').then(/* ... */);
    }, []);
};
```

---

## 📋 Development Checklist

Before submitting any new code, verify:

### **✅ Architecture Compliance**
- [ ] Model layer contains ONLY data structures
- [ ] Controller layer contains ONLY request/response handling
- [ ] Service layer contains ONLY business logic & database operations
- [ ] API service layer contains ONLY external API calls
- [ ] Utility layer contains ONLY pure functions
- [ ] Components have single responsibilities
- [ ] Pages contain ONLY composition logic

### **✅ File Organization**
- [ ] All files follow the required directory structure
- [ ] Components are modular and reusable
- [ ] Services are properly separated from business logic
- [ ] Utilities are pure functions with no side effects

### **✅ Code Quality**
- [ ] No mixed responsibilities in any layer
- [ ] No direct API calls in components or pages
- [ ] No business logic in controllers or API services
- [ ] All functions have clear, single purposes
- [ ] Proper error handling at each layer

---

## 🎯 Implementation Priority Order

When building new features, implement in this order:

1. **Schema/Model** - Define data structure
2. **Utilities** - Create helper functions  
3. **Service Layer** - Implement business logic
4. **Controller** - Handle requests/responses
5. **API Routes** - Wire up endpoints
6. **API Service** - Create frontend API calls
7. **Components** - Build modular UI pieces
8. **Pages** - Compose components together

---

## 📚 Examples & Templates

### Feature Template Structure:
```bash
# When creating a new feature called "payment-orders":

# 1. Backend API
src/app/api/payment-orders/
├── model.js
├── controller.js  
├── service.js
└── route.js

# 2. Frontend Services
src/services/
└── paymentOrder.service.js

# 3. Utilities
src/utils/
└── paymentOrder.util.js

# 4. Components
src/app/components/payment-orders/
├── PaymentOrderForm.js
├── PaymentOrderCard.js
├── PaymentOrderGrid.js
├── PaymentOrderDialog.js
└── index.js

# 5. Pages
src/app/dashboard/payment-orders/
└── page.js

# 6. Schema
src/schemas/
└── paymentOrder.schema.js
```

---

## 🚀 Benefits of This Architecture

- **Maintainability**: Easy to find and modify specific functionality
- **Testability**: Each layer can be tested independently
- **Reusability**: Components and services can be reused across features
- **Scalability**: Clear separation allows for easy feature expansion
- **Debugging**: Issues can be traced to specific layers quickly
- **Team Collaboration**: Clear responsibilities reduce conflicts

---

## ⚡ Quick Reference Commands

```bash
# Creating a new feature scaffold
mkdir -p src/app/api/[feature]
mkdir -p src/app/components/[feature]  
mkdir -p src/app/dashboard/[feature]
touch src/services/[feature].service.js
touch src/utils/[feature].util.js
touch src/schemas/[feature].schema.js
```

---

**REMEMBER: This architecture is MANDATORY for all new development. Any code that doesn't follow these patterns will be rejected in code review.**
