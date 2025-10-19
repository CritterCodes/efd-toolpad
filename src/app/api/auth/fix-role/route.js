import { NextResponse } from 'next/server'
import UserModel from '../../auth/[...nextauth]/model.js'

export async function POST(request) {
  try {
    console.log('🔧 === USER ROLE FIX START ===')
    console.log('⏰ Timestamp:', new Date().toISOString())
    
    const { email, newRole } = await request.json()
    
    if (!email || !newRole) {
      return NextResponse.json({ 
        error: 'Email and newRole are required',
        example: { email: 'user@example.com', newRole: 'admin' }
      }, { status: 400 })
    }
    
    console.log('👤 Looking up user:', email)
    
    // First, let's see what's currently in the database
    const currentUser = await UserModel.findByEmail(email)
    
    if (!currentUser) {
      console.log('❌ User not found in database')
      return NextResponse.json({ 
        error: 'User not found in database',
        email 
      }, { status: 404 })
    }
    
    console.log('📋 Current user data:')
    console.log('  🆔 UserID:', currentUser.userID)
    console.log('  📧 Email:', currentUser.email)
    console.log('  🎭 Current Role:', currentUser.role)
    console.log('  📋 Status:', currentUser.status)
    console.log('  👤 Name:', currentUser.firstName, currentUser.lastName)
    
    // Update the role
    console.log('🔄 Updating role from', currentUser.role, 'to', newRole)
    
    const updatedUser = await UserModel.updateUserRole(email, newRole)
    
    if (updatedUser) {
      console.log('✅ Role updated successfully')
      console.log('  📧 Email:', updatedUser.email)
      console.log('  🎭 New Role:', updatedUser.role)
      
      return NextResponse.json({
        success: true,
        message: 'Role updated successfully',
        user: {
          email: updatedUser.email,
          oldRole: currentUser.role,
          newRole: updatedUser.role,
          userID: updatedUser.userID
        }
      })
    } else {
      console.log('❌ Role update failed')
      return NextResponse.json({ 
        error: 'Failed to update role' 
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('❌ Error in role fix:', error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 })
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url)
    const email = url.searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ 
        error: 'Email parameter required',
        example: '/api/auth/fix-role?email=user@example.com'
      }, { status: 400 })
    }
    
    console.log('🔍 Looking up user:', email)
    
    const user = await UserModel.findByEmail(email)
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        email 
      }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      user: {
        userID: user.userID,
        email: user.email,
        role: user.role,
        status: user.status,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      }
    })
    
  } catch (error) {
    console.error('❌ Error getting user:', error)
    return NextResponse.json({ 
      error: error.message 
    }, { status: 500 })
  }
}