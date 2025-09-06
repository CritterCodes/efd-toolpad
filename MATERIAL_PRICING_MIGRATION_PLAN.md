# Material Pricing Migration - Action Plan

## ✅ **What's Been Completed**

### **1. Analysis & Design:**
- ✅ Identified redundant/misleading pricing properties
- ✅ Designed clean pricing structure with `costPerPortion` and `pricePerPortion`
- ✅ Created comprehensive documentation

### **2. Utility Functions:**
- ✅ Created `material-pricing.util.js` with clean pricing calculations
- ✅ Updated `MaterialCard.js` to show cost/price distinction
- ✅ Updated `processes.util.js` to use `costPerPortion` when available

### **3. Migration Scripts:**
- ✅ Created standalone migration script (`migrate-material-pricing.js`)
- ✅ Created database migration script (`migrate-database-materials.js`)
- ✅ Added dry-run capability to preview changes

## 🚀 **Next Steps to Complete the Migration**

### **Step 1: Analyze Current Database**
```bash
# Check what materials need migration
node scripts/migrate-database-materials.js dry-run
```

### **Step 2: Run Database Migration**
```bash
# Migrate materials to clean pricing structure
node scripts/migrate-database-materials.js migrate
```

### **Step 3: Update Material Forms**
Update the material creation/edit forms to:
- Remove `unitCost` field (misleading)
- Add `costPerPortion` and `pricePerPortion` display
- Calculate portion costs automatically when Stuller products are added

### **Step 4: Update ProcessForm**
Update ProcessForm to prioritize the new pricing structure:
```javascript
// Instead of:
baseCostPerPortion = (firstProduct.stullerPrice || 0) / portionsPerUnit;

// Use:
baseCostPerPortion = firstProduct.costPerPortion || (firstProduct.stullerPrice || 0) / portionsPerUnit;
```

### **Step 5: Test & Verify**
- ✅ MaterialCard shows correct cost ranges
- ✅ Process cost calculations use accurate material costs
- ✅ Multi-variant processes show proper price ranges

## 📊 **Expected Migration Results**

### **Before Migration:**
```json
{
  "stullerPrice": 4.11,      // ✅ OK
  "markupRate": 2,           // ✅ OK
  "markedUpPrice": 8.22,     // ❌ Redundant
  "unitCost": 8.22           // ❌ Misleading name
}
```

### **After Migration:**
```json
{
  "stullerPrice": 4.11,        // ✅ Clear - what we pay
  "markupRate": 2,             // ✅ Clear - our markup
  "markedUpPrice": 8.22,       // ✅ Clear - what we charge
  "costPerPortion": 0.137,     // ✅ NEW - our cost per piece
  "pricePerPortion": 0.274     // ✅ NEW - customer price per piece
  // unitCost removed (was misleading)
}
```

## 🎯 **Impact on Key Components**

### **MaterialCard Display:**
```
Before: "$4.11 - $282.86" (confusing)
After:  "$4.11 - $282.86 cost" (clear)
        "$0.137-$9.43 cost per piece" (critical info)
```

### **Process Cost Calculation:**
```
Before: Uses stullerPrice / portionsPerUnit (calculated every time)
After:  Uses costPerPortion (pre-calculated, more accurate)
```

### **Multi-Variant Process Pricing:**
```
Before: Single price "$5.07" (meaningless for variants)
After:  Price range "$5.07 - $14.23 (varies by metal)" (accurate)
```

## 🛠️ **Quick Commands Reference**

```bash
# 1. Analyze what needs migration
node scripts/migrate-database-materials.js dry-run

# 2. Run the actual migration
node scripts/migrate-database-materials.js migrate

# 3. Test the standalone migration logic
node scripts/migrate-material-pricing.js

# 4. Test material pricing structure
node test-material-pricing-structure.js
```

## ⚠️ **Important Notes**

1. **Backup First** - The migration script will modify your database
2. **Run Dry-Run** - Always run dry-run first to see what will change
3. **Test After** - Verify MaterialCard and ProcessCard displays after migration
4. **Form Updates** - Material creation forms will need updates to use new structure

## 🎉 **Final Result**

Once complete, you'll have:
- ✅ **Clear cost vs price separation** throughout the system
- ✅ **Accurate process costing** using `costPerPortion`
- ✅ **Proper multi-variant pricing** showing realistic ranges
- ✅ **Elimination of confusing properties** like misleading `unitCost`
- ✅ **Better profit margin tracking** with clear cost/price distinction

**Ready to run the migration? Start with the dry-run command above!**
