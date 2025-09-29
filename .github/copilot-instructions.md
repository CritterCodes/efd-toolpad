# AI Development Assistant Instructions for EFD Jewelry Business Management System

## Project Overview

You are an expert AI programming assistant working with the Engel Fine Design (EFD) jewelry business management platform. This is a comprehensive dual-system architecture:

- **EFD Admin** (`efd-admin/`): Next.js 15.1.3 CRM system for jewelry repair management
- **EFD Shop** (`efd-shop/`): Next.js 15.3.4 e-commerce platform with 3D model viewing

### Core Technologies
- **Frontend**: Next.js, React 18/19, Material-UI, Tailwind CSS
- **Backend**: MongoDB, Next.js API routes, AWS S3, Shopify integration
- **Architecture**: Microservice architecture within monorepo following MVC patterns

## Constitutional Development Standards (Non-Negotiable)

### Architecture Philosophy
- **Microservice Architecture Within Monorepo**: Each service is self-contained with MVC pattern
- **SOLID Principles**: Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion
- **Test-Driven Development**: Tests first, then implementation
- **Component-First Design**: All UI built with reusable components (non-negotiable)
- **Predictable Organization**: Defined file structure guarantees (non-negotiable)

### Request Flow Architecture
```
Frontend: Page → API Client → HTTP Request
Backend: Route → Controller → Service → Microservice
```

**Layer Definitions:**
- **Page**: React component (uses API clients, utilities, components)
- **API Client**: Frontend HTTP client that calls backend API endpoints
- **Route**: Next.js API route handler (URL endpoint definitions)  
- **Controller**: Request/response handling and validation
- **Service**: Backend business logic orchestration  
- **Microservice**: Domain-specific business logic (embedded or deployed)

### File Standards (Critical)
- **Maximum 300 lines per file** (no exceptions)
- **Single responsibility per file**
- **No monolithic configuration files**
- **Descriptive, searchable file names**
- **Consistent naming conventions**

## Directory Structure Standards

## Directory Structure Standards

### EFD Admin Structure (STRICT ENFORCEMENT)
```
src/
├── app/                          # Next.js App Router (Pages Layer)
│   ├── dashboard/                # Feature-based pages
│   │   ├── clients/             # Client management pages
│   │   ├── custom-tickets/      # Custom ticket workflow
│   │   └── repairs/             # Repair management
│   └── api/                     # Backend API layer (MVC Pattern)
│       ├── users/               # User management API
│       │   ├── route.js        # Next.js API route definitions
│       │   ├── controller.js   # Request/response handling ONLY
│       │   ├── service.js      # Backend business logic
│       │   └── model.js        # Data access operations
│       └── custom-tickets/      # Custom ticket API
│
├── api-clients/                 # Frontend API clients (HTTP requests ONLY)
│   ├── customTicket.client.js  # REST API client
│   ├── materials.client.js     # Materials API client
│   ├── users.client.js         # User API client (MUST use .client.js)
│   └── customTicketsMicroserviceAdapter.js  # Microservice adapter
│
├── components/                 # UI Components (Presentation ONLY)
│   ├── ui/                    # Base UI components (buttons, inputs)
│   ├── forms/                 # Form components
│   ├── layouts/               # Layout components
│   ├── business/              # Business-specific components
│   │   └── custom-tickets/    # Feature-grouped components
│   └── shared/                # Cross-feature components
│
├── hooks/                     # Custom React Hooks (State + Side Effects)
│   ├── custom-tickets/       # Feature-specific hooks
│   │   ├── useCustomTicketsData.js  # Data management
│   │   ├── usePagination.js         # Pagination logic  
│   │   └── index.js                 # Hook exports
│   └── shared/               # Cross-feature hooks
│
├── utilities/                # Pure Functions ONLY (NO side effects)
│   ├── validation/           # Validation utilities
│   │   ├── user.validator.js
│   │   └── product.validator.js
│   ├── formatting/           # Formatting utilities
│   │   ├── currency.formatter.js
│   │   ├── date.formatter.js
│   │   └── string.formatter.js
│   ├── constants/            # Application constants
│   │   ├── api.constants.js
│   │   └── business.constants.js
│   ├── helpers/              # Helper functions
│   │   ├── pricing.helpers.js
│   │   └── common.helpers.js
│   └── types/                # Type definitions
│
├── lib/                      # Third-party configurations
│   ├── database.js          # Database connection
│   ├── auth.js              # Authentication config
│   └── external/            # External API configs
│
└── config/                   # Application configuration
    ├── statuses/            # Modular status configuration
    └── environment.js       # Environment variables
│
microservices/               # Independent deployable services (Outside src/)
├── custom-tickets-service/
│   ├── src/
│   │   ├── controllers/     # HTTP controllers
│   │   ├── services/        # Business logic
│   │   ├── models/          # Data models
│   │   └── routes/          # Express routes
│   ├── package.json         # Independent deployment
│   └── Dockerfile           # Container ready
└── [other-services]/
```

### EFD Shop Structure
```
app/
├── collections/                  # Product collections
├── account/                     # Customer account management
├── cart/                        # Shopping cart functionality
├── checkout/                    # Payment processing
└── api/                        # E-commerce API endpoints
```

## Business Domain Knowledge

### Jewelry Repair Workflow
- **92+ Repair Task Types**: Each with dynamic pricing, materials, processes
- **Status Flow**: 25+ internal statuses mapping to 7 client-friendly categories
- **Custom Tickets**: Bespoke jewelry creation workflow
- **Materials Management**: Precious metals, gems, findings with Stuller integration
- **Payment Processing**: Shopify integration for deposit/final payments

### Key Business Objects
- **RepairTask**: Individual repair operations with pricing formulas
- **CustomTicket**: Full custom jewelry creation workflow
- **Materials**: Inventory with dynamic pricing from Stuller API
- **Processes**: Manufacturing steps with time and cost tracking
- **Clients**: Customer management with repair history

## File Organization and Naming Standards (STRICT ENFORCEMENT)

### Naming Conventions (NON-NEGOTIABLE)
- **Frontend API Clients**: `[feature].client.js` (MUST include .client)
- **Backend Controllers**: `[feature].controller.js` (in API directories)
- **Backend Services**: `[feature].service.js` (in API directories) 
- **Backend Models**: `[feature].model.js` (in API directories)
- **Validators**: `[domain].validator.js` (MUST include .validator)
- **Formatters**: `[type].formatter.js` (MUST include .formatter)
- **Helpers**: `[domain].helpers.js` (MUST include .helpers)
- **Constants**: `[domain].constants.js` (MUST include .constants)
- **Components**: `[ComponentName].js` (PascalCase)
- **Hooks**: `use[HookName].js` (camelCase with 'use' prefix)

### Layer Responsibility Matrix (CRITICAL)
| Layer | Responsibility | Max Lines | Examples |
|-------|---------------|-----------|----------|
| **Pages** | UI orchestration, component composition | 300 | Dashboard layout, form orchestration |
| **Components** | Reusable UI, presentation logic | 250 | Buttons, cards, modals, grids |
| **Hooks** | State management, side effects | 300 | Data fetching, form state, pagination |
| **API Clients** | HTTP requests, API communication | 300 | REST calls, API clients |
| **Backend Controllers** | Request/response handling | 200 | HTTP request validation, response formatting |
| **Backend Services** | Business logic orchestration | 300 | Data processing, microservice coordination |
| **Backend Models** | Data access, database operations | 300 | Database queries, data validation |
| **Utilities** | Pure functions, data transformation | 200 | Formatters, validators, helpers |

### Cross-Layer Import Rules (ENFORCED)

#### ✅ ALLOWED IMPORTS
- **Pages** → Components, Hooks, API Clients, Utilities
- **Components** → Hooks, Utilities (NO direct API client calls)
- **Hooks** → API Clients, Utilities
- **API Clients** → Utilities, Config only
- **Backend Controllers** → Backend Services, Utilities
- **Backend Services** → Backend Models, Microservice Adapters, Utilities
- **Backend Models** → Database connections, Utilities
- **Utilities** → Config only (NO other dependencies)

#### ❌ FORBIDDEN IMPORTS  
- **Utilities** → API Clients, Components, Hooks
- **API Clients** → Components, Hooks
- **Components** → API Clients (MUST use hooks instead)
- **Backend Models** → Controllers, Services
- **Lower layers** → Higher layers (prevents circular dependencies)

### Constitutional File Standards
- **Maximum 300 lines per file** (non-negotiable)
- **Single responsibility per file** (one concern only)
- **Absolute imports required** (use @/ alias)
- **Barrel exports required** (index.js files)
- **Descriptive, searchable file names**

## Development Patterns

### Constitutional Microservice Pattern (NEW REQUIREMENT)
```javascript
// src/microservices/pricing/jewelry.microservice.js
export class JewelryPricingMicroservice {
  static calculateCustomTicketPrice(materials, labor, rushMultiplier = 1) {
    // Pure business logic only - no HTTP requests, no UI concerns
    const materialsCost = this.calculateMaterialsCost(materials);
    const laborCost = this.calculateLaborCost(labor);
    return (materialsCost + laborCost) * rushMultiplier;
  }
  
  static calculateMaterialsCost(materials) {
    // Domain-specific pricing calculations
    return materials.reduce((total, material) => total + material.cost, 0);
  }
}
```

### Constitutional API Client Pattern (FRONTEND)
```javascript
// src/api-clients/customTicket.client.js  
export class CustomTicketAPIClient {
  static async fetchAll(filters = {}) {
    // HTTP communication only - NO business logic
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/custom-tickets?${params}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return await response.json();
  }
  
  static async updateStatus(ticketId, newStatus) {
    // API communication only
    const response = await fetch(`/api/custom-tickets/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    if (!response.ok) throw new Error('Failed to update status');
    return await response.json();
  }
}
```

### Constitutional Hook Pattern
```javascript
// src/hooks/custom-tickets/useCustomTicketsData.js
import { CustomTicketAPIClient } from '@/api-clients/customTicket.client';

export const useCustomTicketsData = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadTickets = useCallback(async (filters) => {
    try {
      setLoading(true);
      // Uses API client for HTTP requests
      const response = await CustomTicketAPIClient.fetchAll(filters);
      setTickets(response.tickets || []);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { tickets, loading, loadTickets };
};
```

### Constitutional Utility Pattern
```javascript
// src/utilities/formatting/currency.formatter.js
export const formatCurrency = (amount, currency = 'USD') => {
  // Pure function only - NO side effects, NO business logic
  if (!amount || isNaN(amount)) return 'TBD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};

export const formatCurrencyCompact = (amount) => {
  if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`;
  return formatCurrency(amount);
};
```
### Constitutional API Route Pattern (BACKEND)
```javascript
// src/app/api/custom-tickets/route.js - Route definitions ONLY
import CustomTicketController from "./controller.js";

export async function GET(request) {
  return await CustomTicketController.getAllTickets(request);
}

export async function POST(request) {
  return await CustomTicketController.createTicket(request);
}
```

### Constitutional Controller Pattern (BACKEND)
```javascript
// src/app/api/custom-tickets/controller.js - Request/Response handling ONLY
import CustomTicketService from "./service.js";

export default class CustomTicketController {
  static async getAllTickets(request) {
    try {
      const { searchParams } = new URL(request.url);
      const filters = Object.fromEntries(searchParams);
      
      const result = await CustomTicketService.getAllTickets(filters);
      return Response.json({ success: true, data: result });
    } catch (error) {
      console.error('Controller error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  
  static async createTicket(request) {
    try {
      const ticketData = await request.json();
      const result = await CustomTicketService.createTicket(ticketData);
      return Response.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
      console.error('Controller error:', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}
```

### Constitutional Backend Service Pattern
```javascript
// src/app/api/custom-tickets/service.js - Business logic orchestration
import { getCustomTicketsAdapter } from "@/api-clients/customTicketsMicroserviceAdapter";
import CustomTicketModel from "./model.js";

export default class CustomTicketService {
  static async getAllTickets(filters) {
    // Use microservice adapter for complex business logic
    const adapter = getCustomTicketsAdapter();
    const result = await adapter.getAllTickets(filters);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch tickets');
    }
    
    return result.tickets;
  }
  
  static async createTicket(ticketData) {
    // Validate data through model
    const validatedData = await CustomTicketModel.validate(ticketData);
    
    // Use microservice for creation
    const adapter = getCustomTicketsAdapter();
    return await adapter.createTicket(validatedData);
  }
}
```

### Constitutional Backend Model Pattern
```javascript
// src/app/api/custom-tickets/model.js - Data access layer
import { db } from '@/lib/database';

export default class CustomTicketModel {
  static async validate(ticketData) {
    // Data validation logic
    if (!ticketData.title) {
      throw new Error('Title is required');
    }
    return ticketData;
  }
  
  static async findById(id) {
    const database = await db.connect();
    const collection = database.collection('customTickets');
    return await collection.findOne({ _id: id });
  }
  
  static async create(ticketData) {
    const database = await db.connect();
    const collection = database.collection('customTickets');
    const result = await collection.insertOne(ticketData);
    return await collection.findOne({ _id: result.insertedId });
  }
}
```

## Import Path Standards

Use absolute imports with `@/` alias:
```javascript
import { CustomTicketAPIClient } from '@/api-clients/customTicket.client';
import UserHeader from '@/components/clients/profile/UserHeader';
import { db } from '@/lib/database';
import { getCustomTicketsAdapter } from '@/api-clients/customTicketsMicroserviceAdapter';
```

## Status Management System

### Internal Statuses (25+ statuses)
- **PENDING_CLIENT_APPROVAL**: Waiting for client confirmation
- **MATERIAL_ORDERED**: Materials ordered from supplier
- **IN_PROGRESS_SIZING**: Ring sizing in progress
- **QUALITY_CONTROL_HOLD**: Item held for quality review
- **READY_FOR_PICKUP**: Completed and ready
- **DEAD_LEAD**: Customer has ghosted communication

### Client-Facing Categories
- **submitted**: Initial submission
- **approved**: Ready to begin work
- **in-progress**: Actively being worked on
- **quality-control**: Final review phase
- **completed**: Ready for pickup
- **picked-up**: Job finished
- **cancelled**: Cancelled by client

## Database Patterns

### MongoDB Collections
- **customTickets**: Custom jewelry creation workflows
- **repairTasks**: Individual repair operations
- **materials**: Inventory and pricing data
- **processes**: Manufacturing procedures
- **users**: Client and staff management

### Connection Pattern
```javascript
import { db } from '@/lib/database';

const database = await db.connect();
const collection = database.collection('collectionName');
```

## Component Architecture

### Component Types
- **Page Components**: Full page layouts (max 300 lines)
- **Feature Components**: Self-contained business features
- **UI Components**: Reusable interface elements
- **Layout Components**: Navigation, headers, footers
- **Form Components**: Input handling with validation

### Material-UI Integration
```javascript
import { 
    Button, 
    Dialog, 
    TextField, 
    Box, 
    Typography 
} from '@mui/material';
import { 
    CheckCircle, 
    Warning, 
    Info 
} from '@mui/icons-material';
```

## Error Handling Standards

### API Error Responses
```javascript
return new Response(
    JSON.stringify({ 
        error: "Descriptive error message",
        code: "ERROR_CODE",
        details: errorDetails 
    }), 
    { status: 400 }
);
```

### Frontend Error Handling
```javascript
try {
    const data = await ServiceClass.performOperation();
    return data;
} catch (error) {
    console.error('Operation failed:', error);
    throw new Error('User-friendly error message');
}
```

## Testing Requirements

- **Unit tests for all microservices**
- **Integration tests for API routes**
- **Component tests for complex UI logic**
- **Test coverage minimum 80%**

## Key Business Rules

### Pricing Logic
- Material costs from Stuller API integration
- Labor costs based on process time estimates
- Rush job multipliers (1.5x standard rate)
- Bulk discount calculations for materials

### Workflow Rules
- Status transitions must follow defined paths
- Payment required before final status changes
- Quality control mandatory for high-value items
- Client approval required for cost changes >10%

## Development Workflow

### Before Starting New Features
1. **Design the service boundaries**
2. **Write tests first (TDD)**
3. **Follow the request flow pattern**
4. **Create modular configuration**
5. **Ensure 300-line file limits**

### Code Review Checklist
- [ ] Follows request flow architecture
- [ ] Files under 300 lines
- [ ] Single responsibility principle
- [ ] Proper error handling
- [ ] Tests included
- [ ] Components properly structured
- [ ] No monolithic files

## Performance Considerations

- **Lazy loading for large components**
- **Efficient database queries with proper indexing**
- **Caching strategies for frequently accessed data**
- **Bundle size monitoring**
- **Image optimization for jewelry photos**

## Security Standards

- **Authentication via NextAuth.js**
- **Input validation on all API endpoints**
- **Sanitized database queries**
- **Secure file upload handling**
- **Environment variable protection**

## Integration Points

### Shopify Integration
- Product creation for custom orders
- Payment processing for deposits/finals
- Order management sync

### Stuller API Integration
- Real-time pricing updates
- Material availability checking
- Automated reorder points

### AWS S3 Integration
- Secure file uploads
- Image storage and optimization
- Document management

## Legacy Code Modernization

When encountering non-compliant code:

1. **Assess Impact**: Critical/Moderate/Minor classification
2. **Plan Refactoring**: Break into 300-line modules
3. **Maintain Functionality**: Test-driven migration
4. **Document Changes**: Update architecture docs

## AI Assistant Guidelines

### Always Follow (AUTOMATIC ENFORCEMENT)
- **Check file size** before any edit (>300 lines = refactor first)
- **Assess layer responsibility** before placing code
- **Use correct naming conventions** (service.js, microservice.js, etc.)
- **Enforce import/export rules** (no forbidden cross-layer imports)
- **Break monolithic files** into constitutional modules immediately
- **Create missing directories** following constitutional structure
- **Use absolute imports** with @/ alias exclusively
- **Follow request flow** architecture pattern
- **Test changes** thoroughly before completion

### File Size Enforcement Process
1. **Before editing**: Check line count with `wc -l filename`
2. **If >250 lines**: Propose modular refactoring plan
3. **If >300 lines**: STOP - Mandatory refactoring required
4. **Extract logic**: Move business logic to microservices, utilities to utility layer
5. **Create components**: Break UI into smaller, focused components
6. **Update imports**: Convert to absolute imports and barrel exports

### Constitutional Violations Response
When encountering violations:
1. **Document** the violation in code comments
2. **Propose** constitutional refactoring approach  
3. **Create** modular replacement following standards
4. **Migrate** imports and dependencies gradually
5. **Test** each module independently
6. **Remove** legacy monolithic code

### Never Do (FORBIDDEN)
- Create files >300 lines without refactoring plan
- Skip the microservice layer for business logic  
- Put business logic in React components
- Use relative imports for cross-module dependencies
- Mix responsibilities within single files
- Ignore established directory structure
- Create monolithic configuration files
- Bypass constitutional architecture patterns

### When In Doubt
- Refer to CONSTITUTIONAL_FILE_ORGANIZATION.md
- Check existing constitutional patterns in similar features
- Break complex features into smaller, focused modules
- Follow the responsibility matrix for code placement
- Ask for clarification on business domain boundaries

## Quick Reference Commands

### Common File Locations
- API Routes: `src/app/api/[feature]/route.js`
- Controllers: `src/app/api/[feature]/controller.js`
- Backend Services: `src/app/api/[feature]/service.js`
- Backend Models: `src/app/api/[feature]/model.js`
- Frontend API Clients: `src/api-clients/[feature].client.js`
- Components: `src/components/[category]/[ComponentName].js`
- Pages: `src/app/dashboard/[section]/page.js`
- Hooks: `src/hooks/[feature]/use[HookName].js`

### Database Patterns
```javascript
// Read operation
const items = await collection.find(query).sort({ createdAt: -1 }).toArray();

// Write operation  
const result = await collection.insertOne(document);

// Update operation
const updated = await collection.updateOne({ _id: id }, { $set: updates });
```

This instruction set ensures immediate productivity while maintaining the architectural standards established in the project constitution. Follow these patterns consistently to build maintainable, scalable jewelry business management features.