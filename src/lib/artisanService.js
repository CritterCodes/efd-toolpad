// lib/artisanService.js
// Service functions for artisan application management

import { db } from './database.js';

/**
 * Get all artisan applications with optional filters
 * @param {Object} filters - Filter options
 * @returns {Array} - Array of applications from users with role 'artisan-applicant' or 'artisan'
 */
export async function getAllArtisanApplications(filters = {}) {
  try {
    const database = await db.connect();
    
    let query = {
      role: { $in: ['artisan-applicant', 'artisan'] },
      artisanApplication: { $exists: true }
    };
    
    // Filter by status (check status in artisanApplication field)
    if (filters.status) {
      query['artisanApplication.status'] = filters.status;
    }
    
    // Filter by date range (check submittedAt in artisanApplication field)
    if (filters.dateFrom || filters.dateTo) {
      query['artisanApplication.submittedAt'] = {};
      if (filters.dateFrom) {
        query['artisanApplication.submittedAt'].$gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        query['artisanApplication.submittedAt'].$lte = new Date(filters.dateTo);
      }
    }
    
    // Filter by artisan type - handle both array and string formats
    if (filters.artisanType) {
      query.$or = [
        { 'artisanApplication.artisanType': filters.artisanType }, // String format (legacy)
        { 'artisanApplication.artisanType': { $in: [filters.artisanType] } } // Array format
      ];
    }
    
    const usersCollection = await db.dbUsers();
    const users = await usersCollection
      .find(query)
      .sort({ 'artisanApplication.submittedAt': -1 })
      .toArray();
    
    // Transform users to look like the old application format
    const applications = users.map(user => {
      const application = {
        applicationId: user.artisanApplication.applicationId,
        userID: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        ...user.artisanApplication
      };

      // Parse comma-separated string fields back into arrays
      const arrayFields = ['artisanType', 'specialties', 'services', 'materials', 'techniques'];
      arrayFields.forEach(field => {
        if (application[field] && typeof application[field] === 'string') {
          application[field] = application[field].split(', ').filter(item => item.trim() !== '');
        }
      });

      return application;
    });
    
    return applications;
  } catch (error) {
    console.error('Error fetching artisan applications:', error);
    throw error;
  }
}

/**
 * Get artisan application by application ID
 * @param {string} applicationId - The application ID
 * @returns {Object|null} - Application data or null
 */
export async function getArtisanApplicationById(applicationId) {
  try {
    const usersCollection = await db.dbUsers();
    
    const user = await usersCollection
      .findOne({ 
        'artisanApplication.applicationId': applicationId,
        role: { $in: ['artisan-applicant', 'artisan'] }
      });
    
    if (!user) return null;
    
    // Transform user to look like the old application format
    const application = {
      applicationId: user.artisanApplication.applicationId,
      userID: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      ...user.artisanApplication
    };

    // Parse comma-separated string fields back into arrays
    const arrayFields = ['artisanType', 'specialties', 'services', 'materials', 'techniques'];
    arrayFields.forEach(field => {
      if (application[field] && typeof application[field] === 'string') {
        application[field] = application[field].split(', ').filter(item => item.trim() !== '');
      }
    });

    return application;
  } catch (error) {
    console.error('Error fetching artisan application by ID:', error);
    throw error;
  }
}

/**
 * Update artisan application status
 * @param {string} applicationId - The application ID
 * @param {string} status - New status ('pending', 'approved', 'rejected')
 * @param {string} reviewedBy - ID of the admin who reviewed
 * @param {string} reviewNotes - Optional review notes
 * @returns {boolean} - Success status
 */
export async function updateArtisanApplicationStatus(applicationId, status, reviewedBy, reviewNotes = '') {
  try {
    const usersCollection = await db.dbUsers();
    
    const updateData = {
      'artisanApplication.status': status,
      'artisanApplication.reviewedBy': reviewedBy,
      'artisanApplication.reviewNotes': reviewNotes,
      'artisanApplication.reviewedAt': new Date(),
      'artisanApplication.updatedAt': new Date()
    };

    // If approving, set approved date and change role from 'artisan-applicant' to 'artisan'
    if (status === 'approved') {
      updateData['artisanApplication.approvedAt'] = new Date();
      updateData.role = 'artisan';
      
      // Generate slug for the artisan profile if not exists
      const user = await usersCollection.findOne({ 'artisanApplication.applicationId': applicationId });
      if (user && !user.artisanApplication.slug) {
        const businessName = user.artisanApplication.businessName || `${user.firstName} ${user.lastName}`;
        const slug = generateSlug(businessName);
        updateData['artisanApplication.slug'] = slug;
      }
    }
    
    const result = await usersCollection
      .updateOne(
        { 'artisanApplication.applicationId': applicationId },
        { $set: updateData }
      );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error updating artisan application status:', error);
    throw error;
  }
}

/**
 * Get artisan application statistics
 * @returns {Object} - Statistics object
 */
export async function getArtisanApplicationStats() {
  try {
    const usersCollection = await db.dbUsers();
    
    const [totalCount, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      usersCollection.countDocuments({ 
        role: { $in: ['artisan-applicant', 'artisan'] },
        artisanApplication: { $exists: true }
      }),
      usersCollection.countDocuments({ 
        role: 'artisan-applicant',
        'artisanApplication.status': 'pending'
      }),
      usersCollection.countDocuments({ 
        role: 'artisan',
        'artisanApplication.status': 'approved'
      }),
      usersCollection.countDocuments({ 
        role: { $in: ['artisan-applicant', 'artisan'] },
        'artisanApplication.status': 'rejected'
      })
    ]);
    
    return {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount
    };
  } catch (error) {
    console.error('Error fetching artisan application stats:', error);
    throw error;
  }
}

/**
 * Search artisan applications
 * @param {string} searchTerm - Search term
 * @param {Object} filters - Additional filters
 * @returns {Array} - Matching applications
 */
export async function searchArtisanApplications(searchTerm, filters = {}) {
  try {
    const usersCollection = await db.dbUsers();
    
    let query = {
      role: { $in: ['artisan-applicant', 'artisan'] },
      artisanApplication: { $exists: true }
    };
    
    // Add text search if search term provided
    if (searchTerm) {
      query.$or = [
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { 'artisanApplication.businessName': { $regex: searchTerm, $options: 'i' } },
        { 'artisanApplication.applicationId': { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Add filters
    if (filters.status) {
      query['artisanApplication.status'] = filters.status;
    }
    
    if (filters.artisanType) {
      query.$or = [
        { 'artisanApplication.artisanType': filters.artisanType }, // String format (legacy)
        { 'artisanApplication.artisanType': { $in: [filters.artisanType] } } // Array format
      ];
    }
    
    const users = await usersCollection
      .find(query)
      .sort({ 'artisanApplication.submittedAt': -1 })
      .toArray();
    
    // Transform users to look like the old application format
    const applications = users.map(user => {
      const application = {
        applicationId: user.artisanApplication.applicationId,
        userID: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        ...user.artisanApplication
      };

      // Parse comma-separated string fields back into arrays
      const arrayFields = ['artisanType', 'specialties', 'services', 'materials', 'techniques'];
      arrayFields.forEach(field => {
        if (application[field] && typeof application[field] === 'string') {
          application[field] = application[field].split(', ').filter(item => item.trim() !== '');
        }
      });

      return application;
    });
    
    return applications;
  } catch (error) {
    console.error('Error searching artisan applications:', error);
    throw error;
  }
}

/**
 * Delete artisan application
 * @param {string} applicationId - The application ID
 * @returns {boolean} - Success status
 */
export async function deleteArtisanApplication(applicationId) {
  try {
    const usersCollection = await db.dbUsers();
    
    // Remove the artisan application data and reset role to 'customer' if needed
    const result = await usersCollection
      .updateOne(
        { 'artisanApplication.applicationId': applicationId },
        { 
          $unset: { artisanApplication: "" },
          $set: { role: 'customer' }
        }
      );
    
    return result.modifiedCount > 0;
  } catch (error) {
    console.error('Error deleting artisan application:', error);
    throw error;
  }
}

/**
 * Generate URL-friendly slug from name
 * @param {string} name - Name to convert to slug
 * @returns {string} - URL-friendly slug
 */
function generateSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}