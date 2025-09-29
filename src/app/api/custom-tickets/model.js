/**
 * Custom Tickets Main Model - Data Layer Orchestration
 * Constitutional Architecture: Model Layer
 * Responsibility: Coordinate data access, validation, and business rules
 */

import TicketValidationModel from './models/TicketValidationModel.js';
import TicketBusinessRulesModel from './models/TicketBusinessRulesModel.js';
import TicketDataAccessModel from './models/TicketDataAccessModel.js';

export default class CustomTicketModel {
  static collection = 'customTickets';

  // ===== VALIDATION OPERATIONS =====

  static async validateTicketId(ticketId) {
    return await TicketValidationModel.validateTicketId(ticketId);
  }

  static async validateTicketData(ticketData) {
    return await TicketValidationModel.validateTicketData(ticketData);
  }

  static async validateUpdateData(updateData) {
    return await TicketValidationModel.validateUpdateData(updateData);
  }

  static async validateOrderData(orderData) {
    return await TicketValidationModel.validateOrderData(orderData);
  }

  // ===== BUSINESS RULES OPERATIONS =====

  static async validateStatusTransition(ticketId, newStatus) {
    return await TicketBusinessRulesModel.validateStatusTransition(ticketId, newStatus);
  }

  static async applyCreationBusinessRules(ticketData) {
    return await TicketBusinessRulesModel.applyCreationBusinessRules(ticketData);
  }

  static async applyUpdateBusinessRules(updateData) {
    return await TicketBusinessRulesModel.applyUpdateBusinessRules(updateData);
  }

  static async validateDeletion(ticketId) {
    return await TicketBusinessRulesModel.validateDeletion(ticketId);
  }

  static async generateTicketID() {
    return await TicketBusinessRulesModel.generateTicketID();
  }

  static isTicketEditable(ticket) {
    return TicketBusinessRulesModel.isTicketEditable(ticket);
  }

  static canModifyStatus(currentStatus, userRole) {
    return TicketBusinessRulesModel.canModifyStatus(currentStatus, userRole);
  }

  // ===== DATA ACCESS OPERATIONS =====

  static async getCollection() {
    return await TicketDataAccessModel.getCollection();
  }

  static async findById(ticketId) {
    return await TicketDataAccessModel.findById(ticketId);
  }

  static async create(ticketData) {
    // Apply validation
    await this.validateTicketData(ticketData);
    
    // Apply business rules
    const processedData = await this.applyCreationBusinessRules(ticketData);
    
    // Create in database
    return await TicketDataAccessModel.create(processedData);
  }

  static async updateById(ticketId, updateData) {
    // Validate ticket ID
    await this.validateTicketId(ticketId);
    
    // Validate update data
    await this.validateUpdateData(updateData);
    
    // Apply business rules
    const processedData = await this.applyUpdateBusinessRules(updateData);
    
    // Update in database
    return await TicketDataAccessModel.updateById(ticketId, processedData);
  }

  static async deleteById(ticketId) {
    // Validate ticket ID
    await this.validateTicketId(ticketId);
    
    // Validate deletion is allowed
    await this.validateDeletion(ticketId);
    
    // Delete from database
    return await TicketDataAccessModel.deleteById(ticketId);
  }

  static async findWithFilters(filters) {
    return await TicketDataAccessModel.findWithFilters(filters);
  }

  static async countByStatus() {
    return await TicketDataAccessModel.countByStatus();
  }

  static async getStatistics() {
    return await TicketDataAccessModel.getStatistics();
  }
}
