export const getStatusColor = (status) => {
    const colorMap = {
        'COMPLETED': 'success',
        'READY FOR PICK-UP': 'primary'
    };
    return colorMap[status] || 'default';
};

export const getStatusLabel = (status) => {
    const labelMap = {
        'COMPLETED': 'Completed',
        'READY FOR PICK-UP': 'Ready for Pick-Up'
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
