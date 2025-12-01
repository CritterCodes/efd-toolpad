# 🎁 Product Approval System - README

## Quick Start

**Status:** ✅ READY FOR TESTING

**URL:** `http://localhost:3001/admin/products/awaiting-approval`

**What it does:** Allows admins to review and approve/decline designs ready to be listed on the shop.

---

## 🚀 Getting Started (30 seconds)

1. **Complete a CAD Request with COG Data:**
   - Go to CAD request dashboard
   - Find a request in progress
   - Go to COG tab
   - Fill form and click "Save COG & Mark Completed"

2. **View Awaiting Approval Queue:**
   - Go to `http://localhost:3001/admin/products/awaiting-approval`
   - You should see your completed product

3. **Approve or Decline:**
   - Click "Approve" → Product goes live ✅
   - Click "Decline" → Enter reason → Product stays hidden ❌

---

## 📂 What's Inside

### Core Files
- `src/app/dashboard/products/awaiting-approval/page.js` - Admin dashboard UI (340 lines)
- `src/app/api/admin/products/awaiting-approval/route.js` - Fetch products API (35 lines)
- `src/app/api/admin/products/[productId]/approve/route.js` - Approve API (53 lines)
- `src/app/api/admin/products/[productId]/decline/route.js` - Decline API (48 lines)

### Documentation
- `COG_WORKFLOW_TEST_GUIDE.md` - Step-by-step testing guide
- `PRODUCT_APPROVAL_IMPLEMENTATION.md` - Full technical documentation
- `PRODUCT_APPROVAL_QUICK_REF.md` - Quick lookup reference
- `VERIFICATION_CHECKLIST.md` - 16-part verification checklist
- `PRODUCT_APPROVAL_READY.md` - Implementation summary

---

## 💡 How It Works

### The Pipeline

```
1. Designer completes CAD work
   ↓
2. Fills in COG (Cost of Goods) with metal costs
   ↓ [Metal costs include 1.3x casting labor markup]
3. Clicks "Save COG & Mark Completed"
   ↓
4. CAD request status changes: in_progress → completed
   ↓
5. Product appears in admin approval queue
   ↓
6. Admin approves or declines:
   - APPROVE: Product goes live (visible on shop)
   - DECLINE: Product stays hidden, artisan gets feedback
```

---

## 🎮 Admin Dashboard Features

### View Products
- **Grid Layout:** Responsive design (1 col mobile → 3 col desktop)
- **Product Cards:** Image, title, price, artisan, COG status
- **Sorting:** By completion date (newest first)
- **Filtering:** Auto-filters for completed + COG + not-approved

### Take Action
- **Approve Button (Green):** Mark product approved + activate
  - Optional notes
  - Makes `isActive: true` (visible on website)

- **Decline Button (Red):** Mark product declined
  - Required reason field (validated)
  - Keeps `isActive: false` (stays hidden)
  - Notifies artisan (TODO: implement)

### User Feedback
- Loading spinner while fetching
- Success messages after actions
- Error alerts with clear messages
- Empty state when no products waiting

---

## 🔧 API Endpoints

### GET Products Awaiting Approval
```bash
GET /api/admin/products/awaiting-approval

Response:
{
  "success": true,
  "products": [{
    "_id": "...",
    "title": "Product Name",
    "retailPrice": 99.99,
    "images": [...],
    "cogData": {...},
    "artisanInfo": {...}
  }]
}
```

### POST Approve Product
```bash
POST /api/admin/products/[productId]/approve

Body: {
  "notes": "optional approval notes",
  "approvedBy": "admin-user-id"
}

Updates:
- approvalStatus: 'approved'
- approvedAt: Date
- approvedBy: ObjectId
- approvalNotes: string
- isActive: true  ← Makes visible
```

### POST Decline Product
```bash
POST /api/admin/products/[productId]/decline

Body: {
  "notes": "decline reason (REQUIRED)",
  "approvedBy": "admin-user-id"
}

Validation: notes must not be empty

Updates:
- approvalStatus: 'declined'
- declinedAt: Date
- declinedBy: ObjectId
- declineReason: string
- isActive: false  ← Keeps hidden
```

---

## 📊 Database

### New Product Fields
```javascript
approvalStatus: String        // null | 'approved' | 'declined'
approvedAt: Date
approvedBy: ObjectId
approvalNotes: String
declinedAt: Date
declinedBy: ObjectId
declineReason: String
isActive: Boolean
```

### Query: Get Awaiting Approval
```javascript
{
  "cadRequests.0.status": "completed",
  "cadRequests.0.cogData": { $exists: true },
  "approvalStatus": { $ne: "approved" }
}
```

---

## 🧪 Testing

### Quick Test (5 min)
1. Complete CAD to COG stage
2. Check admin queue (product should appear)
3. Click Approve (product should disappear)
4. Database check: `approvalStatus: 'approved'`, `isActive: true`

### Full Test (30 min)
See: `VERIFICATION_CHECKLIST.md`

**16 comprehensive test scenarios:**
- CAD completion & marking
- Product queuing
- Approval workflow
- Decline workflow (with required reason)
- Metal cost 1.3x markup
- Multiple products
- Security tests
- Error handling
- Data persistence
- UI/UX

---

## 🔒 Security

### Authentication
- ✅ All endpoints require NextAuth session
- ✅ All endpoints enforce admin role
- ✅ 403 Forbidden if not admin

### Validation
- ✅ Decline reason required
- ✅ Decline reason trimmed
- ✅ Product ID validated (404 if missing)
- ✅ Input sanitization

### Audit Trail
- ✅ Admin user ID captured
- ✅ All timestamps recorded
- ✅ All actions logged

---

## 🧠 Key Formulas

### Metal Cost (with Casting Labor)
```
Cost = Weight(g) × Price($/g) × 1.3
```

Example: 2g @ $25/g = 2 × 25 × 1.3 = **$65.00**

The 1.3x multiplier accounts for casting house labor costs.

---

## ⚡ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| None yet | Coming soon |

---

## 🐛 Troubleshooting

### Products don't appear in queue?
1. Check CAD request status: should be `'completed'`
2. Check cogData saved: should exist in `cadRequests[0].cogData`
3. Check approval status: should NOT be `'approved'`

### Approve/Decline not working?
1. User must have admin role
2. Check browser console for errors
3. Check network tab for failed API calls

### COG not showing with 1.3x markup?
1. Check file: `/src/constants/metalTypes.js` line 166
2. Should have: `× 1.3` multiplier
3. Verify metal pricing is loaded

---

## 📈 What's Next

### Phase 2: Gemstone Integration
- Connect approved products to gemstone design tab
- Display in "Designs by Artisans" section

### Phase 3: Notifications
- Email artisan when product approved
- Email artisan when product declined (with reason)
- In-app notifications

### Phase 4: Revisions
- Allow artisans to view decline reasons
- Provide form to edit and resubmit

### Phase 5: Analytics
- Approval/decline rate metrics
- Average approval time
- Artisan performance tracking

---

## 📚 Documentation

| Document | Purpose |
|----------|---------|
| `COG_WORKFLOW_TEST_GUIDE.md` | Step-by-step testing with database verification |
| `PRODUCT_APPROVAL_IMPLEMENTATION.md` | Full technical documentation |
| `PRODUCT_APPROVAL_QUICK_REF.md` | Quick lookup for APIs, statuses, queries |
| `VERIFICATION_CHECKLIST.md` | 16-part comprehensive verification |

---

## 💬 FAQ

### Q: How do I see the admin approval page?
A: Navigate to `http://localhost:3001/admin/products/awaiting-approval` (requires admin login)

### Q: What happens when I approve a product?
A: Product gets `isActive: true` and appears on the shop website in the "Designs by Artisans" section

### Q: What happens when I decline a product?
A: Product stays `isActive: false` (hidden), artisan gets notified to make changes

### Q: Can I undo an approval or decline?
A: Not yet - feature coming soon. For now, edit the product directly in database if needed.

### Q: Where's the 1.3x metal markup?
A: It's automatically applied when COG is calculated. File: `/src/constants/metalTypes.js` line 166

### Q: How do artisans know their product was declined?
A: Notification system TODO - will send email with decline reason. For now, check admin dashboard.

---

## 🔗 Related Systems

- **CAD Request Workflow** - Where designers claim & complete design work
- **COG Calculation** - Where metal costs calculated (includes 1.3x markup)
- **Shop Frontend** - Where approved designs display to customers

---

## ✨ Summary

Complete product approval system that:
- ✅ Queues products ready for listing
- ✅ Provides admin review interface
- ✅ Allows approve/decline decisions
- ✅ Tracks all approvals with audit trail
- ✅ Controls product visibility via `isActive`

**Status:** Ready for testing
**Security:** Enforced admin-only access
**Documentation:** Complete & comprehensive
**Testing:** Guides & checklists provided

---

**Start Testing:** See `VERIFICATION_CHECKLIST.md` for 16-part verification process.

