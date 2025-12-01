# Metal Pricing & COG Calculation System

## Overview

The COG (Cost of Goods) tab in the CAD Requests admin page now includes a comprehensive metal pricing system that automatically calculates mounting costs based on real-time metal market prices.

## Key Features

### 1. **Metal Type Support**

**Gold Variants** (10K, 14K, 18K)
- Red Gold
- White Gold  
- Yellow Gold

**Silver Variants**
- Sterling Silver (.925)
- Fine Silver (.999)

**Platinum Group**
- Pure Platinum
- Platinum/Iridium (90/10)
- Platinum/Cobalt

### 2. **Automatic Weight Calculation**

The system calculates metal weight automatically from STL file volume:

```
Wax Weight (g) = STL Volume (mm³) × 0.001
Metal Weight (g) = Wax Weight × Specific Gravity of Metal
```

### 3. **Dynamic Pricing**

Metal prices are fetched daily from metalpriceapi.com and stored in the database. Prices are automatically:
- Adjusted for karat (gold: 14K = 14/24 of 24K price)
- Adjusted for purity (silver: .925 = 92.5% of .999 price)
- Combined with the metal weight to calculate total metal cost

### 4. **Labor Cost**

A fixed $15 labor charge is automatically included in the total mounting COG.

## Setup Instructions

### Step 1: Get Metal Price API Key

1. Go to https://metalpriceapi.com/
2. Sign up for a free account
3. Copy your API key

### Step 2: Configure Environment Variables

Add to `.env.local`:

```bash
METAL_PRICE_API_KEY=your_api_key_from_metalpriceapi.com
CRON_SECRET=generate_a_strong_random_secret_using_a_password_generator
```

### Step 3: Set Up Daily Price Updates

You have two options:

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/update-metal-prices",
      "schedule": "0 9 * * *"
    }
  ]
}
```

This runs daily at 9:00 AM UTC.

#### Option B: External Cron Service (EasyCron.com)

1. Go to https://www.easycron.com/
2. Create a new cron job
3. Set the URL to:
   ```
   https://your-domain.com/api/cron/update-metal-prices?secret=YOUR_CRON_SECRET
   ```
4. Set frequency to "Daily" at desired time (e.g., 9 AM UTC)

### Step 4: Verify Setup

Test the metal price endpoint:

```bash
# In your browser or API client
GET /api/metal-prices

# Should return:
{
  "success": true,
  "prices": {
    "gold": 65.25,
    "silver": 0.82,
    "platinum": 1050.00,
    "palladium": 900.00
  },
  "lastUpdated": "2025-11-19T09:00:00Z"
}
```

## How It Works

### Admin COG Calculation Workflow

1. **Admin opens a CAD Request** with approved STL design
2. **Goes to COG tab** (6th tab, admin-only)
3. **Views STL volume and wax weight** automatically calculated
4. **Selects a metal type** from the dropdown
5. **System automatically calculates:**
   - Metal weight = Wax weight × Specific gravity
   - Metal price per gram (adjusted for purity/karat)
   - Total metal cost = Metal weight × Price/gram
   - Total COG = Metal cost + $15 labor
6. **Displays calculations** in real-time

### Frontend Shop Calculation Workflow

The efd-shop frontend will:
1. Fetch current metal prices from `/api/metal-prices`
2. Get STL volume from design data
3. Calculate wax weight automatically
4. For each available metal type:
   - Calculate weight and cost
   - Store wax weight (not price, for dynamic pricing)
5. Display mounting cost options
6. Apply selected metal type to cart pricing

This means prices update dynamically on the shop without any code changes!

## API Reference

### GET /api/metal-prices

Fetch current metal prices.

**Response:**
```json
{
  "success": true,
  "prices": {
    "gold": 65.25,      // $/gram of 24K gold
    "silver": 0.82,     // $/gram of .999 silver
    "platinum": 1050.00,
    "palladium": 900.00
  },
  "lastUpdated": "2025-11-19T09:00:00Z"
}
```

### POST /api/metal-prices

Update metal prices (admin only or cron job).

**Request:**
```json
{
  "gold": 65.25,
  "silver": 0.82,
  "platinum": 1050.00,
  "palladium": 900.00,
  "source": "metalpriceapi.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Metal prices updated successfully",
  "prices": { ... },
  "lastUpdated": "2025-11-19T09:00:00Z"
}
```

### GET /api/cron/update-metal-prices?secret=YOUR_SECRET

Cron job endpoint to fetch and store latest metal prices.

**Query Parameters:**
- `secret` - CRON_SECRET from environment

**Response:**
```json
{
  "success": true,
  "message": "Metal prices updated successfully",
  "prices": { ... },
  "timestamp": "2025-11-19T09:00:00Z"
}
```

## Database Schema

### Metal Prices Collection

```javascript
{
  _id: "current_prices",
  gold: 65.25,              // 24K gold price per gram
  silver: 0.82,             // .999 silver price per gram
  platinum: 1050.00,        // Platinum price per gram
  palladium: 900.00,        // Palladium price per gram
  lastUpdated: ISODate("2025-11-19T09:00:00Z"),
  updatedAt: ISODate("2025-11-19T09:00:00Z"),
  source: "metalpriceapi.com",
  updatedBy: "cron-job"
}
```

## Specific Gravity Reference

Used for accurate weight calculations:

```
Wax (reference)           - 1.00
10K Red Gold             - 11.59
10K White Gold           - 11.07
10K Yellow Gold          - 11.57
14K Red Gold             - 13.26
14K White Gold           - 12.61
14K Yellow Gold          - 13.07
18K Red Gold             - 15.18
18K White Gold           - 14.64
18K Yellow Gold          - 15.58
Fine Silver (.999)       - 10.53
Sterling Silver (.925)   - 10.40
Copper                   - 8.94
Platinum (pure)          - 21.45
Platinum/Iridium (90/10) - 21.54
Platinum/Cobalt          - 20.80
Palladium                - 12.02
```

## Troubleshooting

### Metal Prices Show "Not Available"

**Problem:** The COG tab shows "Metal prices not available"

**Solutions:**
1. Check that `METAL_PRICE_API_KEY` is set in `.env.local`
2. Verify metalpriceapi.com account is active
3. Manually trigger price update:
   ```bash
   curl "https://your-domain.com/api/cron/update-metal-prices?secret=YOUR_SECRET"
   ```
4. Check server logs for errors
5. Verify MongoDB connection is working

### Incorrect Metal Weight Calculations

**Problem:** Metal weights seem wrong

**Solutions:**
1. Verify STL volume is correctly stored in design file
2. Check the specific gravity value is correct for the metal
3. Verify wax weight calculation: `Volume × 0.001`
4. Test with a known example

### Prices Not Updating Daily

**Problem:** Prices haven't changed in a week

**Solutions:**
1. Check cron job logs (Vercel or EasyCron)
2. Verify CRON_SECRET is correct in cron configuration
3. Test cron endpoint manually
4. Check metalpriceapi.com is responding correctly
5. Review error logs in application

## Cost Formula Reference

```
1. Wax Weight (g) = STL Volume (mm³) × 0.001

2. Metal Weight (g) = Wax Weight × Specific Gravity
   Example: 0.7g wax × 13.26 (14K Red Gold) = 9.282g metal

3. Price per Gram (adjusted)
   - Gold: (Price per gram × Karat) / 24
   - Silver: Price per gram × Purity
   - Example: $65.25/g × 14/24 = $38.01/g (14K gold)

4. Metal Cost = Metal Weight × Price per Gram
   Example: 9.282g × $38.01 = $352.89

5. Total Mounting COG = Metal Cost + $15 Labor
   Example: $352.89 + $15 = $367.89
```

## Future Enhancements

Planned features for the metal pricing system:

- [ ] Multiple labor rate presets
- [ ] Waste factor adjustments (e.g., +5% for casting waste)
- [ ] Historical price tracking and charts
- [ ] Bulk metal pricing discounts
- [ ] Integration with supplier pricing APIs
- [ ] Custom metal alloy definitions
- [ ] Price alerts for significant fluctuations

## Support

For issues with the metal pricing system, contact the development team or check:
- metalpriceapi.com documentation
- MongoDB Atlas monitoring
- Application error logs

---

**Last Updated:** November 19, 2025
**Version:** 1.0.0
