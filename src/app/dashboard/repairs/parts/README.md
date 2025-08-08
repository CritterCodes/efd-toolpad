# Parts Management Module

A modular parts management system for repair workflows with Stuller SKU integration and enhanced material tracking.

## Features

### 🏷️ Status-Based Workflow
- **Needs Parts Tab**: Repairs waiting for parts to be ordered
- **Parts Ordered Tab**: Repairs with parts ordered, waiting for arrival
- Clear visual distinction between statuses

### 🔍 Stuller Integration
- SKU lookup with automatic pricing
- Real-time part information retrieval
- Manual material entry option

### 💰 Flexible Pricing
- Stuller automatic pricing
- Manual price entry
- Cost + Markup calculation
- Multiple pricing methods

### 📊 Enhanced Tracking
- Material type categorization
- Supplier tracking
- Quantity management
- Visual pending changes indicators

## Module Structure

```
/dashboard/repairs/parts/
├── page.js                           # Main parts management page
├── constants.js                      # Status constants and configurations
├── components/
│   ├── PartsStatusTabs.js           # Status tab navigation
│   ├── PartsSearchBar.js            # Search functionality
│   ├── RepairCard.js                # Individual repair display
│   ├── RepairsList.js               # Repairs grid layout
│   └── AddMaterialModal.js          # Material addition/editing modal
├── hooks/
│   └── usePartsManagement.js        # State management hook
└── utils/
    └── partsUtils.js                # Business logic utilities
```

## Components

### PartsStatusTabs
- Tab navigation between "Needs Parts" and "Parts Ordered"
- Context-aware descriptions
- Full-width layout

### RepairCard
- Rich repair information display
- Material/parts listing with pricing
- Action menu (Add Material, Mark Parts Ordered, Mark Ready for Work)
- Visual indicators for unsaved changes
- Rush order highlighting

### AddMaterialModal
- Stuller SKU lookup with automatic population
- Manual material entry
- Flexible pricing options
- Material type categorization
- Cost and markup calculations

### PartsSearchBar
- Real-time search filtering
- Context-aware placeholder text
- Search by client name, description, or repair ID

## State Management

The `usePartsManagement` hook centralizes:
- Active tab selection
- Search query state
- Pending materials tracking
- Modal state management
- Snackbar notifications
- Form state

## Business Logic

### Status Updates
- Automatic metadata tracking
- Timestamp recording
- User attribution
- Local and server state synchronization

### Material Management
- SKU-based deduplication
- Pending changes tracking
- Batch save operations
- Error handling and rollback

### Search and Filtering
- Multi-field search capability
- Status-based filtering
- Real-time results

## Usage

```javascript
import PartsPage from './page';

// The page handles all state management and user interactions
// Components are fully modular and reusable
```

## API Integration

### Stuller Lookup
- `/api/stuller/lookup?sku=${sku}` - Retrieves part information
- Auto-populates name, pricing, and descriptions
- Error handling for invalid SKUs

### Repair Status Updates
- Uses existing RepairsService.moveRepairStatus
- Tracks status change metadata
- Updates local state optimistically

### Material Persistence
- Batch material saving
- Individual repair material updates
- Conflict resolution and merging

## Styling and UX

- Material-UI consistent design
- Responsive grid layout
- Visual feedback for pending changes
- Error states and loading indicators
- Accessibility considerations

This modular structure provides a complete parts management solution that integrates seamlessly with your existing repair workflow while offering enhanced functionality for material tracking and Stuller integration.
