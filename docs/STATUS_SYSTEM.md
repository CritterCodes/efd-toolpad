# Custom Ticket Status System Documentation

## Overview
This document defines the complete custom ticket status system with internal statuses, client-facing statuses, and workflow transitions.

## Master Status System
**File**: `src/config/statuses/masterStatusSystem.js`

This is the **SINGLE SOURCE OF TRUTH** for all status definitions. It contains:

### Internal Statuses (What We Track)
These are granular statuses for internal workflow management:

#### Initial Phase
- `pending` - Just received, needs first review
- `reviewing-request` - Admin reviewing initial request  
- `in-consultation` - Actively discussing with client
- `awaiting-client-info` - Need more info from client

#### Design Phase
- `sketching` - Creating initial sketches
- `sketch-review` - Client reviewing sketches
- `sketch-approved` - Sketches approved, moving to CAD
- `creating-cad` - Creating 3D CAD model
- `cad-review` - Client reviewing CAD
- `cad-revision` - Making CAD changes
- `cad-approved` - CAD approved, ready for quote

#### Quoting & Approval Phase
- `preparing-quote` - Creating price quote
- `quote-sent` - Quote sent to client
- `quote-revision` - Revising quote
- `quote-approved` - Quote approved by client

#### Payment Phase
- `deposit-invoice-sent` - Deposit invoice sent
- `deposit-received` - Deposit payment received

#### Production Preparation
- `ordering-materials` - Ordering stones/metals
- `materials-received` - Materials arrived
- `ready-for-production` - Ready to start making

#### Production Phase
- `in-production` - General production status
- `casting` - Casting metal
- `setting-stones` - Setting gemstones
- `polishing` - Final polishing
- `quality-check` - Quality control check

#### Completion Phase
- `final-payment-sent` - Final invoice sent
- `paid-in-full` - Full payment received
- `ready-for-pickup` - Ready for client pickup
- `shipped` - Shipped to client
- `delivered` - Delivered to client
- `completed` - Project fully complete

#### Special Statuses
- `on-hold` - Project paused
- `cancelled` - Project cancelled
- `refunded` - Refund processed

### Client-Facing Statuses (What Clients See)
These are simplified, customer-friendly statuses:

- `pending-review` - Your request is being reviewed
- `in-consultation` - We are discussing your project
- `awaiting-your-response` - We need your input to continue
- `in-design` - We are creating your design
- `quote-pending` - We are preparing your quote
- `payment-pending` - Payment required to continue
- `in-production` - Your piece is being created
- `ready-for-delivery` - Your piece is ready!
- `completed` - Project complete!
- `on-hold` - Project temporarily paused
- `cancelled` - Project cancelled

### Workflow Transitions
The system defines valid status transitions. For example:

From `in-consultation`, you can transition to:
- `awaiting-client-info`
- `sketching`
- `preparing-quote`
- `on-hold`
- `cancelled`

## Usage

### Import the Status Manager
```javascript
import { CustomTicketStatusManager } from '@/config/statuses/masterStatusSystem';
```

### Common Operations
```javascript
// Get display info for a status
const statusInfo = CustomTicketStatusManager.getDisplayInfo('in-consultation');

// Convert internal to client status
const clientStatus = CustomTicketStatusManager.getClientStatus('in-consultation');

// Get possible next statuses
const nextStatuses = CustomTicketStatusManager.getNextPossibleStatuses('in-consultation');

// Check if transition is valid
const isValid = CustomTicketStatusManager.isValidTransition('in-consultation', 'sketching');
```

### Backwards Compatibility
The system maintains backwards compatibility through `src/config/statuses/index.js` which exports the same functions as before but uses the master status system internally.

## Visual Status Timeline
The status system includes a visual timeline component (`CustomTicketStatusTimeline.js`) that shows progress through workflow stages:

1. **Initial Review** - Getting started
2. **Design Process** - Creating the design
3. **Quote & Approval** - Pricing and approval
4. **Payment Processing** - Handling payments
5. **Production** - Making the piece
6. **Completion** - Delivery and completion

## Key Features
- **Single Source of Truth**: All status definitions in one place
- **Workflow Validation**: Only valid transitions are allowed
- **Client-Friendly Display**: Internal statuses map to customer-friendly labels
- **Visual Timeline**: Progress tracking with bubbles/timeline
- **Metadata Rich**: Each status has label, description, color, icon, category
- **Action Tracking**: Some statuses are marked as requiring action

## Maintenance
When adding new statuses:
1. Add to `INTERNAL_STATUSES` in `masterStatusSystem.js`
2. Add display info to `STATUS_DISPLAY_INFO`
3. Add client mapping to `INTERNAL_TO_CLIENT_MAPPING`
4. Add workflow transitions to `VALID_TRANSITIONS`
5. Update timeline workflow steps if needed

This ensures the status system remains consistent and comprehensive.