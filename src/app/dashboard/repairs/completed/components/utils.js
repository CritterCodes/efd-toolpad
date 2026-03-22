export const getStatusColor = (status) => {
    const colorMap = {
        'completed': 'success',
        'picked-up': 'primary',
        'delivered': 'success'
    };
    return colorMap[status] || 'default';
};

export const getStatusLabel = (status) => {
    const labelMap = {
        'completed': 'Completed',
        'picked-up': 'Picked Up',
        'delivered': 'Delivered'
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
