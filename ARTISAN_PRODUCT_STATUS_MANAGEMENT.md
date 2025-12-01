# Artisan Product Status Management

## Overview

Artisans now have a dedicated **Publishing Status** section in the product detail modal that displays contextual options based on the product's current status.

## Status Management Workflows

### Draft Status
When a product is in **Draft** status, artisans can:
- **Submit for Review** - Submit the draft to admins for approval
- **Edit Product** - Make changes to the product details
- **Delete** - Remove the draft product

**Location**: My Products → Click product → Publishing Status section

### Pending Approval Status
When a product is **Pending Approval**:
- Displays message: "⏳ Your product is pending admin review. Check back soon!"
- No actions available
- Admin will review and either approve or request revision

### Approved Status
When a product is **Approved**:
- Displays message: "✅ Your product has been approved and is ready to publish."
- No actions available
- Admin can publish or artisan waits for admin to publish

### Published Status
When a product is **Published** (Live):
- **Status Dropdown** menu with options:
  - `Published (Live)` - Current status
  - `Move to Draft` - Unpublish and return to draft
  - `Archive Product` - Archive for later

**Use case**: Artisan can temporarily unpublish (move to draft) if they need to make changes, or archive if they want to discontinue but not delete.

### Revision Requested Status
When admin requests **Revision**:
- **Resubmit with Changes** button to resubmit after edits
- **Edit Product** button to modify details
- **Delete** button to remove

**Flow**: Artisan edits → Clicks "Edit Product" → Makes changes → Saves → Resubmits

### Rejected Status
When a product is **Rejected**:
- Displays message: "❌ Your product was not approved. You can delete it or contact support for details."
- **Delete** button to remove rejected product
- Cannot resubmit rejected products

### Archived Status
When a product is **Archived**:
- Displays message: "📦 This product is archived. You can republish it by moving back to draft."
- **Status Dropdown** to move back to draft and republish

**Use case**: Bring back archived products by moving to draft

## Status Flow Diagram

```
[Draft] --submit--> [Pending Approval] --approve--> [Approved]
  ^                      |
  |                      v
  +----edit---------- [Revision Requested]
  |                      |
  |                      v
  +--no changes needed-- [Rejected]

[Published] --unpublish--> [Draft]
    |
    +-- archive --> [Archived]

[Archived] --move to draft--> [Draft]
```

## API Endpoints Used

**Submit Draft**
```
POST /api/products/{id}/submit
Response: {success: true, product: {...}}
```

**Unpublish Product**
```
POST /api/products/{id}/unpublish
Body: {targetStatus: 'draft'|'archived'}
Response: {success: true, product: {...}}
```

**Resubmit After Revision**
```
POST /api/artisan/products/{id}/resubmit
Response: {success: true, product: {...}}
```

## UI Components

### Status Badge Colors
- **Draft**: Gray (#94a3b8)
- **Pending Approval**: Yellow (#eab308)
- **Approved**: Green (#22c55e)
- **Published**: Blue (#0ea5e9)
- **Revision Requested**: Orange (#f97316)
- **Rejected**: Red (#ef4444)
- **Archived**: Dark Gray (#6b7280)

### Publishing Status Section
- Located below product revision notes (if any)
- Shows appropriate actions based on status
- Status dropdown for draft/published/archived states
- Contextual messages for in-progress states

## Removed Features

- **Edit Button on Published Products**: Previously showed a 404. Now artisans must unpublish first before editing.
- **Generic Edit Endpoint**: Products are now edited via:
  - Draft: Edit during creation/revision
  - Published: Must unpublish to draft first, then edit

## User Experience Improvements

1. **Clear Status Messages**: Tells artisan what's happening with their product
2. **Contextual Actions**: Only shows relevant buttons for current status
3. **One-Click Unpublishing**: Dropdown menu to manage published state
4. **No 404 Errors**: All links now point to valid endpoints
5. **Better Workflow**: Encourages proper submission flow

## Testing Checklist

- [ ] Create draft product and submit for review
- [ ] Verify "Pending Approval" status shows message
- [ ] Admin approves product (if you have access)
- [ ] Verify "Approved" status shows message
- [ ] Admin publishes product (if you have access)
- [ ] Click published product and move to draft
- [ ] Verify product returns to draft status
- [ ] Move published product to archived
- [ ] Move archived product back to draft
- [ ] Test revision workflow (request revision, then resubmit)

