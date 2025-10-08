import pkg from './src/lib/unifiedUserService.js';
const { UnifiedUserService } = pkg;

// Simulate the exact Google profile data from production
const googleProfile = {
  iss: "https://accounts.google.com",
  azp: "523569218823-rpjhlr649blrotf6q8qokc8aafjherv3.apps.googleusercontent.com",
  aud: "523569218823-rpjhlr649blrotf6q8qokc8aafjherv3.apps.googleusercontent.com",
  sub: "100433438914596237396",
  email: "jacobaengel55@gmail.com",
  email_verified: true,
  at_hash: "7YoNIe7ms2FI7eTk1RLoiA",
  name: "jacob engel",
  picture: "https://lh3.googleusercontent.com/a/ACg8ocINVfa6HmBRhqgbKsfubWlClfbtVzXMtwD4-l1oO6p6vRZS6c9uMg=s96-c",
  given_name: "jacob",
  family_name: "engel",
  iat: 1759799948,
  exp: 1759803548
};

async function testProductionAuth() {
  try {
    console.log('🔍 Testing production authentication flow...');
    
    // Step 1: Check if user exists
    console.log('\n--- STEP 1: Finding existing user ---');
    const existingUser = await UnifiedUserService.findUserByEmailSafe(googleProfile.email);
    console.log('Existing user found:', !!existingUser);
    if (existingUser) {
      console.log('User details:', {
        userID: existingUser.userID,
        role: existingUser.role,
        status: existingUser.status,
        hasGoogleProvider: !!existingUser.providers?.google,
        hasShopifyProvider: !!existingUser.providers?.shopify,
        primaryProvider: existingUser.primaryProvider
      });
    }
    
    // Step 2: Test the authentication method
    console.log('\n--- STEP 2: Testing authenticateWithGoogle ---');
    const result = await UnifiedUserService.authenticateWithGoogle(googleProfile, {
      provider: 'google',
      role: existingUser ? existingUser.role : 'admin',
      status: "active"
    });
    
    console.log('Authentication result:', {
      userID: result.userID,
      email: result.email,
      role: result.role,
      status: result.status,
      primaryProvider: result.primaryProvider,
      hasGoogleProvider: !!result.providers?.google,
      hasShopifyProvider: !!result.providers?.shopify
    });
    
    // Step 3: Test findUserByUserID (used in session callback)
    console.log('\n--- STEP 3: Testing findUserByUserID ---');
    const userById = await UnifiedUserService.findUserByUserID(result.userID);
    console.log('findUserByUserID result:', !!userById);
    if (userById) {
      console.log('User by ID details:', {
        userID: userById.userID,
        role: userById.role,
        status: userById.status,
        email: userById.email
      });
    }
    
    console.log('\n✅ Production auth test completed successfully');
    
  } catch (error) {
    console.error('❌ Production auth test failed:', error);
    console.error('Error stack:', error.stack);
  }
}

testProductionAuth().then(() => {
  console.log('Debug script completed');
  process.exit(0);
}).catch(error => {
  console.error('Debug script failed:', error);
  process.exit(1);
});