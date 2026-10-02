import * as React from 'react';
import Image from 'next/image';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Grid,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Alert
} from '@mui/material';
import {
    Print as PrintIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Schedule as ScheduleIcon,
    Person as PersonIcon,
    Category as CategoryIcon
} from '@mui/icons-material';
import { isWholesalerViewer } from '@/lib/repairAccess';
import { tint, facelift } from '@/components/facelift';

// Two rows used to carry light-theme Material fills — #e3f2fd on a Stuller line, #ffebee on the rush fee —
// which on the near-black ground rendered white text on near-white at about 1.1:1 and 1.05:1. The Stuller
// row is the one naming the metal to pull, so the line a jeweler needs was the line he could not read.
// `tint()` is DESIGN.md's triplet for a tinted region: ~13% fill, 42% stroke, full-strength text.
const INFO = tint(facelift.info);
const ERROR = tint(facelift.error);

/**
 * The read-only repair detail screen, moved verbatim out of page.js on 2026-10-02 for max-lines. The page keeps the
 * data fetching, the access check and the three navigation handlers; everything below is presentational, plus the
 * three pure functions the screen reads its numbers from.
 *
 * `calculateDisplayedRepairTotal` is the one to be careful with: it adds the line items up and only falls back to the
 * stored total when that sum is zero, so a ticket whose lines were cleared still shows what the client was told.
 */
export const calculateDisplayedRepairTotal = (repairRecord) => {
    if (!repairRecord) return 0;

    const lineItemsTotal = [
        ...(repairRecord.tasks || []),
        ...(repairRecord.processes || []),
        ...(repairRecord.materials || []),
        ...(repairRecord.customLineItems || []),
        ...(repairRecord.repairTasks || []),
    ].reduce((sum, item) => sum + ((parseFloat(item.price || 0) || 0) * (item.quantity || 1)), 0);

    const rushFee = parseFloat(repairRecord.rushFee || repairRecord.rushJobFee || 0) || 0;
    const deliveryFee = parseFloat(repairRecord.deliveryFee || 0) || 0;
    const taxAmount = parseFloat(repairRecord.taxAmount || 0) || 0;
    const computedTotal = lineItemsTotal + rushFee + deliveryFee + taxAmount;
    const storedTotal = parseFloat(repairRecord.totalPrice || repairRecord.totalCost || 0) || 0;

    return computedTotal > 0 ? computedTotal : storedTotal;
};

/** Every line on the ticket, from all five places a line can live, each tagged with how it will be labelled. */
export const buildWorkItems = (repair) => [
    ...(repair?.tasks || []).map(item => ({ ...item, type: 'Task', category: 'Service' })),
    ...(repair?.processes || []).map(item => ({ ...item, type: 'Process', category: 'Service' })),
    ...(repair?.materials || []).map(item => ({ ...item, type: 'Material', category: 'Material' })),
    ...(repair?.customLineItems || []).map(item => ({ ...item, type: 'Custom', category: 'Custom' })),
    ...(repair?.repairTasks || []).map(item => ({ ...item, type: 'Legacy Task', category: 'Legacy' }))
];

export const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
        case 'completed': return 'success';
        case 'in progress': return 'info';
        case 'pending': return 'warning';
        case 'cancelled': return 'error';
        default: return 'default';
    }
};

export function QuoteRequestAlerts({ repair, session }) {
    return (
        <>
            {repair.quoteRequest?.status === 'requested' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    <strong>{repair.businessName || 'The store'} asked for a quote.</strong>{' '}
                    {session?.user?.role === 'wholesaler'
                        ? 'EFD will price this repair and notify you.'
                        : 'Edit the repair and add the work; the moment it has a price the store is notified with the number.'}
                </Alert>
            )}
            {repair.quoteRequest?.status === 'quoted' && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    Quoted ${Number(repair.quoteRequest.quotedTotal || repair.totalCost || 0).toFixed(2)} on {new Date(repair.quoteRequest.quotedAt).toLocaleDateString()}. The store was notified.
                </Alert>
            )}
        </>
    );
}

export function RepairHeaderCard({ repair, session, clientInfo, onPrint, onEdit, onDelete }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                {/* Wraps: at 320px the three buttons ran 58px past the edge and Delete was unreachable. */}
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', wordBreak: 'break-word' }}>
                        Repair {repair.repairID}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={<PrintIcon />}
                            onClick={onPrint}
                            color="primary"
                        >
                            Print
                        </Button>
                        {/* Hide Edit and Delete buttons for wholesalers */}
                        {!isWholesalerViewer(session) && (
                            <>
                                <Button
                                    variant="outlined"
                                    startIcon={<EditIcon />}
                                    onClick={onEdit}
                                    color="info"
                                >
                                    Edit
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<DeleteIcon />}
                                    onClick={onDelete}
                                    color="error"
                                >
                                    Delete
                                </Button>
                            </>
                        )}
                    </Box>
                </Box>

                <Grid container spacing={3}>
                    {/* Client Information */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon /> Client Information
                        </Typography>
                        <Typography><strong>Name:</strong> {repair.clientName}</Typography>
                        {clientInfo && (
                            <>
                                <Typography><strong>Email:</strong> {clientInfo.email}</Typography>
                                <Typography><strong>Phone:</strong> {clientInfo.phone || 'N/A'}</Typography>
                                <Typography><strong>Role:</strong> {clientInfo.role}</Typography>
                            </>
                        )}
                    </Grid>

                    {/* Repair Status & Dates */}
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon /> Status & Timeline
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                            <Chip
                                label={repair.status || 'Pending'}
                                color={getStatusColor(repair.status)}
                                variant="filled"
                            />
                            {repair.isRush && (
                                <Chip
                                    label="🚨 RUSH JOB"
                                    color="error"
                                    variant="filled"
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Box>
                        <Typography><strong>Created:</strong> {new Date(repair.createdAt || Date.now()).toLocaleDateString()}</Typography>
                        <Typography><strong>Promise Date:</strong> {repair.promiseDate || 'N/A'}</Typography>
                        <Typography><strong>Due Date:</strong> {repair.dueDate || 'N/A'}</Typography>
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
}

export function RepairItemDetailsCard({ repair }) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CategoryIcon /> Item Details
                </Typography>

                {repair.picture && (
                    <Box sx={{ mb: 2, textAlign: 'center', position: 'relative', width: '100%', height: '300px' }}>
                        <Image
                            src={repair.picture}
                            alt="Repair Item"
                            fill
                            style={{
                                objectFit: 'contain',
                                border: '1px solid #ddd',
                                borderRadius: '8px'
                            }}
                        />
                    </Box>
                )}

                <Typography sx={{ mb: 1 }}><strong>Description:</strong> {repair.description}</Typography>
                <Typography sx={{ mb: 1 }}><strong>Metal Type:</strong> {repair.metalType || 'N/A'}</Typography>
                {repair.karat && (
                    <Typography sx={{ mb: 1 }}><strong>Karat:</strong> {repair.karat}</Typography>
                )}

                {repair.isRing && (
                    <>
                        <Typography sx={{ mb: 1 }}><strong>Current Ring Size:</strong> {repair.currentRingSize}</Typography>
                        <Typography sx={{ mb: 1 }}><strong>Desired Ring Size:</strong> {repair.desiredRingSize}</Typography>
                    </>
                )}

                {repair.notes && (
                    <Typography sx={{ mb: 1 }}><strong>Notes:</strong> {repair.notes}</Typography>
                )}
            </CardContent>
        </Card>
    );
}

export function RepairWorkItemsCard({ repair, allWorkItems, totalCost }) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Work Items & Pricing</Typography>

                <List dense>
                    {allWorkItems.map((item, index) => (
                        <ListItem
                            key={`${item.type}-${index}`}
                            sx={{
                                bgcolor: item.isStullerItem ? INFO.bg : 'transparent',
                                border: `1px solid ${item.isStullerItem ? INFO.border : 'transparent'}`,
                                mb: 1,
                                borderRadius: 1
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                            {item.quantity}x {item.title || item.displayName || item.name || item.description}
                                        </Typography>
                                        <Chip
                                            label={item.type}
                                            size="small"
                                            variant="outlined"
                                            color={item.category === 'Material' ? 'info' : 'default'}
                                        />
                                        {item.isStullerItem && (
                                            <Chip
                                                label="Stuller"
                                                size="small"
                                                color="primary"
                                                variant="filled"
                                            />
                                        )}
                                    </Box>
                                }
                                secondary={item.skillLevel && `Skill Level: ${item.skillLevel}`}
                            />
                            <ListItemSecondaryAction>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                    ${item.price}
                                </Typography>
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}

                    {repair.rushJobFee && parseFloat(repair.rushJobFee) > 0 && (
                        <ListItem sx={{ bgcolor: ERROR.bg, border: `1px solid ${ERROR.border}`, mb: 1, borderRadius: 1 }}>
                            <ListItemText
                                primary={
                                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main' }}>
                                        Rush Job Fee
                                    </Typography>
                                }
                            />
                            <ListItemSecondaryAction>
                                <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                                    ${parseFloat(repair.rushJobFee).toFixed(2)}
                                </Typography>
                            </ListItemSecondaryAction>
                        </ListItem>
                    )}
                </List>

                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6">Total:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        ${totalCost.toFixed(2)}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
