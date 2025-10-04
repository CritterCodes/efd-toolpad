// Script to create test artisan application data
const { MongoClient } = require('mongodb');

function generateId() {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

async function createTestData() {
  const client = new MongoClient(
    process.env.MONGODB_URI || 'mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=10000&authSource=admin&appName=mongosh+2.3.3'
  );
  
  try {
    await client.connect();
    const db = client.db('efd-database-DEV'); // Use the correct database name
    
    console.log('🔧 Creating test artisan application data...');
    
    // Create a test user with pending artisan application
    const testUser = {
      _id: new Date().getTime().toString(),
      firstName: 'John',
      lastName: 'Smith',
      email: 'john.smith@example.com',
      phoneNumber: '+1-555-0123',
      role: 'artisan-applicant',
      createdAt: new Date(),
      artisanApplication: {
        applicationId: `APP-${generateId()}`,
        businessName: 'Smith Custom Jewelry',
        artisanType: 'jeweler',
        yearsOfExperience: 5,
        description: 'Specializing in custom engagement rings and fine jewelry repair. I have been crafting jewelry for over 5 years and take pride in creating unique pieces for my clients.',
        specialties: ['Ring Making', 'Stone Setting', 'Repair Work'],
        services: ['Custom Design', 'Repairs', 'Resizing'],
        materials: ['Gold', 'Silver', 'Platinum', 'Diamonds'],
        techniques: ['Hand Forging', 'CAD Design', 'Lost Wax Casting'],
        status: 'pending',
        submittedAt: new Date(),
        updatedAt: new Date()
      }
    };
    
    // Create another approved artisan
    const approvedUser = {
      _id: (new Date().getTime() + 1).toString(),
      firstName: 'Sarah',
      lastName: 'Johnson',
      email: 'sarah.johnson@example.com',
      phoneNumber: '+1-555-0456',
      role: 'artisan',
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      artisanApplication: {
        applicationId: `APP-${generateId()}`,
        businessName: 'Johnson Engraving Studio',
        artisanType: 'engraver',
        yearsOfExperience: 8,
        description: 'Professional jewelry engraving with 8 years of experience. I specialize in hand engraving and modern laser engraving techniques.',
        specialties: ['Hand Engraving', 'Laser Engraving', 'Monograms'],
        services: ['Custom Engraving', 'Restoration', 'Personalization'],
        materials: ['Gold', 'Silver', 'Stainless Steel', 'Titanium'],
        techniques: ['Hand Engraving', 'Laser Engraving', 'Relief Engraving'],
        status: 'approved',
        submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        approvedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
        reviewedBy: 'admin',
        reviewNotes: 'Excellent portfolio and credentials. Approved for artisan status.',
        updatedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
      }
    };
    
    // Insert the test users
    await db.collection('users').insertMany([testUser, approvedUser]);
    
    console.log('✅ Created test users:');
    console.log(`📋 Pending application: ${testUser.firstName} ${testUser.lastName} (${testUser.email})`);
    console.log(`👨‍🎨 Approved artisan: ${approvedUser.firstName} ${approvedUser.lastName} (${approvedUser.email})`);
    
    // Check the stats
    const stats = await Promise.all([
      db.collection('users').countDocuments({ role: { $in: ['artisan-applicant', 'artisan'] }, artisanApplication: { $exists: true } }),
      db.collection('users').countDocuments({ role: 'artisan-applicant', 'artisanApplication.status': 'pending' }),
      db.collection('users').countDocuments({ role: 'artisan', 'artisanApplication.status': 'approved' }),
      db.collection('users').countDocuments({ role: { $in: ['artisan-applicant', 'artisan'] }, 'artisanApplication.status': 'rejected' })
    ]);
    
    console.log('\n📊 Current stats:');
    console.log(`Total applications: ${stats[0]}`);
    console.log(`Pending: ${stats[1]}`);
    console.log(`Approved: ${stats[2]}`);
    console.log(`Rejected: ${stats[3]}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

createTestData();