# Engel Fine Design - Admin CRM System

## 🎯 **Project Overview**

A comprehensive **Next.js 15.1.3** admin-only CRM system for jewelry repair business management. This internal application handles repair task management, pricing calculations, customer workflows, and integrates with Shopify for order fulfillment.

## 🚀 **Key Features**

### **📋 Repair Task Management**
- 92+ professional repair tasks with dynamic pricing
- Category-based organization (sizing, prongs, chains, settings, misc)
- Material-aware pricing calculations with metal type considerations
- Process-based workflows with estimated turnaround times

### **🔐 Admin Dashboard**
- Secure authentication with NextAuth.js and JWT
- Tabbed admin interface: Store Settings, Integrations, Analytics
- Real-time pricing calculations with business formula integration
- PIN-based security for sensitive operations

### **🛒 Shopify Integration (2025-07 API)**
- Database-driven configuration with encrypted credential storage
- REST API endpoints for order creation and management
- Multiple order types: Draft, Deposit, Final orders
- Real-time connection testing and validation

### **📊 Business Intelligence**
- Dynamic pricing with configurable business parameters
- Labor hours × wage + material costs with markup calculations
- Consumables fee (8%) and comprehensive business fee structure
- Live pricing previews and cost breakdowns

### **🔧 Workflow Management**
- Repair workflows: All Repairs, Move, Pick-up, Quality Control, Parts, Bulk Print
- Customer management with detailed profiles and repair history
- Custom ticket system for specialized requests
- Analytics dashboard with business insights

## 💻 **Technology Stack**

- **Framework**: Next.js 15.1.3 (App Router)
- **Database**: MongoDB with encrypted credential storage
- **Authentication**: NextAuth.js with JWT tokens
- **UI Framework**: Material-UI (MUI) with custom theming
- **Integrations**: Shopify API 2025-07, Stuller API
- **Security**: AES-256-GCM encryption, PIN-based admin access
- **Cloud Services**: AWS S3 for file storage

## 🏗️ **Architecture**

### **Database Schema**
```javascript
// Repair Tasks v2.0 Schema
{
  sku: "RT-SIZING-001",
  taskCode: "SZ001", 
  title: "Ring Sizing Up/Down",
  category: "sizing",
  laborHours: 0.75,
  materialCost: 12.50,
  metalType: "gold",
  service: {
    estimatedDays: 3,
    rushMultiplier: 1.5
  }
}
```

### **Admin Settings Configuration**
- **Store Settings**: Business parameters, pricing formulas, operational settings
- **Integrations**: Shopify and Stuller API configurations with real-time testing
- **Security**: PIN-based access with 1-hour expiration, audit logging

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Node.js 18+ 
- MongoDB database
- Shopify store access (optional)
- AWS S3 bucket (for file uploads)

### **Environment Configuration**
```bash
# Database
MONGODB_URI=mongodb://[connection-string]
MONGO_DB_NAME=efd-database-DEV

# Authentication
NEXTAUTH_SECRET=[your-secret]
NEXTAUTH_URL=http://localhost:3000
JWT_SECRET=[jwt-secret]

# AWS S3
AWS_ACCESS_KEY_ID=[aws-key]
AWS_SECRET_ACCESS_KEY=[aws-secret]
AWS_REGION=us-east-2
AWS_BUCKET_NAME=efd-inkd

# Google Integration
GOOGLE_CLIENT_ID=[google-oauth-id]
GOOGLE_CLIENT_SECRET=[google-oauth-secret]

# Email Configuration
EMAIL_USER=[email]
EMAIL_PASS=[app-password]
```

### **Installation Steps**
```bash
# Clone repository
git clone [repository-url]
cd efd-react

# Install dependencies
npm install

# Run development server
npm run dev

# Open application
http://localhost:3000
```

## 📁 **Project Structure**

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin-only endpoints
│   │   ├── auth/                 # Authentication
│   │   ├── repairs/              # Repair management
│   │   └── stuller/              # Stuller integration
│   ├── dashboard/                # Admin dashboard
│   │   ├── admin/                # Admin interfaces
│   │   ├── clients/              # Customer management
│   │   ├── repairs/              # Repair workflows
│   │   └── analytics/            # Business intelligence
│   └── components/               # Reusable UI components
├── lib/                          # Database & utilities
├── services/                     # Business logic
├── utils/                        # Helper functions
└── middleware.js                 # Authentication middleware
```

## 🔧 **Key Components**

### **Admin Settings Dashboard**
- **Store Settings Tab**: Business parameters, pricing calculations, operational configuration
- **Integrations Tab**: Shopify/Stuller API management with connection testing
- **Materials/Processes**: Repair component management interfaces

### **Repair Management System**
- **All Repairs**: Comprehensive repair overview and management
- **Workflow Stages**: Move, Pick-up, Quality Control, Parts, Bulk Print
- **Dynamic Pricing**: Real-time calculations based on labor, materials, and business parameters

### **Security Features**
- **Database-Driven Configuration**: No sensitive data in environment variables
- **Encrypted Storage**: AES-256-GCM encryption for API credentials
- **PIN-Based Access**: Time-limited administrative operations
- **Audit Logging**: Complete activity tracking for admin actions

## 📊 **Business Formula**

```javascript
// Dynamic Pricing Calculation
basePrice = ((laborHours × hourlyWage) + (materialCost × materialMarkup)) × (1 + totalBusinessFees)

// Business Fees Structure
- Admin Fee: 15%
- Business Fee: 25% 
- Handling Fee: 8%
- Consumables Fee: 8%
// Total: ~48% in business fees
```

## 🚀 **Deployment**

### **Production Environment**
```bash
# Build for production
npm run build

# Start production server
npm start
```

### **Environment Files**
- `.env.local` - Development configuration
- `.env.production` - Production settings
- `.env.example` - Configuration template with current architecture documentation

## 🔄 **Migration History**

The system successfully migrated from Shopify product-based repair task management to a comprehensive internal CRM:

- **✅ Phase 1**: Database schema redesign and data migration (92 repair tasks)
- **✅ Phase 2**: Admin settings and dynamic pricing implementation  
- **✅ Phase 3**: Shopify integration modernization (API 2025-07)
- **✅ Phase 4**: Database-driven configuration with encryption
- **✅ Phase 5**: Code cleanup and optimization
- **✅ Phase 6**: Navigation fixes and UI modernization

## 📚 **Documentation**

Comprehensive documentation is available in the `/docs` directory:

### **📁 Main Documentation**
- **[docs/README.md](docs/README.md)** - Documentation index and navigation guide
- **[docs/ADMIN_CRM_TRANSFORMATION.md](docs/ADMIN_CRM_TRANSFORMATION.md)** - System transformation details
- **[docs/PROJECT_COMPLETION_SUMMARY.md](docs/PROJECT_COMPLETION_SUMMARY.md)** - Project completion status and metrics
- **[docs/SECURITY.md](docs/SECURITY.md)** - Security protocols and implementation
- **[docs/DEPRECATED.md](docs/DEPRECATED.md)** - Legacy features and deprecated functionality

### **📁 Migration Documentation** (`/docs/migration/`)
- **[docs/migration/REPAIR_TASKS_ROADMAP.md](docs/migration/REPAIR_TASKS_ROADMAP.md)** - Complete migration strategy and accomplishments
- **[docs/migration/REPAIR_TASKS_TRACKER.md](docs/migration/REPAIR_TASKS_TRACKER.md)** - Detailed progress tracking and completion
- **[docs/migration/REPAIR_TASK_SCHEMA_V2.md](docs/migration/REPAIR_TASK_SCHEMA_V2.md)** - Database schema documentation

### **📁 API Documentation** (`/docs/api/`)
- **[docs/api/API_REFERENCE.md](docs/api/API_REFERENCE.md)** - Complete API endpoint documentation
- **[docs/api/SHOPIFY_INTEGRATION.md](docs/api/SHOPIFY_INTEGRATION.md)** - Shopify API integration guide  
- **[docs/api/AUTHENTICATION.md](docs/api/AUTHENTICATION.md)** - Authentication and security implementation

## 🤝 **Contributing**

This is an internal business application. For feature requests or bug reports, please contact the development team.

## 📄 **License**

Private business application - All rights reserved.
