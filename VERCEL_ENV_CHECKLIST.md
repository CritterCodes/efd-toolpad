# Vercel Environment Configuration Checklist

The "Unauthorized" error occurs because the application cannot decrypt the Shopify Access Token stored in the database. This happens when the encryption key (derived from `NEXTAUTH_SECRET`) on Vercel is different from the one used to encrypt the data (your local environment).

## Option 1: Re-enter Credentials (Recommended)
The easiest fix is to update the credentials directly in the production application. This will re-encrypt them using the current Vercel keys.

1. Log in to the **Admin Dashboard** on production.
2. Go to **Settings > Integrations**.
3. In the **Shopify Integration** card:
   - Re-enter your **Shop URL**: `engel-fine-design.myshopify.com`
   - Re-enter your **Access Token**: (Copy from your local `.env.local` file, variable `SHOPIFY_PRIVATE_ACCESS_TOKEN`)
4. Click **Save Settings**.
5. Try the **Sync Catalog** button again.

## Option 2: Sync Environment Variables
If you prefer to sync the secrets, ensure the following variable matches exactly in Vercel:

**NEXTAUTH_SECRET**
(Copy the value from your local `.env.local` file)

## Required Vercel Environment Variables
Ensure these are present in your Vercel Project Settings:

| Variable | Value Source |
|----------|---------------------------|
| `NEXTAUTH_SECRET` | Copy from `.env.local` |
| `MONGODB_URI` | Copy from `.env.local` |
| `SHOPIFY_PRIVATE_ACCESS_TOKEN` | Copy from `.env.local` |
