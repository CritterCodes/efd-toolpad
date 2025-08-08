# EFD CRM Project Roadmap 2025

## Overview
This roadmap outlines the development phases for the Engel Fine Design CRM system, focusing on repair workflow automation, payment processing integration, custom order management, and in-house artisan tracking.

---

## 🎯 Current Status
- ✅ **Phase 0: Foundation Complete**
  - Repair creation workflow
  - Task/Process/Materials system
  - Print layout system
  - Quality control workflow
  - Pricing calculations (wholesale/retail)
  - Real-time context state management

- ✅ **Recent Workflow Improvements (January 2025)**
  - **Ready for Work System**: Comprehensive jeweler assignment and work prioritization
  - **Receiving Page**: Intake management with search and status tracking
  - **Navigation Reordering**: Workflow-based organization (Receiving → Parts → Ready for Work → Quality Control → Payment & Pickup)
  - **Payment & Pickup Planning**: System architecture defined for Phase 1 development
  - **Modular Architecture**: All new features follow strict MVC(C) compliance

---

## 🏗️ MANDATORY DEVELOPMENT STANDARDS

**⚠️ CRITICAL: All new development MUST follow strict modular MVC(C) architecture**

See [`DEVELOPMENT_STANDARDS.md`](./DEVELOPMENT_STANDARDS.md) for complete requirements.

### Required Structure for ALL New Features:
- **Model Layer**: Pure data structures only
- **Controller Layer**: Request/response handling only  
- **Service Layer**: Business logic & database operations only
- **API Service Layer**: External API calls only
- **Utility Layer**: Pure helper functions only
- **Component Layer**: Modular, single-responsibility components
- **Page Layer**: Composition only, no business logic

### Architecture Compliance:
- ✅ Strict separation of concerns
- ✅ No mixed responsibilities between layers
- ✅ Modular components with single purposes
- ✅ Reusable services and utilities
- ✅ Testable, maintainable code structure

**Any code not following these standards will be rejected.**

---

## 📋 Phase Definitions

### 🚀 Phase 1: Payment Processing & Order Fulfillment System
**Target: Q1 2025 | Priority: HIGH | Duration: 3-4 weeks**

**Goal:** Automate the transition from completed repairs to payment collection via Shopify integration through a comprehensive Payment & Pickup system.

#### Payment & Pickup System Overview:
The **Payment & Pickup** page will serve as the central hub for order processing and customer fulfillment, replacing the basic pickup functionality with a comprehensive order management system.

#### Core Features:

**1. Customer Order Bundling**
- Automatically group completed repairs by customer
- Display bundled repairs as "Orders" ready for payment processing
- Show order totals including taxes and service fees
- Visual organization by customer with repair counts and values

**2. Shopify Order Creation**
- One-click Shopify order creation for bundled repairs
- Automatic line item generation with repair details
- Integration with existing Shopify product catalog
- Order tracking and status synchronization

**3. Bulk Pickup Processing**
- Mark multiple repairs as picked up simultaneously
- Update all repairs in an order to "COMPLETED" status
- Generate pickup receipts and confirmations
- Track pickup dates and customer signatures

**4. Order Splitting Capabilities**
- Split large orders into multiple pickups
- Handle partial payment scenarios
- Manage deposits and remaining balances
- Customer communication for split orders

**5. Payment Workflow Integration**
- Payment status tracking (Pending, Paid, Partial, etc.)
- Automated customer notifications via Shopify
- Payment confirmation handling
- Integration with existing repair status workflow

#### User Stories:
1. **As a shop manager**, I want repairs marked "ready for pickup" to automatically create a Payment Order for that client
2. **As a shop manager**, I want to group multiple ready repairs for the same client into one Payment Order with order splitting options
3. **As a shop manager**, I want to review Payment Orders before sending them to Shopify
4. **As a shop manager**, I want to create Shopify orders with one click for payment collection
5. **As a shop manager**, I want to mark entire orders as picked up in bulk operations
6. **As a client**, I want to receive a Shopify invoice to complete payment online

#### Technical Requirements:
- **MANDATORY**: Full MVC(C) modular architecture compliance
- Payment Order model with client grouping and order splitting (Model Layer)
- PaymentOrderService for business logic and Shopify integration (Service Layer)  
- PaymentOrderController for API handling (Controller Layer)
- Shopify integration service for order creation and status sync (API Service Layer)
- Payment order utilities for calculations and validations (Utility Layer)
- Modular components: PaymentOrderGrid, PaymentOrderCard, PaymentOrderForm, OrderSplitModal
- Email notification system via Shopify
- Payment tracking and status updates
- Integration with existing repair workflow

#### Sprint Breakdown:
**Sprint 1.1: Payment Orders Foundation (Week 1)**
- Create Payment Order model and API endpoints
- Build Payment Orders dashboard
- Implement automatic Payment Order creation on repair completion

**Sprint 1.2: Shopify Integration (Week 2)**
- Shopify API integration setup
- Order creation workflow
- Line item mapping from repairs to Shopify products

**Sprint 1.3: Client Communication (Week 3)**
- Email notification system
- Payment status tracking
- Client-facing payment interface

**Sprint 1.4: Testing & Refinement (Week 4)**
- End-to-end testing
- Error handling and edge cases
- Performance optimization

---

### 🎨 Phase 2: Custom Orders & Client Communication System
**Target: Q2 2025 | Priority: MEDIUM-HIGH | Duration: 4-5 weeks**

**Goal:** Expand beyond repairs to handle custom jewelry orders with enhanced client communication and design workflows.

#### Core Components:
- **Custom Order Management System**
- **Design Fee Calculator**
- **Client Communication Portal**
- **Advanced Workflow Tracking**

#### User Stories:
1. **As a sales person**, I want to create custom orders with design fees and material estimates
2. **As a client**, I want to communicate with the design team through a comments system
3. **As a designer**, I want to track design approval stages and revisions
4. **As a shop manager**, I want to apply markup rules to custom orders
5. **As a client**, I want to approve designs and pricing before production begins

#### Technical Requirements:
- **MANDATORY**: Full MVC(C) modular architecture compliance
- Custom Order model extending repair functionality (Model Layer)
- CustomOrderService for business logic (Service Layer)
- CustomOrderController for API handling (Controller Layer) 
- Comments/communication system with notifications (Service Layer)
- Design approval workflow utilities (Utility Layer)
- Modular components: CustomOrderGrid, CustomOrderCard, CustomOrderForm, CommentsPanel
- Advanced pricing calculator with design fees
- Client portal for order tracking and communication

#### Sprint Breakdown:
**Sprint 2.1: Custom Order Foundation (Week 1)**
- Custom Order model and basic CRUD
- Design fee integration
- Admin settings for custom order parameters

**Sprint 2.2: Communication System (Week 2)**
- Comments system with real-time notifications
- File upload for design mockups
- Client communication portal

**Sprint 2.3: Advanced Workflow (Week 3)**
- Design approval stages
- Client approval interface
- Revision tracking system

**Sprint 2.4: Integration & Polish (Week 4)**
- Integration with existing repair system
- Print layouts for custom orders
- Testing and refinement

**Sprint 2.5: Client Experience (Week 5)**
- Client dashboard improvements
- Mobile-responsive design
- Documentation and training materials

---

### 👥 Phase 3: In-House Artisan Management & Cost Tracking
**Target: Q3 2025 | Priority: MEDIUM | Duration: 5-6 weeks**

**Goal:** Track artisan productivity, manage bench rent payments, and provide detailed cost accounting for tax purposes.

#### Core Components:
- **Artisan Management System**
- **Bench Rent Tracking**
- **Task Completion Analytics**
- **Payout Calculator**
- **Tax Reporting Dashboard**

#### Artisan Types:
- **Jewelers** (bench rent: $250/month)
- **Lapidiarists** (stone cutting/setting specialists)
- **Designers** (CAD/hand-drawn design work)
- **Engravers** (personalization services)

#### User Stories:
1. **As a shop manager**, I want to track which artisan completed which tasks
2. **As a shop manager**, I want to automatically calculate monthly bench rent
3. **As an artisan**, I want to see my completed work and earnings
4. **As an accountant**, I want detailed cost reports for tax filing
5. **As a shop manager**, I want to analyze artisan productivity and profitability

#### Technical Requirements:
- **MANDATORY**: Full MVC(C) modular architecture compliance
- Artisan profiles with specializations (Model Layer)
- ArtisanService for business logic & calculations (Service Layer)
- ArtisanController for API handling (Controller Layer)
- Task assignment and completion tracking utilities (Utility Layer)
- Modular components: ArtisanGrid, ArtisanCard, ArtisanForm, ProductivityDashboard
- Bench rent calculation system
- Payout and expense tracking
- Comprehensive reporting dashboard
- Tax document generation

#### Sprint Breakdown:
**Sprint 3.1: Artisan Profiles (Week 1)**
- Artisan model and management interface
- Skill/specialization tracking
- Basic profile management

**Sprint 3.2: Task Assignment System (Week 2)**
- Task-to-artisan assignment workflow
- Completion tracking integration
- Time tracking capabilities

**Sprint 3.3: Financial Tracking (Week 3)**
- Bench rent calculation system
- Payout tracking and calculation
- Expense categorization

**Sprint 3.4: Analytics & Reporting (Week 4)**
- Productivity analytics dashboard
- Cost analysis reports
- Performance metrics

**Sprint 3.5: Tax & Compliance (Week 5)**
- Tax document generation
- Compliance reporting
- Integration with accounting software

**Sprint 3.6: Polish & Documentation (Week 6)**
- User interface improvements
- System documentation
- Training materials

---

## 🔄 Ongoing Maintenance & Enhancements

### Continuous Improvements:
- **Performance Optimization** - Database indexing, query optimization
- **Security Updates** - Regular security audits and updates
- **User Experience** - Interface improvements based on feedback
- **API Enhancements** - Extended Shopify integration capabilities
- **Mobile Optimization** - Improved mobile experience
- **Backup & Recovery** - Enhanced data protection systems

### Future Considerations (Post-Phase 3):
- **Multi-location Support** - If business expands
- **Advanced Analytics** - Business intelligence dashboard
- **Customer Portal** - Enhanced client self-service capabilities
- **Inventory Management** - Material and supply tracking
- **Vendor Management** - External vendor/supplier integration

---

## 📊 Success Metrics

### Phase 1 Metrics:
- Reduction in payment collection time
- Increase in payment completion rate
- Decreased manual order creation time
- Client satisfaction with payment process

### Phase 2 Metrics:
- Custom order conversion rate
- Design approval cycle time
- Client communication engagement
- Average custom order value

### Phase 3 Metrics:
- Artisan productivity improvements
- Accurate cost tracking for tax purposes
- Bench rent collection efficiency
- Profitability analysis accuracy

---

## 🛠️ Technical Debt & Infrastructure

### Immediate Needs:
- Database optimization for growing data sets
- Enhanced error handling and logging
- Automated testing suite expansion
- API rate limiting and security hardening

### Long-term Infrastructure:
- Scalable cloud architecture
- Advanced backup and disaster recovery
- Performance monitoring and alerting
- Comprehensive documentation system

---

## 📅 Timeline Summary

| Phase | Duration | Target Completion | Priority |
|-------|----------|------------------|----------|
| Phase 1: Payment Processing | 3-4 weeks | End of January 2025 | HIGH |
| Phase 2: Custom Orders | 4-5 weeks | End of March 2025 | MEDIUM-HIGH |
| Phase 3: Artisan Management | 5-6 weeks | End of May 2025 | MEDIUM |

**Total Estimated Development Time: 12-15 weeks**

---

## 🎯 Next Steps

1. **Immediate Action**: Begin Phase 1 Sprint 1.1 - Payment Orders Foundation
2. **Stakeholder Review**: Validate Phase 1 requirements with shop management
3. **Technical Planning**: Finalize Shopify API integration architecture
4. **Resource Allocation**: Ensure development capacity for timeline commitments

---

*This roadmap is a living document and will be updated as requirements evolve and new insights emerge during development.*
