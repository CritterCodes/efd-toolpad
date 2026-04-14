import { connectToDatabase } from '../mongodb.js';
import { v4 as uuidv4 } from 'uuid';
import { USER_ROLES, USER_STATUS, AUTH_PROVIDERS, ROLE_PERMISSIONS } from './user.constants.js';
import { UserQueryService } from './user.query.service.js';
import { UserRoleService } from './user.role.service.js';
import { UserNotificationService } from './user.notification.service.js';

export class UserAuthService {

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

        await db.collection('users').updateOne(
          { userID: user.userID },
          { $set: updateData }
        );

        return await UserQueryService.findUserByUserID(user.userID);
      } else {
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

        await db.collection('users').insertOne(newUser);
        return newUser;
      }
    } catch (error) {
      console.error('ERROR in authenticateWithGoogle:', error);
      throw new Error(`Google authentication failed: ${error.message}`);
    }
  }
}
