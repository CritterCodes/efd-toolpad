# Legacy Code Modernization Plan

## Overview
This document provides a structured approach for identifying, documenting, and modernizing legacy code that doesn't meet our current architectural standards.

## Legacy Code Identification Criteria

### 🔴 Critical Issues (Immediate Refactoring Required)
- **Monolithic files** (>300 lines)
- **Mixed concerns** (UI logic with business logic)
- **No test coverage**
- **Direct database calls from components**
- **Hardcoded configuration**

### 🟡 Moderate Issues (Planned Refactoring)
- **Files 200-300 lines** (watch for growth)
- **Inconsistent error handling**
- **Missing TypeScript/prop validation**
- **Outdated patterns**
- **Poor performance characteristics**

### 🟢 Minor Issues (Opportunistic Improvements)
- **Naming inconsistencies**
- **Missing documentation**
- **Outdated dependencies**
- **Code style variations**

## Documentation Template

### Legacy Code Assessment Report
```markdown
# Legacy Code Assessment: [File/Feature Name]

## File Information
- **Path**: `src/path/to/file.js`
- **Lines of Code**: XXX
- **Last Modified**: YYYY-MM-DD
- **Current Maintainer**: [Name]

## Issues Identified
### Critical (🔴)
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### Moderate (🟡)  
- [ ] Issue 1: Description
- [ ] Issue 2: Description

### Minor (🟢)
- [ ] Issue 1: Description

## Current Functionality
- Purpose: [What this code does]
- Dependencies: [What depends on this code]
- External Integrations: [APIs, databases, etc.]

## Modernization Plan
### Phase 1: Immediate (Critical Issues)
- [ ] Task 1: Break into modules
- [ ] Task 2: Extract business logic
- [ ] Task 3: Add basic tests
- **Estimated Effort**: X hours
- **Risk Level**: High/Medium/Low

### Phase 2: Planned (Moderate Issues)
- [ ] Task 1: Improve error handling
- [ ] Task 2: Add type safety
- **Estimated Effort**: X hours

### Phase 3: Future (Minor Issues)
- [ ] Task 1: Update documentation
- [ ] Task 2: Refactor naming

## Migration Strategy
### Breaking Changes
- [ ] API changes required: Yes/No
- [ ] Database schema changes: Yes/No
- [ ] Component interface changes: Yes/No

### Rollback Plan
- [ ] Feature flags in place
- [ ] Database migration rollback
- [ ] Component backward compatibility

## Testing Strategy
- [ ] Unit tests for extracted services
- [ ] Integration tests for API changes  
- [ ] Component tests for UI changes
- [ ] End-to-end tests for critical paths

## Success Criteria
- [ ] File size under 300 lines
- [ ] Follows request flow pattern
- [ ] Test coverage >80%
- [ ] No direct database calls from UI
- [ ] Proper error handling
```

## Modernization Workflow

### Step 1: Inventory and Assess
1. **Scan codebase** for files >300 lines
2. **Create assessment reports** for each legacy component
3. **Prioritize by impact and effort**
4. **Create GitHub issues** for tracking

### Step 2: Plan Modernization Sprints
1. **Group related legacy code** together
2. **Plan dependencies** and order of refactoring
3. **Allocate time** in sprint planning
4. **Set measurable goals**

### Step 3: Execute Modernization
1. **Create feature branch** for refactoring
2. **Write tests first** for existing functionality
3. **Extract and modularize** step by step
4. **Validate functionality** at each step
5. **Update documentation**

### Step 4: Validate and Deploy
1. **Run full test suite**
2. **Performance benchmarking**
3. **Code review** against constitution
4. **Gradual rollout** with monitoring

## Refactoring Patterns

### Pattern 1: Monolithic Configuration
**Before**: Single 500+ line config file
**After**: Modular configuration
```
src/config/
├── statuses/
│   ├── internal-statuses.js
│   ├── client-mappings.js
│   ├── categories.js
│   └── index.js
```

### Pattern 2: Mixed Concerns Page
**Before**: Page with API calls, business logic, UI
**After**: Separated concerns
```
src/pages/tickets/
├── page.js              # UI only
├── services/
│   └── tickets.service.js   # API calls
└── components/
    └── TicketForm.js    # Reusable component
```

### Pattern 3: Direct Database Access
**Before**: Component → Database
**After**: Component → Service → Route → Controller → Microservice → Database

## Maintenance Guidelines

### Preventing Legacy Code
- **Code reviews** check file size and patterns
- **Automated linting** rules for complexity
- **Regular architecture reviews**
- **Documentation as code**

### Monitoring Technical Debt
- **File size tracking** in CI/CD
- **Test coverage monitoring**
- **Performance regression testing**
- **Architecture decision records**

## Templates and Tools

### GitHub Issue Template: Legacy Code Refactoring
```markdown
# Legacy Code Refactoring: [Component Name]

## Assessment
- **File Size**: XXX lines
- **Issues**: List critical issues
- **Priority**: High/Medium/Low

## Acceptance Criteria
- [ ] File under 300 lines
- [ ] Follows request flow pattern
- [ ] Test coverage >80%
- [ ] No breaking changes

## Implementation Plan
- [ ] Phase 1: [Description]
- [ ] Phase 2: [Description]

**Estimated Effort**: X hours
```

### Pre-commit Hook Example
```javascript
// Check file size before commit
if (fileLines > 300) {
  console.warn(`Warning: ${file} exceeds 300 lines`);
  // Add to legacy code tracking
}
```

This systematic approach ensures legacy code is properly documented, planned for modernization, and gradually brought up to our architectural standards.