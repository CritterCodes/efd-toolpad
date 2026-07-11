import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    TextField,
    CircularProgress,
    Box,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

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
    const isApprove = approvalAction === 'approve';

    return (
        <Dialog
            open={approvalDialog}
            onClose={() => setApprovalDialog(false)}
            maxWidth="sm"
            fullWidth
            PaperProps={{ sx: { backgroundColor: REPAIRS_UI.bgPanel, backgroundImage: 'none', border: `1px solid ${REPAIRS_UI.border}` } }}
        >
            <DialogTitle sx={{ color: REPAIRS_UI.textHeader, display: 'flex', alignItems: 'center', gap: 1 }}>
                {isApprove
                    ? <CheckCircleIcon sx={{ color: '#66BB6A' }} />
                    : <CancelIcon sx={{ color: '#EF5350' }} />}
                {isApprove ? 'Approve & Publish Product' : 'Reject Product'}
            </DialogTitle>
            <DialogContent sx={{ pt: 2 }}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600, color: REPAIRS_UI.textHeader }}>
                    {selectedProduct?.title}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: REPAIRS_UI.textSecondary }}>
                    {isApprove
                        ? 'This will approve and publish the product immediately. It will appear on the website for customers to purchase.'
                        : 'This will reject the product and return it to the artisan for revisions.'}
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label={isApprove ? 'Notes (optional)' : 'Rejection reason (required)'}
                    placeholder={!isApprove ? 'Enter reason for rejection...' : 'Any notes for the artisan...'}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    disabled={actionLoading}
                />
                {!isApprove && !approvalNotes.trim() && (
                    <Typography variant="caption" sx={{ color: REPAIRS_UI.textMuted, mt: 0.5, display: 'block' }}>
                        A rejection reason is required.
                    </Typography>
                )}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button
                    onClick={() => setApprovalDialog(false)}
                    disabled={actionLoading}
                    sx={{ color: REPAIRS_UI.textSecondary }}
                >
                    Cancel
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmitApproval}
                    disabled={actionLoading || (!isApprove && !approvalNotes.trim())}
                    startIcon={actionLoading ? <CircularProgress size={18} sx={{ color: '#1A1A1A' }} /> : null}
                    sx={isApprove
                        ? { backgroundColor: '#66BB6A', color: '#1A1A1A', fontWeight: 600, '&:hover': { backgroundColor: '#57A05A' } }
                        : { backgroundColor: '#EF5350', color: '#fff', fontWeight: 600, '&:hover': { backgroundColor: '#C62828' } }}
                >
                    {actionLoading ? 'Processing...' : isApprove ? 'Approve & Publish' : 'Reject'}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
