// /api/users/[userID]/route.js
// API endpoint for individual user operations

import { NextResponse } from 'next/server';
import UserService from '../service.js';

export async function GET(request, { params }) {
  try {
    const { userID } = params;
    
    if (!userID) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const user = await UserService.getUserById(userID);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: user 
    });
    
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { userID } = params;
    const updateData = await request.json();
    
    if (!userID) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Remove fields that shouldn't be updated directly
    const { _id, userID: userId, createdAt, ...safeUpdateData } = updateData;
    
    // Add updatedAt timestamp
    safeUpdateData.updatedAt = new Date();

    const updatedUser = await UserService.updateUser(userID, safeUpdateData);
    
    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'User not found or update failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      data: updatedUser,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { userID } = params;
    
    if (!userID) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await UserService.deleteUser(userID);
    
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'User not found or deletion failed' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}