# EFD Constitutional File Organization Standards

## Strict Directory Structure Enforcement

### Core Architecture Layers
```
src/
├── app/                           # Next.js App Router (Pages Layer)
│   ├── dashboard/                 # Feature-based pages
│   │   └── [feature]/
│   │       ├── page.js           # Main page component (<300 lines)
│   │       ├── loading.js        # Loading component
│   │       ├── error.js          # Error boundary
│   │       └── components/       # Page-specific components
│   └── api/                      # API Route Layer  
│       └── [feature]/
│           ├── route.js          # Route definitions only
│           ├── controller.js     # Request/response handling
│           ├── service.js        # API-specific business logic
│           ├── model.js          # Database schema/operations
│           └── [id]/             # Dynamic routes
│               └── route.js
│
├── services/                      # Frontend Service Layer
│   ├── [feature].service.js     # Frontend API clients only
│   ├── [feature]/                # Complex services get directories
│   │   ├── index.js              # Main service export
│   │   ├── [feature].service.js # Core service
│   │   ├── [feature].client.js  # HTTP client wrapper
│   │   └── [feature].types.js   # Service-specific types
│   └── index.js                  # Service registry
│
├── microservices/                 # Business Logic Layer (NEW)
│   └── [domain]/                 # Business domain grouping
│       ├── [domain].microservice.js     # Core business logic
│       ├── [subdomain].microservice.js  # Sub-domain logic
│       ├── [domain].repository.js       # Data access layer
│       ├── [domain].validator.js        # Business validation
│       └── tests/                        # Microservice tests
│           ├── [domain].test.js
│           └── integration/
│
├── components/                    # UI Component Layer
│   ├── ui/                       # Base UI components (buttons, inputs)
│   ├── forms/                    # Form components
│   ├── layouts/                  # Layout components  
│   ├── business/                 # Business-specific components
│   │   └── [feature]/           # Feature-grouped components
│   └── shared/                   # Cross-feature shared components
│
├── hooks/                         # Custom React Hooks
│   ├── [feature]/               # Feature-specific hooks
│   │   ├── use[Feature]Data.js  # Data management hooks
│   │   ├── use[Feature]State.js # State management hooks
│   │   └── index.js             # Hook exports
│   └── shared/                  # Cross-feature hooks
│
├── utilities/                     # Pure Utility Functions
│   ├── validation/               # Validation utilities
│   │   ├── [domain].validator.js
│   │   └── common.validator.js
│   ├── formatting/               # Formatting utilities
│   │   ├── currency.formatter.js
│   │   ├── date.formatter.js
│   │   └── string.formatter.js
│   ├── constants/                # Application constants
│   │   ├── [domain].constants.js
│   │   └── api.constants.js
│   ├── helpers/                  # Helper functions
│   │   ├── [domain].helpers.js
│   │   └── common.helpers.js
│   └── types/                    # TypeScript types/JSDoc types
│       ├── [domain].types.js
│       └── common.types.js
│
├── lib/                          # Third-party configurations
│   ├── database.js              # Database connection
│   ├── auth.js                  # Authentication config
│   └── external/                # External API configurations
│       ├── shopify.config.js
│       └── stuller.config.js
│
└── config/                       # Application configuration
    ├── [feature]/               # Feature-specific configs
    └── environment.js           # Environment variables
```

## Naming Conventions (STRICT)

### Service Files
- **Frontend Services**: `[feature].service.js` 
- **Backend Services**: `[feature].service.js` (in API directories)
- **Microservices**: `[domain].microservice.js`

### Utility Files  
- **Validators**: `[domain].validator.js`
- **Formatters**: `[type].formatter.js`
- **Helpers**: `[domain].helpers.js`
- **Constants**: `[domain].constants.js`

### Component Files
- **Components**: `[ComponentName].js` (PascalCase)
- **Hooks**: `use[HookName].js` (camelCase with 'use' prefix)
- **Pages**: `page.js` (Next.js convention)

## File Size Limits (NON-NEGOTIABLE)
- **All files**: Maximum 300 lines
- **Components**: Maximum 250 lines (leave room for props/styling)
- **Services**: Maximum 300 lines
- **Utilities**: Maximum 200 lines (should be focused functions)

## Responsibility Matrix

| Layer | Responsibility | Examples |
|-------|---------------|----------|
| **Pages** | UI orchestration, component composition | Dashboard layout, form layouts |
| **Components** | Reusable UI elements, presentation logic | Buttons, cards, modals, forms |
| **Hooks** | State management, side effects | Data fetching, form state |
| **Services** | API communication, HTTP requests | REST calls, GraphQL queries |
| **Microservices** | Business logic, domain rules | Pricing calculations, workflow rules |
| **Utilities** | Pure functions, data transformation | Formatters, validators, helpers |
| **Config** | Application settings, constants | API endpoints, feature flags |

## Import/Export Standards

### Absolute Imports Required
```javascript
// ✅ CORRECT
import { UserService } from '@/services/user.service';
import { validateEmail } from '@/utilities/validation/user.validator';
import { formatCurrency } from '@/utilities/formatting/currency.formatter';

// ❌ WRONG  
import { UserService } from '../../../services/user.service';
```

### Barrel Exports Required
```javascript
// utilities/validation/index.js
export { validateEmail, validatePhone } from './user.validator';
export { validatePrice, validateSKU } from './product.validator';

// services/index.js  
export { UserService } from './user.service';
export { CustomTicketService } from './customTicket.service';
```

## Cross-Layer Communication Rules

### ✅ ALLOWED IMPORTS
- **Pages** → Components, Hooks, Services, Utilities
- **Components** → Hooks, Utilities  
- **Hooks** → Services, Utilities
- **Services** → Utilities, Config
- **Microservices** → Utilities, Config
- **Utilities** → Config only

### ❌ FORBIDDEN IMPORTS
- **Utilities** → Services, Components, Hooks
- **Services** → Components, Hooks
- **Components** → Services (use hooks instead)
- **Lower layers** → Higher layers (no circular dependencies)

## Migration Strategy for Existing Files

### Step 1: Assess Current Violations
1. Identify files >300 lines
2. Identify mixed responsibility files  
3. Identify incorrect naming patterns

### Step 2: Create Constitutional Structure
1. Create missing directories
2. Move files to correct locations
3. Rename files to match conventions

### Step 3: Refactor Oversized Files
1. Extract business logic to microservices
2. Extract utilities to utility layer
3. Break components into smaller pieces

### Step 4: Update Imports
1. Change to absolute imports
2. Create barrel exports
3. Update component dependencies

## Enforcement Checklist

Before any file creation/modification:
- [ ] File under 300 lines
- [ ] Correct directory location
- [ ] Proper naming convention
- [ ] Single responsibility
- [ ] Correct layer dependencies
- [ ] Absolute imports used
- [ ] Barrel exports created

## Examples of Constitutional Files

### ✅ Microservice Example
```javascript
// src/microservices/pricing/jewelry.microservice.js
export class JewelryPricingMicroservice {
  static calculateCustomTicketPrice(materials, labor, markup) {
    // Business logic only
  }
}
```

### ✅ Service Example  
```javascript
// src/services/customTicket.service.js
export class CustomTicketService {
  static async fetchAll(filters) {
    // HTTP requests only
  }
}
```

### ✅ Utility Example
```javascript
// src/utilities/formatting/currency.formatter.js
export const formatCurrency = (amount, currency = 'USD') => {
  // Pure formatting function only
}
```

This constitutional structure enforces clean architecture, predictable organization, and maintainable code across the entire EFD platform.