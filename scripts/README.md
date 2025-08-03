# Repair Tasks Sync Script

This script pulls all repair tasks from Shopify and stores them in MongoDB for faster local access.

## Prerequisites

1. **Environment Variables**: Ensure your `.env.local` file contains:
   ```
   SHOPIFY_STORE_URL=your-store-name.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your-shopify-access-token
   MONGODB_URI=your-mongodb-connection-string
   MONGO_DB_NAME=efd-database
   ```

2. **Shopify Access**: The access token needs permissions for:
   - `read_products`
   - `read_product_listings`

## Usage

### Run the sync script:
```bash
npm run sync-repair-tasks
```

### Or run directly:
```bash
node scripts/sync-repair-tasks-to-mongo.js
```

## What the script does

1. **Connects to Shopify**: Fetches all products tagged as 'repair task' and marked as 'ACTIVE'
2. **Extracts data**: Pulls product information, variants, images, and metadata
3. **Stores in MongoDB**: Creates a `repairTasks` collection with indexed fields
4. **Handles duplicates**: Uses upsert operations based on SKU to avoid duplicates
5. **Generates report**: Provides a summary of the sync operation

## Data Structure

Each repair task document in MongoDB contains:

```javascript
{
  // Shopify IDs
  shopifyProductId: "gid://shopify/Product/...",
  shopifyVariantId: "gid://shopify/ProductVariant/...",
  
  // Product information
  title: "Product Title",
  handle: "product-handle",
  description: "Product description",
  productType: "Type",
  vendor: "Vendor Name",
  tags: ["repair task", "category", "..."],
  status: "ACTIVE",
  
  // Variant information
  sku: "REPAIR-SKU-001",
  price: 29.99,
  inventoryQuantity: 10,
  weight: 100,
  weightUnit: "GRAMS",
  
  // Images
  images: [
    {
      id: "gid://shopify/ProductImage/...",
      url: "https://cdn.shopify.com/...",
      altText: "Alt text"
    }
  ],
  
  // Timestamps
  shopifyCreatedAt: Date,
  shopifyUpdatedAt: Date,
  variantCreatedAt: Date,
  variantUpdatedAt: Date,
  syncedAt: Date,
  syncVersion: "1.0.0"
}
```

## MongoDB Indexes

The script creates the following indexes for optimal query performance:

- `sku` (unique)
- `shopifyProductId`
- `shopifyVariantId` 
- `title` and `description` (text search)
- `tags`
- `status`

## API Endpoints

After running the sync, you can access repair tasks through these endpoints:

- `GET /api/repair-tasks` - Get all repair tasks with optional filters
- `GET /api/repair-tasks/statistics` - Get summary statistics
- `GET /api/repair-tasks/search?sku=SKU` - Find by SKU
- `GET /api/repair-tasks/filters` - Get available tags and vendors

### Query Parameters for `/api/repair-tasks`:

- `sku` - Filter by SKU (partial match)
- `title` - Filter by title (partial match)
- `vendor` - Filter by exact vendor
- `status` - Filter by status
- `tags` - Comma-separated list of tags
- `priceMin` - Minimum price
- `priceMax` - Maximum price
- `searchQuery` - Full-text search across title and description
- `limit` - Maximum number of results (default: 1000)

## Error Handling

The script includes comprehensive error handling for:

- Missing environment variables
- Shopify API connection issues
- MongoDB connection problems
- Data validation errors
- Network timeouts

## Scheduling

This is designed as a one-time script, but you can set up scheduled runs using:

- **Cron job**: Add to your system's crontab
- **GitHub Actions**: Create a workflow for scheduled runs
- **Cloud functions**: Deploy as a scheduled cloud function

## Troubleshooting

### Common Issues:

1. **"Missing required environment variables"**
   - Check your `.env.local` file
   - Ensure all Shopify and MongoDB credentials are correct

2. **"Failed to fetch repair tasks from Shopify"**
   - Verify your Shopify access token has the right permissions
   - Check if your store URL is correct

3. **"MongoDB Connection Error"**
   - Verify your MongoDB URI is correct
   - Ensure your database allows connections from your IP

4. **"No repair tasks found"**
   - Check if your products are tagged with 'repair task'
   - Ensure products are marked as 'ACTIVE' status

### Debug Mode:

The script provides detailed logging for each step. Monitor the console output to identify where issues occur.

## Performance

- Handles up to 250 products per request (Shopify API limit)
- Uses bulk operations for MongoDB writes
- Includes connection pooling for optimal performance
- Creates indexes for fast queries

## Next Steps

After running the script:

1. Verify data in your MongoDB collection
2. Test the API endpoints
3. Update your application to use the local repair tasks data
4. Set up regular sync schedules if needed
