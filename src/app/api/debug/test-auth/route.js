/**
 * Debug endpoint to test authentication flow
 * GET /api/debug/test-auth?email=jacobaengel55@gmail.com
 */

import { UnifiedUserService } from '../../../../lib/unifiedUserService.js';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'jacobaengel55@gmail.com';
    
    console.log('🧪 DEBUG: Testing authentication flow for:', email);
    
    // Step 1: Test database connection
    console.log('🔍 Step 1: Testing database connection...');
    
    // Step 2: Test finding user by email
    console.log('🔍 Step 2: Testing findUserByEmailSafe...');
    const existingUser = await UnifiedUserService.findUserByEmailSafe(email);
    console.log('📋 User found:', !!existingUser);
    
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: 'User not found in database',
        email: email
      });
    }
    
    // Step 3: Test simulated Google profile
    console.log('🔍 Step 3: Testing authenticateWithGoogle with simulated profile...');
    const mockGoogleProfile = {
      sub: "100433438914596237396",
      email: email,
      email_verified: true,
      name: "jacob engel",
      given_name: "jacob",
      family_name: "engel",
      picture: "https://lh3.googleusercontent.com/test"
    };
    
    const result = await UnifiedUserService.authenticateWithGoogle(mockGoogleProfile, {
      role: existingUser.role,
      status: "active"
    });
    
    console.log('✅ Authentication test successful');
    
    return NextResponse.json({
      success: true,
      message: 'Authentication flow test completed successfully',
      userRole: result.role,
      userID: result.userID,
      hasProviders: !!result.providers,
      primaryProvider: result.primaryProvider
    });
    
  } catch (error) {
    console.error('❌ Authentication test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      details: {
        name: error.name,
        code: error.code
      }
    }, { status: 500 });
  }
}