# Auth Unification Plan

## Overview
Unifying authentication system between efd-shop (Shopify-based) and efd-admin (Google OAuth) to create a single, cohesive auth system that supports multiple user roles and approval workflows.

## Current State

### efd-admin
- **Auth Provider**: NextAuth with Google OAuth + Credentials
- **Roles**: admin, artisan, artisan-applicant, wholesaler, client, store
- **Database**: MongoDB with custom user management
- **Access**: Auto-approval for Google OAuth users

### efd-shop
- **Auth Provider**: Shopify Customer Authentication
- **Roles**: customer/client only
- **Database**: MongoDB sync with Shopify customer data
- **Access**: Direct customer registration/login

## Target Architecture

### 1. Unified Auth Provider (Shopify-based)
- **Primary**: Shopify Customer Authentication (for all users)
- **Fallback**: Credentials provider for admin/staff accounts
- **Remove**: Google OAuth entirely

### 2. Enhanced Role System
```javascript
const USER_ROLES = {
  // Customer-facing roles (Shopify-managed)
  CLIENT: 'client',
  WHOLESALER: 'wholesaler',
  
  // Business roles (approval-required)
  ARTISAN_APPLICANT: 'artisan-applicant',
  ARTISAN: 'artisan',
  
  // Internal roles (admin-created only)
  STAFF: 'staff',      // NEW: Limited admin access
  DEV: 'dev',          // NEW: Full admin access
  ADMIN: 'admin'       // Full admin access
}
```

### 3. Access Control Matrix
| Role | efd-shop | efd-admin | Admin Settings | Approval Required |
|------|----------|-----------|----------------|-------------------|
| client | ✅ Full | ❌ No | ❌ No | ❌ No |
| wholesaler | ✅ Full | ✅ Limited | ❌ No | ✅ Yes |
| artisan-applicant | ✅ Limited | ✅ Limited | ❌ No | ✅ Pending |
| artisan | ✅ Full | ✅ Full | ❌ No | ✅ Approved |
| staff | ❌ No | ✅ Limited | ❌ No | ✅ Admin-created |
| dev | ❌ No | ✅ Full | ✅ Full | ✅ Admin-created |
| admin | ❌ No | ✅ Full | ✅ Full | ✅ System-created |

### 4. Registration Flow

#### Public Registration (efd-admin signup page)
1. User creates Shopify customer account
2. Additional role/business info collected
3. User status set to 'pending' (except client)
4. Email notification sent to admins for approval
5. User can login but has limited access until approved

#### Admin-Created Accounts (staff/dev/admin)
1. Admin creates user through admin panel
2. Temporary Shopify customer account created
3. User receives email with temporary password
4. User must change password on first login

### 5. Authentication Flow

#### efd-shop
- Direct Shopify authentication (no changes)
- Role-based feature access

#### efd-admin  
- Shopify authentication first
- Check MongoDB for additional role/permissions
- Redirect if insufficient permissions
- Session includes both Shopify token and role data

## Implementation Plan

### Phase 1: Infrastructure Setup
1. ✅ Create auth-unification branch
2. Create unified UserService with role management
3. Create approval workflow system
4. Set up email notification system

### Phase 2: efd-admin Auth Migration
1. Remove Google OAuth provider
2. Implement Shopify auth for efd-admin
3. Create role-based middleware
4. Migrate existing users to new system

### Phase 3: Enhanced Role System
1. Add staff/dev roles to database
2. Implement approval workflow UI
3. Create admin user management interface
4. Add role-based component restrictions

### Phase 4: Registration Overhaul
1. Update signup forms for role selection
2. Implement approval notification system
3. Create pending user dashboard
4. Add admin approval interface

### Phase 5: Testing & Deployment
1. Test all auth flows
2. Migration script for existing users
3. Production deployment plan
4. Rollback strategy

## Technical Details

### Database Schema Updates
```javascript
// Enhanced user schema
{
  userID: String,
  shopifyId: String,
  email: String,
  firstName: String,
  lastName: String,
  role: String,
  status: 'pending' | 'approved' | 'rejected' | 'active',
  permissions: {
    adminSettings: Boolean,
    userManagement: Boolean,
    // ... other permissions
  },
  approvalData: {
    requestedAt: Date,
    requestedRole: String,
    businessInfo: Object,
    approvedBy: String,
    approvedAt: Date,
    rejectedBy: String,
    rejectedAt: Date,
    rejectionReason: String
  }
}
```

### API Endpoints Needed
- `/api/auth/shopify-admin` - Shopify auth for admin
- `/api/users/approve` - Approve pending users
- `/api/users/create-admin` - Create staff/dev/admin users
- `/api/roles/permissions` - Get role permissions

### Environment Variables
```bash
# Shopify credentials (shared between apps)
SHOPIFY_STORE_DOMAIN=
SHOPIFY_PRIVATE_ACCESS_TOKEN=
SHOPIFY_WEBHOOK_SECRET=

# Remove Google OAuth vars
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=
```

## Migration Strategy

### Existing Users
1. Map current efd-admin users to new role system
2. Create Shopify customer accounts for non-client users
3. Maintain current access levels during transition
4. Gradual migration with rollback capability

### Data Migration
1. Export current efd-admin users
2. Create Shopify customers for business users
3. Update MongoDB with new schema
4. Test authentication flows

## Benefits

1. **Unified System**: Single auth system across both applications
2. **Shopify Integration**: Native Shopify customer management
3. **Role-Based Security**: Granular permission control
4. **Approval Workflow**: Business user validation process
5. **Scalability**: Easy to add new roles and permissions
6. **Maintainability**: Reduced complexity, single source of truth

## Risks & Mitigation

1. **Shopify Limitations**: Customer account restrictions
   - *Mitigation*: Hybrid approach with credentials fallback
2. **Migration Complexity**: Existing user data
   - *Mitigation*: Staged migration with rollback plan
3. **Session Management**: Cross-app authentication
   - *Mitigation*: Shared JWT tokens or session store

## Timeline
- **Phase 1**: 2-3 days
- **Phase 2**: 3-4 days  
- **Phase 3**: 2-3 days
- **Phase 4**: 2-3 days
- **Phase 5**: 2-3 days
- **Total**: ~2 weeks

## Next Steps
1. Review and approve this plan
2. Begin Phase 1 implementation
3. Set up development environment
4. Create unified UserService foundation