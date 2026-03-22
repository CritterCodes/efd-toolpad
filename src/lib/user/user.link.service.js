import { connectToDatabase } from '../mongodb.js';
import ShopifyCustomerService from '../shopifyCustomerService.js';
import { AUTH_PROVIDERS } from './user.constants.js';
import { UserQueryService } from './user.query.service.js';

export class UserLinkService {
  static shopifyService = new ShopifyCustomerService();

  static async linkGoogleAccount(userID, googleProfile) {
    try {
      const { db } = await connectToDatabase();
      const user = await UserQueryService.findUserByUserID(userID);
      
      if (!user) throw new Error('User not found');
      if (user.providers?.google?.id) throw new Error('Google account already linked');

      const updateData = {
        [`providers.${AUTH_PROVIDERS.GOOGLE}`]: {
          id: googleProfile.sub,
          verified: true,
          profile: googleProfile,
          lastSignIn: new Date()
        },
        linkedAt: new Date(),
        updatedAt: new Date()
      };

      if (!user.providers?.shopify?.id) {
        try {
          const shopifyCustomer = await this.shopifyService.createCustomerForGoogleUser(googleProfile);
          updateData[`providers.${AUTH_PROVIDERS.SHOPIFY}`] = {
            id: shopifyCustomer.id,
            verified: true,
            lastSignIn: new Date()
          };
        } catch (shopifyError) {
          console.warn('Failed to create Shopify account during Google linking:', shopifyError.message);
        }
      } else {
        try {
          await this.shopifyService.linkGoogleAccount(user.providers.shopify.id, googleProfile);
        } catch (linkError) {
          console.warn('Failed to link Google account to Shopify:', linkError.message);
        }
      }

      await db.collection('users').updateOne({ userID }, { $set: updateData });
      console.log('✅ Successfully linked Google account to user');
      return await UserQueryService.findUserByUserID(userID);
    } catch (error) {
      console.error('Error linking Google account:', error);
      throw error;
    }
  }

  static async linkShopifyAccount(userID, email, password) {
    try {
      const { db } = await connectToDatabase();
      const user = await UserQueryService.findUserByUserID(userID);
      
      if (!user) throw new Error('User not found');
      if (user.providers?.shopify?.id) throw new Error('Shopify account already linked');

      const shopifyAuth = await this.shopifyService.authenticateCustomer(email, password);
      const shopifyCustomer = shopifyAuth.customer;

      const updateData = {
        [`providers.${AUTH_PROVIDERS.SHOPIFY}`]: {
          id: shopifyCustomer.id,
          verified: true,
          customerAccessToken: shopifyAuth.accessToken,
          lastSignIn: new Date()
        },
        linkedAt: new Date(),
        updatedAt: new Date()
      };

      if (user.providers?.google?.id) {
        try {
          await this.shopifyService.linkGoogleAccount(shopifyCustomer.id, user.providers.google.profile);
        } catch (linkError) {
          console.warn('Failed to link Google account to Shopify during linking:', linkError.message);
        }
      }

      await db.collection('users').updateOne({ userID }, { $set: updateData });
      console.log('✅ Successfully linked Shopify account to user');
      return await UserQueryService.findUserByUserID(userID);
    } catch (error) {
      console.error('Error linking Shopify account:', error);
      throw error;
    }
  }

  static async unlinkProvider(userID, provider) {
    try {
      const { db } = await connectToDatabase();
      const user = await UserQueryService.findUserByUserID(userID);
      
      if (!user) throw new Error('User not found');
      if (!user.providers?.[provider]) throw new Error(`${provider} account not linked`);

      const linkedProviders = Object.keys(user.providers || {});
      if (linkedProviders.length <= 1) throw new Error('Cannot unlink the only authentication provider');

      await db.collection('users').updateOne(
        { userID },
        { 
          $unset: { [`providers.${provider}`]: "" },
          $set: { updatedAt: new Date() }
        }
      );

      console.log(`✅ Successfully unlinked ${provider} account from user`);
      return await UserQueryService.findUserByUserID(userID);
    } catch (error) {
      console.error(`Error unlinking ${provider} account:`, error);
      throw error;
    }
  }
}
