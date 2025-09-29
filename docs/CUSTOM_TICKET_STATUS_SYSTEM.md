# Custom Ticket Status Workflow System

This document explains the enhanced status system for custom tickets, which provides detailed internal workflow tracking while maintaining client-friendly communications.

## 🎯 **System Overview**

The new status system operates on two levels:

1. **Internal Statuses**: Detailed workflow steps for team members
2. **Client-Facing Statuses**: Simplified, customer-friendly descriptions

## 📊 **Status Categories**

### **1. Initial Review** (Warning/Yellow)
- `pending` - New ticket awaiting initial review
- `needs-quote` - Requires pricing and quote preparation
- `quote-sent` - Quote sent to client, awaiting response

### **2. Client Approval** (Info/Blue)
- `awaiting-approval` - Waiting for client approval to proceed
- `deposit-required` - Waiting for deposit payment
- `updated-by-client` - Client made changes, needs review
- `waiting-for-client` - Waiting for client response or action

### **3. Preparation** (Secondary/Gray)
- `deposit-received` - Deposit paid, ready to begin work
- `gathering-materials` - Sourcing required materials
- `needs-parts` - Waiting for parts to be ordered
- `parts-ordered` - Parts ordered, waiting for delivery

### **4. Design Phase** (Primary/Blue)
- `in-cad` - Design being created in CAD software
- `cad-review` - CAD design ready for client review
- `cad-approved` - Design approved, ready for production
- `cad-revision` - Design needs revisions based on feedback

### **5. Production** (Primary/Blue)
- `ready-for-work` - All preparations complete, ready to start production
- `in-production` - Piece is being crafted
- `casting` - Metal casting in progress
- `setting-stones` - Stones being set in the piece
- `finishing` - Final polishing and finishing touches

### **6. Completion** (Success/Green)
- `quality-control` - Final quality inspection
- `qc-failed` - Quality issues found, returning to production
- `ready-for-pickup` - Piece completed and ready for customer
- `completed` - Customer has received their piece

### **7. Special Status** (Secondary/Gray or Error/Red)
- `on-hold` - Project temporarily paused
- `cancelled` - Project has been cancelled

## 🔄 **Client View Mapping**

Internal statuses are automatically mapped to client-friendly descriptions:

| Internal Status | Client Sees | Description |
|----------------|-------------|-------------|
| `pending`, `needs-quote`, `quote-sent` | **Pending Review** | "We're reviewing your request and will get back to you soon" |
| `awaiting-approval`, `deposit-required`, `updated-by-client`, `waiting-for-client`, `cad-review`, `cad-revision` | **Awaiting Your Response** | "We need your input to continue with your project" |
| `deposit-received`, `gathering-materials`, `needs-parts`, `parts-ordered`, `in-cad`, `cad-approved`, `ready-for-work`, `in-production`, `casting`, `setting-stones`, `finishing`, `quality-control`, `qc-failed` | **In Progress** | "Your custom piece is being crafted with care" |
| `ready-for-pickup` | **Ready for Pickup** | "Your custom piece is ready! Please arrange pickup" |
| `completed` | **Completed** | "Project completed successfully" |
| `on-hold` | **On Hold** | "Project temporarily paused" |
| `cancelled` | **Cancelled** | "Project has been cancelled" |

## 🛠 **Workflow Rules**

### **Status Transitions**
The system enforces logical workflow transitions. For example:
- `pending` → can go to `needs-quote`, `deposit-required`, or `in-cad`
- `in-cad` → must go to `cad-review` next
- `quality-control` → can go to `ready-for-pickup` or `qc-failed`

### **Action Requirements**
Some statuses require immediate action:
- ✅ `requiresAction: true` - Status needs attention from team
- ⏳ `requiresAction: false` - Status is waiting/passive

### **Visibility Levels**
- `internalOnly: true` - Only visible to admin users (like `needs-parts`, `parts-ordered`)
- `internalOnly: false` - Can be communicated to clients (like `in-cad`, `ready-for-pickup`)

## 💡 **Usage Examples**

### **Typical Workflow Path**
1. `pending` - New request comes in
2. `needs-quote` - Team reviews, needs to price
3. `quote-sent` - Quote sent to client
4. `deposit-required` - Quote approved, need payment
5. `deposit-received` - Payment received
6. `in-cad` - Designer starts creating
7. `cad-review` - Design sent to client
8. `cad-approved` - Client approves design
9. `gathering-materials` - Sourcing materials
10. `ready-for-work` - Everything ready
11. `in-production` - Crafting begins
12. `finishing` - Final touches
13. `quality-control` - QC inspection
14. `ready-for-pickup` - Ready for customer
15. `completed` - Customer received piece

### **Admin Interface**
- Status dropdown shows all internal statuses grouped by category
- Each status shows both internal name and client-facing equivalent
- Invalid transitions are disabled to maintain workflow integrity
- Status history tracks all changes with timestamps

### **Client Portal**
- Clients only see the friendly status names
- Status descriptions are encouraging and informative
- Some statuses allow client actions (like providing feedback)
- Progress indicators show general workflow stage

## 🔧 **Implementation Details**

### **Configuration File**
Located at: `src/config/customTicketStatuses.js`

### **Key Functions**
- `getClientStatus(internalStatus)` - Get client-facing status
- `getInternalStatusInfo(status)` - Get internal status details
- `getNextPossibleStatuses(currentStatus)` - Get valid next statuses
- `isStatusTransitionAllowed(from, to)` - Validate transitions

### **UI Components**
- Enhanced status dropdowns with workflow validation
- Dual status display (internal + client view)
- Category-grouped status filters
- Workflow progression indicators

## 📈 **Benefits**

1. **For Team**: Detailed workflow tracking, better process management
2. **For Clients**: Clear, encouraging communication without confusing details
3. **For Business**: Better analytics, clearer handoffs, improved customer experience
4. **For System**: Enforced workflows, data consistency, audit trails

## 🚀 **Future Enhancements**

- Automated status transitions based on actions
- Email templates specific to each status change
- Time tracking per status
- SLA monitoring and alerts
- Integration with production scheduling systems