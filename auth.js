import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UnifiedUserService, AUTH_PROVIDERS } from './src/lib/unifiedUserService.js';

const baseURL = `${process.env.NEXT_PUBLIC_URL}`;

const providers = [
    CredentialsProvider({
        credentials: {
            email: { label: 'Email Address', type: 'email' },
            password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
            try {
                console.log("🔐 Starting Shopify authentication for:", credentials.email);

                // Import Shopify helpers
                const { authenticateCustomer, getCustomerData } = await import('./src/lib/shopify.js');

                // Authenticate with Shopify Storefront API
                const authResult = await authenticateCustomer(credentials.email, credentials.password);
                
                if (!authResult || authResult.customerUserErrors?.length > 0) {
                    console.log("❌ Shopify authentication failed:", authResult?.customerUserErrors?.[0]?.message || 'Invalid credentials');
                    return null;
                }

                if (!authResult.customerAccessToken) {
                    console.log("❌ No access token received from Shopify");
                    return null;
                }

                // Get customer data from Shopify
                const customerData = await getCustomerData(authResult.customerAccessToken.accessToken);
                
                if (!customerData) {
                    console.log("❌ Failed to get customer data from Shopify");
                    return null;
                }

                console.log("✅ Shopify authentication successful for:", customerData.email);

                // Find or create user in MongoDB (using UnifiedUserService for admin role assignment)
                let user;
                try {
                    user = await UnifiedUserService.findUserByEmailSafe(customerData.email);
                    
                    if (!user) {
                        // Create new admin user - only allow known admin emails
                        if (customerData.email === 'jacobaengel55@gmail.com') {
                            console.log("🔧 Creating new admin user for:", customerData.email);
                            
                            // Create admin user with Shopify data
                            const newUserData = {
                                firstName: customerData.firstName || 'Admin',
                                lastName: customerData.lastName || 'User',
                                email: customerData.email,
                                role: 'admin',
                                status: 'verified',
                                shopifyId: customerData.id,
                                phoneNumber: customerData.phone || '',
                                providers: {
                                    shopify: {
                                        id: customerData.id,
                                        verified: true,
                                        customerAccessToken: authResult.customerAccessToken.accessToken,
                                        lastSignIn: new Date()
                                    }
                                }
                                // Removed primaryProvider - we don't need it anymore
                            };
                            
                            user = await UnifiedUserService.createUser(newUserData);
                        } else {
                            console.log("❌ Email not authorized for admin access:", customerData.email);
                            return null;
                        }
                    } else {
                        // Update existing user's Shopify data
                        await UnifiedUserService.updateUserShopifyData(user.userID, {
                            shopifyId: customerData.id,
                            customerAccessToken: authResult.customerAccessToken.accessToken,
                            shopifyData: customerData
                        });
                    }
                } catch (dbError) {
                    console.error("❌ Database error:", dbError);
                    return null;
                }

                return {
                    userID: user.userID,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    shopifyCustomerID: customerData.id,
                    shopifyCustomerToken: authResult.customerAccessToken.accessToken,
                    provider: 'shopify',
                    image: user.image || null
                };

            } catch (error) {
                console.error("❌ Authentication failure:", error);
                return null;
            }
        }
    })
];

export const providerMap = providers.map((provider) => {
    if (typeof provider === 'function') {
        const providerData = provider();
        return { id: providerData.id, name: providerData.name };
    }
    return { id: provider.id, name: provider.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers,
    secret: process.env.NEXTAUTH_SECRET,
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        updateAge: 24 * 60 * 60, // 24 hours
    },
    jwt: {
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: '/auth/signin',
    },
    debug: true, // Enable debug mode for production troubleshooting
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            console.log('🔄 REDIRECT CALLBACK - URL:', url, 'BaseUrl:', baseUrl);
            // Allows relative callback URLs
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) return url;
            console.log('🔄 REDIRECT CALLBACK - Redirecting to dashboard');
            return baseUrl + "/dashboard";
        },
        async jwt({ token, account, user }) {
            console.log('🔍 JWT CALLBACK - Starting');
            console.log('📝 Account present:', !!account);
            console.log('📝 User data:', user ? {
                userID: user.userID,
                name: user.name,
                email: user.email,
                role: user.role,
                provider: user.provider
            } : 'No user data');
            
            // When the user signs in
            if (account) {
                console.log('✅ New sign-in, creating fresh token');
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token; // Store refresh token for later use
                token.accessTokenExpires = Date.now() + (account.expires_in || 3600) * 1000; // Calculate expiry time
                token.userID = user.userID;
                user.role === 'store' ? token.storeID = user.storeID : token.storeID = '';
                token.name = user.name;
                token.email = user.email;
                token.provider = user.provider;
                token.shopifyCustomerID = user.shopifyCustomerID;
                token.shopifyCustomerToken = user.shopifyCustomerToken;
                token.role = user.role;
                token.image = user.image;
                
                console.log('✅ Token created with:', {
                    userID: token.userID,
                    name: token.name,
                    email: token.email,
                    role: token.role,
                    provider: token.provider
                });
                console.log("JWT callback - New token created");
                return token;
            }
    
            // If there's an error from a previous refresh attempt, just return the token
            if (token.error === "RefreshAccessTokenError") {
                console.log("JWT callback - Previous refresh error, returning token as-is");
                return token;
            }

            // Return the token if the access token is still valid (with buffer)
            if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60000) { // 1 minute buffer
                console.log('✅ Token still valid, returning existing token');
                return token;
            }
    
            // Refresh the token if it has expired
            console.log("JWT callback - Token expired, attempting refresh");
            return await refreshAccessToken(token);
        },
    
        async session({ session, token }) {
            console.log('🔍 SESSION CALLBACK - Starting');
            console.log('📝 Token data:', {
                userID: token.userID,
                name: token.name,
                email: token.email,
                provider: token.provider,
                role: token.role
            });
            console.log('📝 Initial session user:', {
                name: session.user?.name,
                email: session.user?.email
            });
            
            try {
                // Fetch fresh user data from database to ensure current information
                console.log('🔍 Fetching user from database with userID:', token.userID);
                const currentUser = await UnifiedUserService.findUserByUserID(token.userID);
                
                console.log('📋 Database user result:', currentUser ? {
                    userID: currentUser.userID,
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    email: currentUser.email,
                    role: currentUser.role,
                    authProvider: currentUser.authProvider
                } : 'USER NOT FOUND');
                
                if (currentUser) {
                    const constructedName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
                    console.log('✅ Constructed name from DB:', constructedName);
                    
                    // Update session with current database values
                    session.user.id = currentUser.userID;
                    session.user.userID = currentUser.userID;
                    session.user.name = constructedName;
                    session.user.email = currentUser.email;
                    session.user.role = currentUser.role;
                    session.user.status = currentUser.status;
                    session.user.storeID = token.storeID;
                    session.user.image = currentUser.profileImage || currentUser.avatar || token.image;
                    
                    // Set provider data - Always Shopify since it's our only auth method
                    session.user.provider = 'shopify';
                    
                    // Set Shopify data from user record or token
                    if (currentUser.providers?.shopify) {
                        // New structure with providers object
                        session.user.shopifyCustomerID = currentUser.providers.shopify.id;
                        session.user.shopifyCustomerToken = currentUser.providers.shopify.customerAccessToken;
                    } else {
                        // Legacy user structure or token fallback
                        session.user.shopifyCustomerID = currentUser.shopifyCustomerID || token.shopifyCustomerID;
                        session.user.shopifyCustomerToken = currentUser.shopifyCustomerToken || token.shopifyCustomerToken;
                    }
                    
                    console.log('✅ Final session user after DB update:', {
                        name: session.user.name,
                        email: session.user.email,
                        userID: session.user.userID,
                        role: session.user.role,
                        provider: session.user.provider
                    });
                } else {
                    console.log('⚠️ User not found in database, using token fallback');
                    // Fallback to token data if user not found in database
                    session.user.id = token.userID;
                    session.user.userID = token.userID;
                    session.user.name = token.name;
                    session.user.provider = token.provider;
                    session.user.shopifyCustomerID = token.shopifyCustomerID;
                    session.user.shopifyCustomerToken = token.shopifyCustomerToken;
                    session.user.role = token.role;
                    session.user.image = token.image;
                    session.user.storeID = token.storeID;
                    
                    console.log('⚠️ Final session user after token fallback:', {
                        name: session.user.name,
                        email: session.user.email,
                        userID: session.user.userID
                    });
                }
                
                // Pass accessToken to the session for use in your app
                session.accessToken = token.accessToken;
                session.refreshToken = token.refreshToken;
                session.accessTokenExpires = token.accessTokenExpires;
                
                console.log('🎯 SESSION CALLBACK - Completed successfully');
                return session;
            } catch (error) {
                console.error('❌ Error in session callback:', error);
                console.error('❌ Error stack:', error.stack);
                // Fallback to token data on error
                session.accessToken = token.accessToken;
                session.refreshToken = token.refreshToken;
                session.accessTokenExpires = token.accessTokenExpires;
                session.user.userID = token.userID;
                session.user.storeID = token.storeID;
                session.user.role = token.role;
                session.user.image = token.image;
                
                console.log('⚠️ Using error fallback, final session user:', {
                    name: session.user.name,
                    userID: session.user.userID
                });
                return session;
            }
        },
        
    }
    
});


