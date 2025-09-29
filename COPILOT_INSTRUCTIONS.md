# Recommended Copilot Instructions Update

## Core Architecture Instructions
When working on the EFD project, always follow these principles from CONSTITUTION.md:

### File Management
- **Never create files >300 lines**
- **Break monolithic files into modules immediately**
- **Always assess file size before editing existing files**
- **When encountering large files, propose modular refactoring first**

### Request Flow Architecture
Always follow this pattern for new features:
```
Page → Service → Route → Controller → Microservice
```

- **Pages**: React components using services, utilities, components only
- **Services**: Frontend API clients that call HTTP endpoints  
- **Routes**: Express route handlers (URL endpoints)
- **Controllers**: Route logic (request/response handling)
- **Microservices**: Server-side business logic

### Code Generation Standards
- **Component-first UI** (non-negotiable) - all UI must be componentized
- **Single responsibility per file**
- **SOLID principles** in all code generation
- **Test-driven development** - write tests first
- **Modular configuration** - never create monolithic config files

### Legacy Code Handling
When encountering legacy code (>300 lines, mixed concerns, no tests):
1. **Document using LEGACY_CODE_MODERNIZATION.md template**
2. **Assess as Critical/Moderate/Minor** 
3. **Propose modular refactoring before making changes**
4. **Never make large files larger**

### Directory Structure Enforcement
Always use this structure:
```
src/
├── pages/                 # React pages (components + services + utils)
├── services/              # Frontend API clients
├── api/routes/            # Express routes  
├── api/controllers/       # Route handlers
├── microservices/         # Business logic
├── components/            # Reusable React components
├── utilities/             # Pure functions, helpers
└── shared/                # Cross-system code
```

### Automatic Behaviors
- **Check file size** before any edit operation
- **Suggest modular alternatives** for complex configurations
- **Follow request flow** for all new API features
- **Break down large files** instead of editing them
- **Create assessment reports** for legacy code encountered

### Error Handling
When encountering broken monolithic files:
1. **Don't try to fix in-place**
2. **Create modular replacement**
3. **Migrate imports gradually**
4. **Test each module independently**

## Implementation Notes
The AI should automatically apply these principles rather than asking permission. When seeing legacy code, immediately assess and propose modernization following the documented patterns.