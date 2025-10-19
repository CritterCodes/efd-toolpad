// lib/wholesaleService.js
// Service functions for wholesale application management

import { db } from './database.js';

/**
 * Get all wholesale applications with optional filters
 * @param {Object} filters - Filter options
 * @returns {Array} - Array of applications from users with role 'wholesale-applicant' or 'wholesaler'
 */
export async function getAllWholesaleApplications(filters = {}) {
  try {
    const database = await db.connect();
    
    let query = {
      role: { $in: ['wholesale-applicant', 'wholesaler'] },
      wholesaleApplication: { $exists: true }
    };
    
    // Filter by status (check status in wholesaleApplication field)
    if (filters.status) {
      query['wholesaleApplication.status'] = filters.status;
    }
    
    // Filter by date range (check submittedAt in wholesaleApplication field)
    if (filters.dateFrom || filters.dateTo) {
      query['wholesaleApplication.submittedAt'] = {};
      if (filters.dateFrom) {
        query['wholesaleApplication.submittedAt'].$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query['wholesaleApplication.submittedAt'].$lte = new Date(filters.dateTo);
      }
    }
    
    const usersCollection = await db.dbUsers();
    const users = await usersCollection
      .find(query)
      .sort({ 'wholesaleApplication.submittedAt': -1 })
      .toArray();
    
    // Transform users to look like the application format similar to artisan
    const applications = users.map(user => {
      const application = {
        applicationId: user.wholesaleApplication.applicationId,
        userID: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        ...user.wholesaleApplication
      };

      return application;
    });
    
    // Reduced verbose logging
    return applications;
  } catch (error) {
    console.error('Error fetching wholesale applications:', error);
    throw error;
  }
}

/**
 * Get wholesale application by application ID
 * @param {string} applicationId - The application ID
 * @returns {Object|null} - Application data or null
 */
export async function getWholesaleApplicationById(applicationId) {
  try {
    const usersCollection = await db.dbUsers();
    
    const user = await usersCollection
      .findOne({ 
        'wholesaleApplication.applicationId': applicationId,
        role: { $in: ['wholesale-applicant', 'wholesaler'] }
      });
    
    if (!user) return null;
    
    // Transform user to look like the application format
    const application = {
      applicationId: user.wholesaleApplication.applicationId,
      userID: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      ...user.wholesaleApplication
    };

    return application;
  } catch (error) {
    console.error('Error fetching wholesale application by ID:', error);
    throw error;
  }
}

/**
 * Update wholesale application status
 * @param {string} applicationId - The application ID
 * @param {string} status - New status ('pending', 'approved', 'rejected')
 * @param {string} reviewedBy - ID of the admin who reviewed
 * @param {string} reviewNotes - Optional review notes
 * @returns {boolean} - Success status
 */
export async function updateWholesaleApplicationStatus(applicationId, status, reviewedBy, reviewNotes = '') {
  try {
    const usersCollection = await db.dbUsers();
    const now = new Date();
    
    const updateData = {
      'wholesaleApplication.status': status,
      'wholesaleApplication.reviewedAt': now,
      'wholesaleApplication.reviewedBy': reviewedBy,
      'wholesaleApplication.reviewNotes': reviewNotes,
      'wholesaleApplication.updatedAt': now,
      updatedAt: now
    };

    // If approving, change role to 'wholesaler' and set approved date
    if (status === 'approved') {
      updateData.role = 'wholesaler';
      updateData['wholesaleApplication.approvedAt'] = now;
    }

    const result = await usersCollection.updateOne(
      { 'wholesaleApplication.applicationId': applicationId },
      { $set: updateData }
    );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating wholesale application status:', error);
    throw error;
  }
}

/**
 * Get wholesale application statistics
 * @returns {Object} - Statistics object with counts by status
 */
export async function getWholesaleApplicationStats() {
  try {
    const usersCollection = await db.dbUsers();
    
    const pipeline = [
      {
        $match: {
          wholesaleApplication: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$wholesaleApplication.status',
          count: { $sum: 1 }
        }
      }
    ];
    
    const statusCounts = await usersCollection.aggregate(pipeline).toArray();
    
    // Initialize stats
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0
    };
    
    // Populate stats from aggregation results
    statusCounts.forEach(item => {
      const status = item._id;
      const count = item.count;
      
      stats.total += count;
      
      if (status === 'pending') {
        stats.pending = count;
      } else if (status === 'approved') {
        stats.approved = count;
      } else if (status === 'rejected') {
        stats.rejected = count;
      }
    });
    
    // Reduced verbose logging
    return stats;
  } catch (error) {
    console.error('Error fetching wholesale stats:', error);
    throw error;
  }
}

/**
 * Delete wholesale application
 * @param {string} applicationId - The application ID
 * @returns {boolean} - Success status
 */
export async function deleteWholesaleApplication(applicationId) {
  try {
    const usersCollection = await db.dbUsers();
    
    // Remove the wholesale application data and reset role to 'customer' if needed
    const result = await usersCollection
      .updateOne(
        { 'wholesaleApplication.applicationId': applicationId },
        { 
          $unset: { wholesaleApplication: "" },
          $set: { role: 'customer' }
        }
      );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error deleting wholesale application:', error);
    throw error;
  }
}