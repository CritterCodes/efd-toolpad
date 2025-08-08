# Move Repairs Module Structure

This module has been refactored into a modular architecture for better maintainability and reusability.

## File Structure

```
/dashboard/repairs/move/
├── page.js                    # Main page component
├── constants.js               # Status constants and configurations
├── components/
│   ├── StatusSelector.js      # Status dropdown with descriptions
│   ├── AssignedPersonField.js # Context-aware person assignment field
│   ├── RepairInput.js         # Repair ID input with enter support
│   ├── RepairList.js          # List of repairs with details
│   └── MoveSummary.js         # Move confirmation summary
├── hooks/
│   └── useMoveRepairs.js      # Custom hook for state management
└── utils/
    └── repairUtils.js         # Business logic and API utilities
```

## Module Components

### Constants (`constants.js`)
- **REPAIR_STATUSES**: Array of available repair statuses
- **STATUS_DESCRIPTIONS**: Human-readable descriptions for each status
- **TRACKABLE_STATUSES**: Statuses that require person assignment
- **STATUS_FIELD_LABELS**: Context-specific labels for person fields
- **STATUS_HELP_TEXT**: Help text for each status type

### Components
- **StatusSelector**: Autocomplete dropdown with status descriptions
- **AssignedPersonField**: Conditional field that shows appropriate labels based on status
- **RepairInput**: Text field with enter key support for adding repairs
- **RepairList**: Displays repair details with rush indicators and due dates
- **MoveSummary**: Shows move confirmation with status description

### Custom Hook (`useMoveRepairs.js`)
Manages all component state including:
- Form state (location, repairIDs, assignedPerson)
- UI state (snackbar messages)
- Actions (add/remove repairs, form clearing, notifications)

### Utilities (`repairUtils.js`)
- **createStatusMetadata**: Generates status-specific metadata for API calls
- **updateRepairWithMetadata**: Updates repair objects with status-specific fields
- **moveRepairsToStatus**: Handles API calls for moving repairs

## Benefits of Modular Architecture

1. **Reusability**: Components can be used in other parts of the application
2. **Maintainability**: Each module has a single responsibility
3. **Testability**: Individual components and utilities can be tested in isolation
4. **Readability**: Main page component is clean and focused on layout
5. **Scalability**: Easy to add new features or modify existing ones

## Usage

The main page component now simply imports and orchestrates the modules:

```javascript
import { useMoveRepairs } from "./hooks/useMoveRepairs";
import StatusSelector from "./components/StatusSelector";
import RepairList from "./components/RepairList";
// ... other imports
```

This modular approach makes the codebase more maintainable and allows for easy testing and reuse of individual components.
