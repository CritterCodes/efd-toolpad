import { connectToDatabase } from '../mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import ShopifyCustomerService from '../shopifyCustomerService.js';
import { USER_ROLES, USER_STATUS, AUTH_PROVIDERS, ROLE_PERMISSIONS } from './user.constants.js';
import { UserQueryService } from './user.query.service.js';
import { UserRoleService } from './user.role.service.js';
import { UserNotificationService } from './user.notification.service.js';

export class UserAuthService {
  static shopifyService = new ShopifyCustomerService();

  static async authenticateWithGoogle(googleProfile, additionalData = {}) {
    console.log("��� UnifiedUserService.authenticateWithGoogle started for:", googleProfile.email);
    try {
      const { db } = await connectToDatabase();
      
      let user = await UserQueryService.findUserByEmailSafe(googleProfile.email);
      
      if (user) {
        const updateData = { lastSignIn: new Date(), updatedAt: new Date() };

        if (!user.providers) {
          updateData.providers = {
            [AUTH_PROVIDERS.GOOGLE]: {
              id: googleProfile.sub,
              verified: true,
              profile: googleProfile,
              lastSignIn: new Date()
            }
          };
          updateData.primaryProvider = AUTH_PROVIDERS.GOOGLE;
        } else {
          updateData[`providers.${AUTH_PROVIDERS.GOOGLE}`] = {
            id: googleProfile.sub,
            verified: true,
            profile: googleProfile,
            lastSignIn: new Date()
          };
        }

        if (!user.primaryProvider) {
          updateData.primaryProvider = AUTH_PROVIDERS.GOOGLE;
        }

        if (additionalData.role && additionalData.role !== user.role) {
          const shouldUpdateRole = UserRoleService.shouldAllowRoleUpdate(user.role, additionalData.role);
          if (shouldUpdateRole) {
            updateData.role = additionalData.role;
            updateData.permissions = ROLE_PERMISSIONS[additionalData.role];
            updateData.status = UserRoleService.getDefaultStatusForRole(additionalData.role);
          }
        }

        const hasShopifyAccount = user.providers?.shopify?.id;
        
        if (!hasShopifyAccount) {
          try {
            const shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
            if (!user.providers) {
              updateData.providers[AUTH_PROVIDERS.SHOPIFY] = {
                id: shopifyCustomer.id, verified: true, lastSignIn: new Date()
              };
            } else {
              updateData[`providers.${AUTH_PROVIDERS.SHOPIFY}`] = {
                id: shopifyCustomer.id, verified: true, lastSignIn: new Date()
              };
            }
          } catch (shopifyError) {
            console.warn('Failed to create Shopify account:', shopifyError.message);
          }
        } else {
          try {
            await this.shopifyService.linkGoogleAccount(user.providers.shopify.id, googleProfile);
            updateData.linkedAt = new Date();
          } catch (linkError) {
            console.warn('Failed to link Google account to Shopify:', linkError.message);
          }
        }

        await db.collection('users').updateOne(
          { userID: user.userID },
          { $set: updateData }
        );

        return await UserQueryService.findUserByUserID(user.userID);
      } else {
        let shopifyCustomer = null;
        try {
          shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
        } catch (shopifyError) {
          console.warn('Failed to create Shopify account:', shopifyError.message);
        }

        const role = additionalData.role || USER_ROLES.CLIENT;
        const newUser = {
          userID: uuidv4(),
          email: googleProfile.email,
          firstName: googleProfile.given_name,
          lastName: googleProfile.family_name,
          role: role,
          status: UserRoleService.getDefaultStatusForRole(role),
          permissions: ROLE_PERMISSIONS[role],
          primaryProvider: AUTH_PROVIDERS.GOOGLE,
          providers: {
            [AUTH_PROVIDERS.GOOGLE]: {
              id: googleProfile.sub,
              verified: true,
              profile: googleProfile,
              lastSignIn: new Date()
            }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignIn: new Date(),
          approvalData: UserRoleService.requiresApproval(role) ? {
            requestedAt: new Date(),
            requestedRole: role,
            businessInfo: additionalData.businessInfo || {},
            status: USER_STATUS.PENDING
          } : null,
          ...additionalData
        };

        if (shopifyCustomer) {
          newUser.providers[AUTH_PROVIDERS.SHOPIFY] = {
            id: shopifyCustomer.id,
            verified: true,
            lastSignIn: new Date()
          };
        }

        await db.collection('users').insertOne(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('ERROR in authenticateWithGoogle:', error);
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }

  static async authenticateWithShopify(email, password, additionalData = {}) {
    try {
      const { db } = await connectToDatabase();
      const shopifyAuth = await this.shopifyService.authenticateCustomer(email, password);
      const shopifyCustomer = shopifyAuth.customer;

      let user = await UserQueryService.findUserByEmailSafe(email);
      
      if (user) {
        const updateData = {
          [`providers.${AUTH_PROVIDERS.SHOPIFY}`]: {
            id: shopifyCustomer.id,
            verified: true,
            customerAccessToken: shopifyAuth.accessToken,
            lastSignIn: new Date()
          },
          lastSignIn: new Date(),
          updatedAt: new Date()
        };

        if (!user.providers) {
          updateData.providers = {};
          updateData.primaryProvider = AUTH_PROVIDERS.SHOPIFY;
        }

        if (!user.primaryProvider) {
          updateData.primaryProvider = AUTH_PROVIDERS.SHOPIFY;
        }

        if (user.providers?.google?.id) {
          try {
            await this.shopifyService.linkGoogleAccount(shopifyCustomer.id, user.providers.google.profile);
            updateData.linkedAt = new Date();
          } catch (linkError) {
            console.warn('Failed to link Google account during Shopify auth:', linkError.message);
          }
        }

        await db.collection('users').updateOne(
          { userID: user.userID },
          { $set: updateData }
        );

        const updatedUser = await UserQueryService.findUserByUserID(user.userID);
        return { user: updatedUser, shopifyAuth };
      } else {
        const role = additionalData.role || USER_ROLES.CLIENT;
        const newUser = {
          userID: uuidv4(),
          email: shopifyCustomer.email,
          firstName: shopifyCustomer.firstName,
          lastName: shopifyCustomer.lastName,
          phoneNumber: shopifyCustomer.phone,
          role: role,
          status: UserRoleService.getDefaultStatusForRole(role),
          permissions: ROLE_PERMISSIONS[role],
          primaryProvider: AUTH_PROVIDERS.SHOPIFY,
          providers: {
            [AUTH_PROVIDERS.SHOPIFY]: {
              id: shopifyCustomer.id,
              verified: true,
              customerAccessToken: shopifyAuth.accessToken,
              lastSignIn: new Date()
            }
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignIn: new Date(),
          approvalData: UserRoleService.requiresApproval(role) ? {
            requestedAt: new Date(),
            requestedRole: role,
            businessInfo: additionalData.businessInfo || {},
            status: USER_STATUS.PENDING
          } : null,
          ...additionalData
        };

        await db.collection('users').insertOne(newUser);
        return { user: newUser, shopifyAuth };
      }
    } catch (error) {
      console.error('Error authenticating with Shopify:', error);
      throw error;
    }
  }

  static async registerWithShopify(userData) {
    try {
      const { email, password, firstName, lastName, phoneNumber, role, businessInfo } = userData;
      const existingUser = await UserQueryService.findUserByEmailSafe(email);
      if (existingUser) throw new Error('User with this email already exists');

      const shopifyCustomer = await this.shopifyService.registerCustomer({
        firstName, lastName, email, password, phoneNumber
      });

      const userRole = role || USER_ROLES.CLIENT;
      const newUser = {
        userID: uuidv4(),
        email: email,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: phoneNumber,
        role: userRole,
        status: UserRoleService.getDefaultStatusForRole(userRole),
        permissions: ROLE_PERMISSIONS[userRole],
        primaryProvider: AUTH_PROVIDERS.SHOPIFY,
        providers: {
          [AUTH_PROVIDERS.SHOPIFY]: {
            id: shopifyCustomer.id,
            verified: true,
            lastSignIn: new Date()
          }
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignIn: new Date(),
        approvalData: UserRoleService.requiresApproval(userRole) ? {
          requestedAt: new Date(),
          requestedRole: userRole,
          businessInfo: businessInfo || {},
          status: USER_STATUS.PENDING
        } : null
      };

      const { db } = await connectToDatabase();
      await db.collection('users').insertOne(newUser);
      
      if (UserRoleService.requiresApproval(userRole)) {
        await UserNotificationService.sendPendingApprovalNotification(newUser);
      }

      return newUser;
    } catch (error) {
      console.error('Error registering with Shopify:', error);
      throw error;
    }
  }
}
