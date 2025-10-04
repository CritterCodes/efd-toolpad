# Artisan Management System - Admin Interface

## Overview
The artisan management system provides a comprehensive admin interface to review, approve, and manage artisan partnership applications submitted through the customer-facing form.

## Features

### 🎯 **Core Functionality**
- **Application Review**: View detailed application information
- **Status Management**: Approve, reject, or delete applications
- **Search & Filter**: Find applications by name, email, status, type
- **Statistics Dashboard**: Real-time metrics and overview
- **Email Notifications**: Automated status change notifications

### 📊 **Dashboard Components**

#### 1. **Admin Dashboard Integration** (`/dashboard/admin`)
- Added "Artisan Management" section to main admin dashboard
- Quick access to application management
- Visual card layout with action buttons

#### 2. **Application Management** (`/dashboard/admin/artisans`)
- **Statistics Cards**: Total, Pending, Approved, Rejected counts
- **Filter System**: Status, artisan type, search by name/email
- **Applications Table**: Comprehensive view with actions
- **Detailed View Dialog**: Full application information
- **Bulk Actions**: Approve/reject with review notes

#### 3. **Overview Dashboard** (`/dashboard/admin/artisans/overview`)
- Quick stats summary
- Recent pending applications
- Quick action buttons
- Navigation shortcuts

### 🔧 **Technical Implementation**

#### API Endpoints
```
GET /api/artisan                     - List applications (with filters)
GET /api/artisan?action=stats        - Get statistics
GET /api/artisan/:id                 - Get specific application
PATCH /api/artisan/:id               - Update application status
DELETE /api/artisan/:id              - Delete application
```

#### Database Service (`lib/artisanService.js`)
- **getAllArtisanApplications()** - Fetch with filters
- **getArtisanApplicationById()** - Get single application
- **updateArtisanApplicationStatus()** - Change status with notes
- **getArtisanApplicationStats()** - Count by status
- **searchArtisanApplications()** - Text search
- **deleteArtisanApplication()** - Remove application

#### Email Service (`lib/emailService.js`)
- **sendApplicationStatusEmail()** - Status change notifications
- **sendWelcomeEmail()** - Approved artisan welcome
- **emailTemplates** - HTML/text templates for notifications

### 🎨 **User Interface**

#### Application Table Columns
- Application ID (unique identifier)
- Applicant Name
- Email Address
- Business Name
- Artisan Type
- Status (with color coding)
- Submission Date
- Action Buttons

#### Action Buttons
- 👁️ **View**: See full application details
- ✅ **Approve**: Approve with optional notes
- ❌ **Reject**: Reject with optional notes
- 🗑️ **Delete**: Remove application permanently

#### Status Color Coding
- 🟡 **Pending**: Warning/Yellow
- 🟢 **Approved**: Success/Green
- 🔴 **Rejected**: Error/Red

### 📱 **Responsive Design**
- Mobile-friendly interface
- Collapsible table on smaller screens
- Touch-friendly action buttons
- Responsive grid layout for stats

### 🔍 **Search & Filter Options**

#### Search Fields
- Applicant name (first/last)
- Email address
- Business name
- Application ID

#### Filter Options
- **Status**: All, Pending, Approved, Rejected
- **Artisan Type**: All types from application form
- **Date Range**: Future enhancement

### 📧 **Email Notifications**

#### Approval Email Template
- Congratulations message
- Application details
- Next steps information
- Welcome message

#### Rejection Email Template
- Professional decline message
- Optional feedback/notes
- Encouragement for future applications

### 🚀 **Usage Instructions**

#### For Admin Users:

1. **Access Management**: Navigate to `/dashboard/admin/artisans`
2. **Review Applications**: Click "View" to see full details
3. **Take Action**: Use approve/reject buttons with optional notes
4. **Filter & Search**: Use filters to find specific applications
5. **Monitor Stats**: Check overview dashboard for metrics

#### Workflow:
1. New applications appear as "Pending"
2. Admin reviews application details
3. Admin approves/rejects with notes
4. System sends automatic email notification
5. Application status updates in database
6. Statistics refresh automatically

### 🔧 **Configuration**

#### Environment Variables
```
MONGODB_URI=your_mongodb_connection_string
MONGO_DB_NAME=your_database_name
```

#### Dependencies Added
- Material-UI components for admin interface
- Email service framework (ready for SMTP integration)
- Database service using existing MongoDB connection

### 🛠️ **Future Enhancements**

#### Planned Features
- **Email Integration**: Connect real SMTP service
- **Export Functionality**: Download applications as CSV/PDF
- **Batch Operations**: Multi-select approve/reject
- **Advanced Analytics**: Application trends, conversion rates
- **Artisan Portal**: Approved artisan dashboard access
- **Document Management**: File upload/download for portfolios
- **Integration**: Sync approved artisans to Shopify vendors

#### Technical Improvements
- **Pagination**: Handle large application volumes
- **Real-time Updates**: Live status changes
- **Audit Trail**: Track all status changes
- **Role-based Access**: Different admin permission levels

### 📋 **Admin Actions Available**

#### Application Review
- View complete application details
- See uploaded files and portfolios
- Review business information
- Check social media links

#### Status Management
- Approve applications with welcome process
- Reject with constructive feedback
- Add internal review notes
- Delete inappropriate applications

#### Communication
- Automated email notifications
- Status change confirmations
- Welcome emails for approved artisans
- Professional rejection notices

This system provides a complete solution for managing artisan partnerships, from initial application review to final approval and onboarding communication.