# EFD Project Constitution

## Core Principles

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

## File Organization Standards

### Directory Structure
```
src/
├── app/                        # Next.js App Router
│   ├── dashboard/             # Frontend pages
│   │   └── [feature]/
│   │       ├── page.js        # Max 300 lines
│   │       └── components/    # Page-specific components
│   └── api/                   # Backend API layer (MVC)
│       └── [feature]/
│           ├── route.js       # Next.js API route definitions
│           ├── controller.js  # Request/response handling
│           ├── service.js     # Backend business logic
│           └── model.js       # Data access layer
├── api-clients/               # Frontend API clients (HTTP requests)
│   ├── [feature].client.js   # Calls backend API endpoints
├── components/                # Reusable React components
│   ├── ui/                    # Base UI components
│   ├── forms/                 # Form components
│   ├── layouts/               # Layout components
│   └── business/              # Business-specific components
├── hooks/                     # Custom React hooks
│   └── [feature]/
│       └── use[Feature].js    # State management hooks
├── utilities/                 # Pure functions, helpers
│   ├── validation/
│   ├── formatting/
│   ├── constants/
│   └── types/
└── microservices/            # Independent deployable services
    └── [service-name]/
        ├── src/
        │   ├── controllers/   # HTTP controllers
        │   ├── services/      # Business logic
        │   ├── models/        # Data models
        │   └── routes/        # Express routes
        ├── package.json       # Independent deployment
        └── Dockerfile         # Container ready
```

### File Standards
- **Maximum 300 lines per file**
- **Single responsibility per file**
- **No monolithic configuration files**
- **Descriptive, searchable file names**
- **Consistent naming conventions**

### Naming Conventions
- **Frontend API Clients**: `[feature].client.js` (MUST include .client)
- **Backend Controllers**: `[feature].controller.js` (in API directories)
- **Backend Services**: `[feature].service.js` (in API directories)
- **Backend Models**: `[feature].model.js` (in API directories)
- **Components**: `[ComponentName].js` (PascalCase)
- **Hooks**: `use[HookName].js` (camelCase with 'use' prefix)
- **Utilities**: `[domain].utility.js` or `[type].formatter.js`

### Component Standards
- **Components are non-negotiable** - all UI must be componentized
- **Props must be typed/documented**
- **Components should be pure when possible**
- **Business logic belongs in backend services, not components**
- **API calls go through API clients in hooks, not directly in components**

## Architecture Patterns

### Frontend API Client Pattern
```javascript
// src/api-clients/customTicket.client.js
export class CustomTicketAPIClient {
  static async getAllTickets(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/custom-tickets?${params}`);
    if (!response.ok) throw new Error('Failed to fetch tickets');
    return await response.json();
  }
}
```

### Backend MVC Pattern
```javascript
// src/app/api/custom-tickets/route.js
import CustomTicketController from './controller.js';

export async function GET(request) {
  return await CustomTicketController.getAllTickets(request);
}

// src/app/api/custom-tickets/controller.js  
import CustomTicketService from './service.js';

export default class CustomTicketController {
  static async getAllTickets(request) {
    try {
      const { searchParams } = new URL(request.url);
      const filters = Object.fromEntries(searchParams);
      const result = await CustomTicketService.getAllTickets(filters);
      return Response.json({ success: true, data: result });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
}

// src/app/api/custom-tickets/service.js
import { getCustomTicketsAdapter } from '@/api-clients/customTicketsMicroserviceAdapter';

export default class CustomTicketService {
  static async getAllTickets(filters) {
    const adapter = getCustomTicketsAdapter();
    return await adapter.getAllTickets(filters);
  }
}
```

### Hook Pattern with API Client
```javascript
// src/hooks/custom-tickets/useCustomTickets.js
import { CustomTicketAPIClient } from '@/api-clients/customTicket.client';

export function useCustomTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadTickets = useCallback(async (filters) => {
    setLoading(true);
    try {
      const data = await CustomTicketAPIClient.getAllTickets(filters);
      setTickets(data.tickets || []);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, loadTickets };
}
```

## Code Quality Standards

### Testing Requirements
- **Unit tests for all microservices**
- **Integration tests for API routes**
- **Component tests for complex UI logic**
- **Test coverage minimum 80%**

### Error Handling
- **Consistent error response format**
- **Proper error logging**
- **User-friendly error messages**
- **Graceful degradation**

### Performance
- **Lazy loading for large components**
- **Efficient database queries**
- **Caching strategies**
- **Bundle size monitoring**

## Development Workflow

### Before Starting New Features
1. **Design the service boundaries**
2. **Write tests first (TDD)**
3. **Follow the request flow pattern**
4. **Create modular configuration**

### Code Review Checklist
- [ ] Follows request flow architecture
- [ ] Files under 300 lines
- [ ] Single responsibility principle
- [ ] Proper error handling
- [ ] Tests included
- [ ] Components properly structured
- [ ] No monolithic files

## Non-Negotiables
- **Component-first UI architecture**
- **Organized file structure**
- **No monolithic files**
- **Request flow pattern compliance**
- **Code findability guarantee**