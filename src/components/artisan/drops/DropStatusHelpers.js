export const getStatusColor = (status) => {
  const colors = {
    'open': '#10b981',
    'closed': '#ef4444',
    'in-review': '#f59e0b',
    'completed': '#6366f1',
    'pending': '#eab308',
    'approved': '#10b981',
    'rejected': '#ef4444',
    'not-submitted': '#9ca3af'
  };
  return colors[status] || '#6b7280';
};

export const getStatusLabel = (status) => {
  const labels = {
    'open': 'Now Open',
    'closed': 'Closed',
    'in-review': 'In Review',
    'completed': 'Completed',
    'pending': 'Pending Review',
    'approved': 'Selected!',
    'rejected': 'Not Selected',
    'not-submitted': 'Not Submitted'
  };
  return labels[status] || status;
};
