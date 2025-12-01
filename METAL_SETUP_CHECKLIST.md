# Metal Pricing System - Quick Setup Checklist

## Prerequisites
- [ ] MongoDB database set up and connected
- [ ] Node.js environment configured
- [ ] Admin access to efd-admin

## Step 1: Get API Key
- [ ] Sign up at https://metalpriceapi.com/
- [ ] Copy API key from account dashboard
- [ ] Store in `.env.local` as `METAL_PRICE_API_KEY`

## Step 2: Configure Environment
- [ ] Add `METAL_PRICE_API_KEY` to `.env.local`
- [ ] Generate secure `CRON_SECRET` (use: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- [ ] Add `CRON_SECRET` to `.env.local`

## Step 3: Deploy Code
- [ ] Pull latest changes including metal pricing files
- [ ] Verify files exist:
  - [ ] `src/constants/metalTypes.js`
  - [ ] `src/lib/metalPriceService.js`
  - [ ] `src/app/api/metal-prices/route.js`
  - [ ] `src/app/api/cron/update-metal-prices/route.js`
  - [ ] Updated `src/app/dashboard/requests/cad-requests/[id]/page.js`
- [ ] Run build: `npm run build`
- [ ] Deploy to production

## Step 4: Set Up Cron Job

### Option A: Vercel
- [ ] Update `vercel.json` with cron configuration
- [ ] Redeploy project

### Option B: EasyCron
- [ ] Go to https://www.easycron.com/
- [ ] Create new cron job
- [ ] Set URL: `https://your-domain.com/api/cron/update-metal-prices?secret=YOUR_SECRET`
- [ ] Set schedule: Daily at 9:00 AM UTC
- [ ] Save and activate

## Step 5: Verify Setup
- [ ] Access admin panel
- [ ] Open any CAD Request with STL file
- [ ] Click COG tab (should be visible for admins)
- [ ] Metal prices should load (no "not available" warning)
- [ ] Test metal selection and calculation

## Step 6: First Manual Price Update
- [ ] Call: `GET /api/metal-prices?secret=YOUR_SECRET`
- [ ] Should return current prices
- [ ] If error, check:
  - [ ] API key is correct
  - [ ] CRON_SECRET is correct
  - [ ] MongoDB connection is working

## Maintenance Tasks
- [ ] Monitor cron job logs weekly
- [ ] Check metal prices update daily
- [ ] Review error logs for failures
- [ ] Test manual price update monthly

## Troubleshooting Reference
| Issue | Solution |
|-------|----------|
| "Metal prices not available" | Check API key and cron job logs |
| Wrong metal weights | Verify STL volume stored in design |
| Prices don't update | Verify cron job is configured and running |
| API key errors | Check metalpriceapi.com account status |

## Support Links
- Metal Price API: https://metalpriceapi.com/
- EasyCron: https://www.easycron.com/
- Documentation: `/docs/METAL_PRICING_SYSTEM.md`

---

**Created:** November 19, 2025
**Status:** Ready for deployment
