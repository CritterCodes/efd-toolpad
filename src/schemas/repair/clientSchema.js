
export const clientBreakdown = {
  userID: { type: 'string', required: true, description: 'Client user ID' },
  clientName: { type: 'string', required: true, description: 'Client full name' },
  businessName: { type: 'string', default: '', description: 'Business name for wholesale clients' }
};

export const defaultClientData = {
  userID: '',
  clientName: '',
  businessName: ''
};
