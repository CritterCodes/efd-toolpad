# 🔐 Authentication & Security

## Overview
Comprehensive authentication and security implementation for the Engel Fine Design Admin CRM System.

## 🔑 **Authentication Architecture**

### **NextAuth.js Integration**
The system uses NextAuth.js v4 for robust authentication:

```javascript
// auth.js configuration
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { MongoDBAdapter } from '@next-auth/mongodb-adapter';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: MongoDBAdapter(client),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      // Custom JWT handling
      if (user) {
        token.role = 'admin';
      }
      return token;
    },
    session: async ({ session, token }) => {
      // Session customization
      session.user.role = token.role;
      return session;
    }
  }
});
```

### **JWT Token Management**
- **Primary**: NextAuth.js session cookies
- **Secondary**: JWT tokens for API access
- **Expiration**: Configurable session timeout
- **Refresh**: Automatic token refresh on activity

---

## 🛡️ **Security Layers**

### **1. Authentication Middleware**
```javascript
// middleware.js
import { auth } from './auth';

export default auth((req) => {
  const { pathname } = req.nextUrl;
  
  // Protect admin routes
  if (pathname.startsWith('/dashboard')) {
    if (!req.auth) {
      return Response.redirect(new URL('/auth/signin', req.url));
    }
    
    // Admin-only access
    if (req.auth.user.role !== 'admin') {
      return Response.redirect(new URL('/unauthorized', req.url));
    }
  }
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### **2. API Route Protection**
```javascript
// API route security
import { auth } from '../../../auth';

export async function GET(request) {
  const session = await auth();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // Proceed with protected logic
}
```

### **3. PIN-Based Security**
For sensitive administrative operations:

```javascript
// PIN generation and validation
export class PINSecurity {
  static generatePIN() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  }
  
  static async storePIN(userId, pin) {
    const hashedPIN = await bcrypt.hash(pin, 12);
    const expiration = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    await db.collection('adminPINs').replaceOne(
      { userId },
      {
        userId,
        hashedPIN,
        expiresAt: expiration,
        createdAt: new Date()
      },
      { upsert: true }
    );
  }
  
  static async validatePIN(userId, pin) {
    const record = await db.collection('adminPINs').findOne({ userId });
    
    if (!record || record.expiresAt < new Date()) {
      return false;
    }
    
    return await bcrypt.compare(pin, record.hashedPIN);
  }
}
```

---

## 🔐 **Data Encryption**

### **AES-256-GCM Implementation**
```javascript
// utils/encryption.js
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY;

export async function encryptSensitiveData(text) {
  try {
    const iv = crypto.randomBytes(16);
    const salt = crypto.randomBytes(32);
    const key = crypto.scryptSync(SECRET_KEY, salt, 32);
    
    const cipher = crypto.createCipher(ALGORITHM, key);
    cipher.setAAD(Buffer.from('sensitive-data', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      salt: salt.toString('hex'),
      authTag: authTag.toString('hex')
    };
  } catch (error) {
    throw new Error('Encryption failed');
  }
}

export async function decryptSensitiveData(encryptedData) {
  try {
    const { encrypted, iv, salt, authTag } = encryptedData;
    const key = crypto.scryptSync(SECRET_KEY, Buffer.from(salt, 'hex'), 32);
    
    const decipher = crypto.createDecipher(ALGORITHM, key);
    decipher.setAAD(Buffer.from('sensitive-data', 'utf8'));
    decipher.setAuthTag(Buffer.from(authTag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Decryption failed');
  }
}
```

### **Encrypted Storage**
Sensitive data stored with encryption:
- Shopify API credentials
- Stuller API keys
- Customer payment information
- Admin PIN codes

---

## 📊 **Audit Logging**

### **Activity Tracking**
```javascript
// Audit logging system
export class AuditLogger {
  static async logActivity(userId, action, details) {
    await db.collection('auditLogs').insertOne({
      userId,
      action,
      details,
      timestamp: new Date(),
      ipAddress: getClientIP(),
      userAgent: getUserAgent()
    });
  }
  
  static async logSensitiveAccess(userId, resource) {
    await this.logActivity(userId, 'SENSITIVE_ACCESS', {
      resource,
      level: 'HIGH',
      requiresReview: true
    });
  }
}

// Usage in admin operations
await AuditLogger.logActivity(
  session.user.id,
  'SHOPIFY_SETTINGS_UPDATE',
  { changedFields: ['accessToken', 'storeUrl'] }
);
```

### **Audit Log Schema**
```javascript
{
  _id: ObjectId,
  userId: ObjectId,
  action: 'LOGIN' | 'LOGOUT' | 'SETTINGS_UPDATE' | 'SENSITIVE_ACCESS',
  details: {
    resource?: string,
    changedFields?: string[],
    level?: 'LOW' | 'MEDIUM' | 'HIGH'
  },
  timestamp: Date,
  ipAddress: string,
  userAgent: string,
  requiresReview?: boolean
}
```

---

## 🔒 **Access Control**

### **Role-Based Access**
```javascript
// Role definitions
const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer' // Future role for read-only access
};

const PERMISSIONS = {
  admin: [
    'read:all',
    'write:all', 
    'delete:all',
    'admin:settings',
    'admin:users'
  ],
  viewer: [
    'read:repairs',
    'read:customers',
    'read:analytics'
  ]
};

// Permission checking
export function hasPermission(userRole, requiredPermission) {
  return PERMISSIONS[userRole]?.includes(requiredPermission) || false;
}
```

### **Admin-Only Restrictions**
Current implementation restricts all access to admin users only:
- No client self-service portal
- No wholesaler access
- Manual user account creation only
- All operations require admin authentication

---

## 🌐 **Session Management**

### **Session Configuration**
```javascript
// NextAuth session configuration
session: {
  strategy: 'jwt',
  maxAge: 24 * 60 * 60, // 24 hours
  updateAge: 60 * 60,   // Update every hour
},
jwt: {
  maxAge: 24 * 60 * 60, // 24 hours
}
```

### **Session Security**
- **SameSite**: Strict cookie policy
- **Secure**: HTTPS-only in production
- **HttpOnly**: Prevent XSS attacks
- **Domain Binding**: Restrict to application domain

---

## 🚨 **Security Monitoring**

### **Failed Authentication Tracking**
```javascript
// Monitor failed login attempts
export class SecurityMonitor {
  static async trackFailedLogin(email, ipAddress) {
    await db.collection('failedLogins').insertOne({
      email,
      ipAddress,
      timestamp: new Date(),
      userAgent: getUserAgent()
    });
    
    // Check for brute force attempts
    const recentAttempts = await this.getRecentFailedAttempts(email, ipAddress);
    if (recentAttempts.length > 5) {
      await this.triggerSecurityAlert(email, ipAddress);
    }
  }
  
  static async getRecentFailedAttempts(email, ipAddress) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    return await db.collection('failedLogins').find({
      $or: [{ email }, { ipAddress }],
      timestamp: { $gte: fifteenMinutesAgo }
    }).toArray();
  }
}
```

### **Security Alerts**
- Brute force detection
- Unusual access patterns
- Multiple failed PIN attempts
- Sensitive data access monitoring

---

## 🔧 **Configuration Security**

### **Environment Variables**
Secure handling of environment variables:

```bash
# Required for authentication
NEXTAUTH_SECRET=[strong-random-secret]
NEXTAUTH_URL=http://localhost:3000

# Database encryption
ENCRYPTION_KEY=[32-byte-encryption-key]

# JWT signing
JWT_SECRET=[jwt-signing-secret]

# Google OAuth (optional)
GOOGLE_CLIENT_ID=[google-oauth-client-id]
GOOGLE_CLIENT_SECRET=[google-oauth-client-secret]
```

### **Database Security**
- Connection string with authentication
- Encrypted sensitive fields
- Regular backup procedures
- Access logging and monitoring

---

## 🔍 **Security Best Practices**

### **Implemented Measures**
1. **Multi-layer authentication** (NextAuth.js + JWT + PINs)
2. **Data encryption at rest** (AES-256-GCM)
3. **Comprehensive audit logging**
4. **Role-based access control**
5. **Session security** (secure cookies, timeouts)
6. **Input validation and sanitization**
7. **Rate limiting** (via middleware)
8. **Security monitoring** (failed attempts, alerts)

### **Regular Security Tasks**
1. **Key Rotation**: Rotate encryption keys quarterly
2. **Access Review**: Review admin access monthly  
3. **Audit Log Review**: Weekly security audit log review
4. **Dependency Updates**: Keep security dependencies current
5. **Penetration Testing**: Annual security assessment

---

## 🚨 **Incident Response**

### **Security Incident Protocol**
1. **Detection**: Automated monitoring and manual reporting
2. **Assessment**: Determine scope and impact
3. **Containment**: Limit damage and prevent spread
4. **Investigation**: Analyze logs and determine cause
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### **Emergency Procedures**
- **Immediate Access Revocation**: Disable compromised accounts
- **Session Invalidation**: Force all users to re-authenticate  
- **Credential Rotation**: Emergency key and token replacement
- **System Isolation**: Temporarily restrict access if needed
