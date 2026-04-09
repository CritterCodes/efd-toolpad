export function useArtisanProductFilters(products, filterStatus) {
  const filteredProducts = filterStatus === 'all'
    ? products
    : products.filter(p => p.status === filterStatus);

  const getStatusColor = (status) => {
    const colors = {
      'draft': '#94a3b8',
      'pending-approval': '#eab308',
      'approved': '#22c55e',
      'published': '#0ea5e9',
      'revision-requested': '#f97316',
      'rejected': '#ef4444',
      'archived': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Draft',
      'pending-approval': 'Pending Review',
      'approved': 'Approved',
      'published': 'Published',
      'revision-requested': 'Revision Needed',
      'rejected': 'Rejected',
      'archived': 'Archived'
    };
    return labels[status] || status;
  };

  return {
    filteredProducts,
    getStatusColor,
    getStatusLabel
  };
}
