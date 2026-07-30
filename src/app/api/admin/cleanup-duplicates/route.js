import { requireRole } from '@/lib/apiAuth';
import { STAFF_ROLES } from '@/lib/designPermissions';
import UnifiedUserService from '../../../../lib/unifiedUserService.js';

/**
 * STAFF ONLY. `middleware.js` skips `/api/*`, so this route owns its auth — and it had none, which
 * made a GET both DESTRUCTIVE and a PII dump: `initializeDatabase()` deletes duplicate user rows, and
 * the response body lists emails, full names, userIDs and providers. Anyone could have triggered it.
 */
export async function GET(request) {
  const { errorResponse } = await requireRole(STAFF_ROLES);
  if (errorResponse) return errorResponse;
  try {
    console.log('🚀 Starting duplicate user cleanup via API...');
    
    // Find duplicates first
    const duplicates = await UnifiedUserService.findDuplicateEmails();
    
    if (duplicates.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No duplicate emails found!',
        duplicates: []
      });
    }
    
    const duplicateInfo = duplicates.map(group => ({
      email: group._id,
      count: group.count,
      users: group.users.map(user => ({
        userID: user.userID,
        name: `${user.firstName} ${user.lastName}`,
        providers: Object.keys(user.providers || {}),
        updatedAt: user.updatedAt,
        createdAt: user.createdAt
      }))
    }));
    
    console.log(`⚠️ Found ${duplicates.length} emails with duplicates`);
    
    // Initialize database (this will clean up duplicates)
    await UnifiedUserService.initializeDatabase();
    
    console.log('✅ Cleanup completed!');
    
    return Response.json({ 
      success: true, 
      message: `Cleaned up ${duplicates.length} duplicate email groups`,
      duplicatesFound: duplicateInfo
    });
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}