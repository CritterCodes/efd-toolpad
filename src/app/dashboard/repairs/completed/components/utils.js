export const getStatusColor = (status) => {
    const colorMap = {
        'COMPLETED': 'success',
        'READY FOR PICKUP': 'primary',
        'READY FOR PICK-UP': 'primary',
        'DELIVERY BATCHED': 'secondary',
        'PAID_CLOSED': 'default'
    };
    return colorMap[status] || 'default';
};

export const getStatusLabel = (status) => {
    const labelMap = {
        'COMPLETED': 'Completed',
        'READY FOR PICKUP': 'Ready for Pickup',
        'READY FOR PICK-UP': 'Ready for Pickup',
        'DELIVERY BATCHED': 'Delivery Batched',
        'PAID_CLOSED': 'Paid / Closed'
    };
    return labelMap[status] || status;
};

export const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
};

export const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'N/A';
    return `$${parseFloat(amount).toFixed(2)}`;
};
