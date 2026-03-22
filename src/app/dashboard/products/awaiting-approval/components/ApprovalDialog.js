import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    TextField,
    CircularProgress
} from '@mui/material';

export default function ApprovalDialog({
    approvalDialog,
    setApprovalDialog,
    approvalAction,
    selectedProduct,
    approvalNotes,
    setApprovalNotes,
    handleSubmitApproval,
    actionLoading
}) {
    return (
        <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
            <DialogTitle>
                {approvalAction === 'approve' ? '✅ Approve & Publish Product' : '❌ Reject Product'}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                    <strong>{selectedProduct?.title}</strong>
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                    {approvalAction === 'approve'
                        ? 'This will approve and publish the product immediately. It will appear on the website for customers to purchase.'
                        : 'This will reject the product and return it to the artisan for revisions.'}
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={approvalAction === 'approve' ? 'Notes (optional)' : 'Rejection reason (required)'}
                    placeholder={approvalAction === 'reject' ? 'Enter reason for rejection...' : 'Any notes for the artisan...'}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    disabled={actionLoading}
                />
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={() => setApprovalDialog(false)}
                    disabled={actionLoading}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    color={approvalAction === 'approve' ? 'success' : 'error'}
                    onClick={handleSubmitApproval}
                    disabled={
                        actionLoading ||
                        (approvalAction !== 'approve' && !approvalNotes.trim())
                    }
                    startIcon={actionLoading ? <CircularProgress size={20} /> : null}
                >
                    {actionLoading ? 'Processing...' : approvalAction === 'approve' ? 'Approve & Publish' : 'Reject'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
