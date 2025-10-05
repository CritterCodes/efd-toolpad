# Hybrid Authentication System Plan

## Overview
Instead of removing Google OAuth, we'll create a hybrid authentication system that supports both Google OAuth and Shopify authentication, with automatic account synchronization and linking.

## Hybrid Authentication Flow

### 1. Google OAuth Sign-In
```
User clicks "Sign in with Google" 
→ Google authentication 
→ Check if Shopify customer exists with same email
→ If exists: Link accounts and sign in
→ If not exists: Create Shopify customer account
→ Sync to MongoDB with unified user record
→ Sign in to efd-admin with full permissions
```

### 2. Username/Password Sign-In
```
User enters email/password
→ Authenticate with Shopify Customer API
→ Check if Google account exists with same email
→ If exists: Mark as linked account
→ Sync to MongoDB with unified user record
→ Sign in to efd-admin with role-based permissions
```

### 3. Account Linking
```
Existing Google user signs in with Shopify credentials (same email)
→ Automatically link accounts
→ Update MongoDB record with both provider data
→ Maintain single user identity across both systems
```

## Enhanced Data Structure

### Unified User Schema
```javascript
{
  userID: String, // Primary identifier
  email: String,  // Common identifier across providers
  
  // Authentication providers
  providers: {
    google: {
      id: String,
      verified: Boolean,
      profile: Object,
      lastSignIn: Date
    },
    shopify: {
      id: String,
      customerAccessToken: String,
      verified: Boolean,
      lastSignIn: Date
    }
  },
  
  // User data (unified from both sources)
  firstName: String,
  lastName: String,
  phoneNumber: String,
  
  // efd-admin specific
  role: String,
  status: String,
  permissions: Object,
  approvalData: Object,
  
  // Sync metadata
  primaryProvider: String, // 'google' or 'shopify'
  linkedAt: Date,
  lastSync: Date
}
```

## Implementation Strategy

### Phase 1: Hybrid Auth Provider
- Enhance NextAuth configuration to support both providers
- Create Shopify provider for NextAuth
- Implement account linking logic

### Phase 2: Shopify Integration Service
- Create Shopify customer management service
- Auto-create Shopify customers for Google users
- Sync customer data bidirectionally

### Phase 3: Enhanced User Service
- Update UnifiedUserService for dual-provider support
- Implement account linking and unlinking
- Handle provider-specific data synchronization

### Phase 4: UI Enhancements
- Update sign-in forms to support both methods
- Add account linking interface
- Show provider status in user profiles

## Benefits

1. **User Choice**: Users can choose their preferred sign-in method
2. **Seamless Migration**: Existing Google users get Shopify accounts automatically
3. **Data Synchronization**: Customer data stays in sync across systems
4. **Fallback Authentication**: If one provider fails, users can use the other
5. **Enhanced User Experience**: Single identity across both applications
6. **Business Continuity**: No disruption to existing user workflows

## Technical Implementation

### 1. Shopify NextAuth Provider
```javascript
import { Provider } from 'next-auth/providers'

export default function ShopifyProvider(options) {
  return {
    id: 'shopify',
    name: 'Shopify',
    type: 'oauth',
    authorization: {
      url: `https://${options.domain}/admin/oauth/authorize`,
      params: {
        scope: 'read_customers,write_customers',
        'grant_options[]': 'per-user'
      }
    },
    token: `https://${options.domain}/admin/oauth/access_token`,
    userinfo: async (tokens) => {
      // Custom logic to get/create Shopify customer
      return await getOrCreateShopifyCustomer(tokens)
    },
    profile: (profile) => ({
      id: profile.customer.id,
      email: profile.customer.email,
      name: `${profile.customer.firstName} ${profile.customer.lastName}`
    })
  }
}
```

### 2. Enhanced Auth Configuration
```javascript
export const authConfig = {
  providers: [
    GoogleProvider({
      // Enhanced to create Shopify customer
      async profile(profile) {
        // Existing Google logic + Shopify customer creation
      }
    }),
    CredentialsProvider({
      // Enhanced to use Shopify Customer API
      async authorize(credentials) {
        // Shopify authentication + Google account linking
      }
    })
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Handle account linking and synchronization
    },
    async jwt({ token, user, account }) {
      // Include provider information and sync data
    },
    async session({ session, token }) {
      // Enhanced session with provider info
    }
  }
}
```

## Next Steps

1. ✅ Plan hybrid authentication system
2. Create Shopify customer management service
3. Enhance NextAuth configuration for dual providers
4. Update UnifiedUserService for account linking
5. Implement bidirectional data synchronization
6. Add account linking UI components
7. Test all authentication flows
8. Update documentation and user guides

This approach maintains backward compatibility while providing a path forward for unified authentication across both platforms.