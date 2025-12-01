# 🧪 COG Workflow & Product Approval Testing Guide

## End-to-End Testing Checklist

### Phase 1: Save COG & Mark CAD Completed

**Prerequisites:**
- Have an active CAD request in `in_progress` status
- Designer has claimed the request
- STL file is uploaded and approved

**Steps:**
1. Go to CAD request detail page (efd-admin dashboard)
2. Click the "COG" tab
3. Fill in the COG configuration:
   - Select material type (e.g., Gold 14K)
   - Select wax type (e.g., Blue)
   - Enter weight value
4. Verify metal cost displays with 1.3x markup:
   - Example: If metal weight = 2g and price = $25/g
   - Should show: 2 × 25 × 1.3 = **$65.00**
5. Click "Save COG & Mark Completed" button
6. Verify success message: ✅ Saved & Completed!
7. **Database Check:**
   ```bash
   # Check MongoDB:
   db.products.findOne({_id: ObjectId("...")}, {cadRequests: 1})
   
   # Should show:
   {
     cadRequests: [{
       status: "completed",     // ✅ Changed from "in_progress"
       completedAt: ISODate,    // ✅ Now set
       cogData: { ... },        // ✅ Saved
       selectedMetals: {...},
       metalPrices: {...}
     }]
   }
   ```

---

### Phase 2: Verify Product Appears in Admin Approval Queue

**Steps:**
1. Go to Admin Dashboard → "Products Awaiting Approval"
   - URL: `http://localhost:3001/admin/products/awaiting-approval`
2. Verify the product card displays:
   - ✅ Product image
   - ✅ Product title/description
   - ✅ Retail price
   - ✅ Artisan information
   - ✅ Design status chip
   - ✅ "COG Configured - Yes" badge (green)
3. Verify approval buttons are visible:
   - ✅ Green "Approve" button
   - ✅ Red "Decline" button

**Expected Query Result:**
```javascript
// API call: GET /api/admin/products/awaiting-approval
{
  success: true,
  products: [
    {
      _id: "...",
      title: "Product Name",
      cogData: { /* filled */ },
      approvalStatus: null,  // or not 'approved'
      cadRequests: [{
        status: "completed",
        completedAt: ISODate
      }]
    }
  ]
}
```

---

### Phase 3: Test Product Approval

**Approve Flow:**
1. Click "Approve" button on product card
2. Dialog opens with title "✅ Approve Product"
3. Optional: Add notes in text field
4. Click "Approve" button in dialog
5. **Verify Success:**
   - Dialog closes
   - Product list refreshes
   - Product disappears from awaiting-approval list (no longer matches query)
6. **Database Check:**
   ```bash
   db.products.findOne({_id: ObjectId("...")})
   
   # Should show:
   {
     approvalStatus: "approved",    // ✅ Set
     approvedAt: ISODate,           // ✅ Set
     approvedBy: ObjectId("..."),   // ✅ Set to admin user
     approvalNotes: "notes...",     // ✅ Optional, but captured
     isActive: true                 // ✅ Product now visible
   }
   ```

---

### Phase 4: Test Product Decline

**Decline Flow:**
1. Create another CAD request to completion (repeat Phase 1)
2. Verify it appears in awaiting-approval list
3. Click "Decline" button
4. Dialog opens with title "❌ Decline Product"
5. **Required:** Enter decline reason in text field
   - Button disabled if empty
6. Click "Decline" button in dialog
7. **Verify Success:**
   - Dialog closes
   - Product list refreshes
   - Product disappears from list
   - Success message shows: "Product declined. Artisan has been notified."
8. **Database Check:**
   ```bash
   db.products.findOne({_id: ObjectId("...")})
   
   # Should show:
   {
     approvalStatus: "declined",    // ✅ Set
     declinedAt: ISODate,           // ✅ Set
     declinedBy: ObjectId("..."),   // ✅ Admin user
     declineReason: "Your reason...",  // ✅ Captured
     isActive: false                // ✅ Product stays hidden
   }
   ```

---

### Phase 5: Verify Completed Products are Listed

**When product is approved (isActive: true):**
1. Go to shop frontend → gemstone detail page
2. Look for "Designs by Artisans" section (or similar)
3. **Expected:** Approved product should display with:
   - ✅ Product image
   - ✅ Artisan name
   - ✅ Price
   - ✅ "View Details" or "Add to Cart" button

**Note:** This requires gemstone design tab implementation (Phase 6)

---

## 🔍 What Each Endpoint Does

### 1. `/api/admin/products/awaiting-approval` (GET)
**Query Logic:**
```javascript
Find products where:
- cadRequests.status === 'completed'
- cadRequests.cogData exists
- approvalStatus !== 'approved' OR approvalStatus is null
Sort by: cadRequests.completedAt (descending)
```

**Returns:** Array of products ready for admin review

---

### 2. `/api/admin/products/[productId]/approve` (POST)
**Action:**
```javascript
Update product:
- approvalStatus: 'approved'
- approvedAt: Date.now()
- approvedBy: adminUserId
- approvalNotes: provided notes
- isActive: true  // Make visible on website
```

**Returns:** Updated product object

---

### 3. `/api/admin/products/[productId]/decline` (POST)
**Action:**
```javascript
Update product:
- approvalStatus: 'declined'
- declinedAt: Date.now()
- declinedBy: adminUserId
- declineReason: provided reason (required)
- isActive: false  // Keep hidden
```

**Returns:** Updated product object

---

## 🐛 Troubleshooting

### Problem: Product doesn't appear in awaiting-approval list

**Check:**
1. CAD request status is `'completed'`
   ```bash
   db.products.findOne({...}, {cadRequests: 1})
   # cadRequests[0].status should be "completed"
   ```

2. COG data is saved
   ```bash
   # cogData should exist and not be empty
   cadRequests[0].cogData !== null
   ```

3. Product not already approved
   ```bash
   # approvalStatus should NOT be 'approved'
   db.products.findOne({_id: ...})
   # approvalStatus should be null, 'declined', or missing
   ```

---

### Problem: Approve/Decline button doesn't work

**Check:**
1. Admin user is authenticated and has role === 'admin'
2. Check browser console for errors
3. Verify API endpoints are accessible:
   ```bash
   # Test approve endpoint
   curl -X POST http://localhost:3001/api/admin/products/PRODUCT_ID/approve \
     -H "Content-Type: application/json" \
     -d '{"notes": "test", "approvedBy": "USER_ID"}'
   ```

4. Check NextAuth session:
   ```javascript
   // In browser console:
   const res = await fetch('/api/auth/session');
   const session = await res.json();
   console.log(session.user.role);  // Should be 'admin'
   ```

---

### Problem: Metal cost not showing 1.3x markup

**Check:**
1. The calculation uses formula: `metalWeightG * pricePerGram * 1.3`
   - File: `/src/constants/metalTypes.js` line 166
   - Should have the `* 1.3` multiplier

2. Test calculation manually:
   ```javascript
   // Example:
   - Metal weight: 2g
   - Price per gram: $25
   - Expected: 2 * 25 * 1.3 = $65
   - Actual: Check COG tab display
   ```

3. Verify metal type is selected and has valid pricing data

---

### Problem: COG data not persisting after page refresh

**Check:**
1. Save button was clicked and success message appeared
2. Database has cogData saved:
   ```bash
   db.products.findOne({...}, {cadRequests: 1})
   # cogData should exist in cadRequests[0]
   ```

3. Page auto-loads saved data:
   - File: `/src/app/dashboard/requests/cad-requests/[id]/page.js` line ~2250+
   - `loadRequest()` should populate form from saved cogData

---

## 📋 Testing Scenarios

### Scenario 1: Complete Happy Path
1. ✅ Create CAD request
2. ✅ Claim as designer
3. ✅ Upload & approve STL
4. ✅ Fill COG data with 1.3x markup
5. ✅ Save & mark completed
6. ✅ Verify appears in admin approval queue
7. ✅ Admin approves product
8. ✅ Product marked isActive: true
9. ✅ Product visible on shop (TODO: implement)

### Scenario 2: Decline & Resubmit
1. ✅ Complete CAD to completion (Steps 1-5 above)
2. ✅ Product appears in approval queue
3. ✅ Admin declines with reason
4. ✅ Product disappears from list
5. ✅ Artisan receives notification (TODO: implement)
6. ✅ Artisan edits product
7. ✅ Resubmit for approval
8. ✅ Appears back in approval queue

### Scenario 3: Multiple Products
1. ✅ Create 3 different CAD requests
2. ✅ Complete all 3 to COG stage
3. ✅ All 3 appear in awaiting-approval list
4. ✅ Approve 1, decline 1, leave 1 pending
5. ✅ Next load shows only the pending one
6. ✅ Database reflects correct statuses for all 3

---

## ✅ Final Verification Checklist

Before considering this feature complete:

- [ ] CAD request transitions to `'completed'` status after COG save
- [ ] `completedAt` timestamp is set in database
- [ ] Metal cost calculation displays with 1.3x markup correctly
- [ ] COG data persists across page refreshes
- [ ] Product appears in admin awaiting-approval queue only once
- [ ] Admin can approve product (isActive: true, approvalStatus: 'approved')
- [ ] Admin can decline product (isActive: false, approvalStatus: 'declined')
- [ ] Decline requires and captures decline reason
- [ ] Approve is optional but can capture notes
- [ ] Approved products disappear from awaiting-approval list
- [ ] Declined products disappear from awaiting-approval list
- [ ] Database records accurately reflect all approvals/declines
- [ ] Multiple products can be managed independently
- [ ] Buttons are disabled during API calls to prevent double-clicks

---

## 🚀 Next Steps After Verification

1. **Connect Approved Products to Gemstone Tab**
   - Query products where `isActive: true` and `approvalStatus: 'approved'`
   - Display in "Designs by Artisans" section on product detail page
   - Show artisan name, price, images, ratings

2. **Add Notification System**
   - When product approved: notify artisan
   - When product declined: notify artisan with decline reason
   - Use existing comments/messaging system

3. **Product Editing for Declined Items**
   - Allow artisan to view decline reason
   - Provide form to edit and resubmit
   - Track revision history

4. **Admin Dashboard Analytics**
   - Show approval/decline rates
   - Track average approval time
   - Metrics on artisan submissions

