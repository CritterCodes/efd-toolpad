import * as React from 'react';
import Image from 'next/image';
import { Alert, Box, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
    Print as PrintIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    MoreVert as MoreIcon,
} from '@mui/icons-material';
import { isWholesalerViewer } from '@/lib/repairAccess';
import {
    facelift,
    tint,
    PageHeader,
    SurfaceCard,
    CardGrid,
    SectionLabel,
    Field,
    FieldList,
    Figure,
    LineItem,
    StatusChip,
    GoldButton,
    QuietButton,
    IconButton as FlIconButton,
} from '@/components/facelift';

/**
 * The read-only repair detail screen, composed from the facelift kit rather than hand-styled (2026-10-02).
 *
 * What it used to be is worth recording, because it is the pattern this page is the test case for: every
 * fact was `<Typography><strong>Label:</strong> {value}</Typography>`, which renders label and value in the
 * same family, size, tracking and colour — one typographic tier for the whole screen. The page carried no
 * `h1` at all (its outline ran H4 → H6 × 6), `Total:` and the total itself were both H6 at 14px, so the
 * most important number on the ticket was smaller than the body text around it, and two rows used
 * light-theme Material fills that rendered white text at about 1.1:1.
 *
 * The three pure functions below are unchanged and still carry the money logic.
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

/** The chip hue for a status, in brand tokens rather than MUI palette names. */
const statusHue = (status) => ({
    success: facelift.success,
    info: facelift.info,
    warning: facelift.gold,
    error: facelift.error,
}[getStatusColor(status)] || facelift.text3);

/** One price column, one format. `$40` and `$63.67` in the same column defeat tabular figures. */
export const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

/**
 * A date the shop writes the same way everywhere, instead of US-short beside raw ISO.
 *
 * A promise date is stored as a bare `YYYY-MM-DD` — a calendar day, not an instant. `new Date()` reads
 * that as UTC midnight, which is the evening BEFORE in Central, so formatting it the obvious way moves
 * every promise and due date a day earlier. Caught on screen at a glance: the record said the 14th and
 * the page said the 13th. A calendar day is therefore split and built in local time; anything carrying a
 * real timestamp is left to `Date` as before.
 */
const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

export const day = (value) => {
    if (!value) return null;
    const calendar = CALENDAR_DAY.exec(String(value).trim());
    const d = calendar
        ? new Date(Number(calendar[1]), Number(calendar[2]) - 1, Number(calendar[3]))
        : new Date(value);
    return Number.isNaN(d.getTime())
        ? String(value)
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
                    Quoted {money(repair.quoteRequest.quotedTotal || repair.totalCost)} on {day(repair.quoteRequest.quotedAt)}. The store was notified.
                </Alert>
            )}
        </>
    );
}

/**
 * The header. Previously Print was the one gold pill — on the screen a jeweler lands on from a scan, with
 * no printer at the bench — and Delete sat beside it in the same row, same size, same treatment. Edit is
 * what actually advances a ticket from this page (it is how work and a price get added), so it takes the
 * gold; Print goes quiet; Delete moves into an overflow menu with its own colour.
 */
export function RepairHeaderCard({ repair, session, clientInfo, onPrint, onEdit, onDelete }) {
    const [menuAnchor, setMenuAnchor] = React.useState(null);
    const readOnly = isWholesalerViewer(session);

    return (
        <PageHeader
            badge={repair.repairID}
            title={clientInfo?.name || repair.clientName || 'Repair'}
            subtitle={repair.description}
            actions={
                <>
                    {!readOnly && <GoldButton startIcon={<EditIcon />} onClick={onEdit}>Edit repair</GoldButton>}
                    <QuietButton startIcon={<PrintIcon />} onClick={onPrint}>Print</QuietButton>
                    {!readOnly && (
                        <>
                            <FlIconButton aria-label="More actions" onClick={(e) => setMenuAnchor(e.currentTarget)}>
                                <MoreIcon />
                            </FlIconButton>
                            <Menu
                                anchorEl={menuAnchor}
                                open={Boolean(menuAnchor)}
                                onClose={() => setMenuAnchor(null)}
                            >
                                <MenuItem
                                    onClick={() => { setMenuAnchor(null); onDelete(); }}
                                    sx={{ color: facelift.error }}
                                >
                                    <ListItemIcon sx={{ color: 'inherit' }}><DeleteIcon fontSize="small" /></ListItemIcon>
                                    <ListItemText>Delete this repair</ListItemText>
                                </MenuItem>
                            </Menu>
                        </>
                    )}
                </>
            }
        >
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mt: 1.5 }}>
                <StatusChip label={repair.status || 'Pending'} hue={statusHue(repair.status)} />
                {repair.isRush && <StatusChip label="Rush job" hue={facelift.error} solid />}
                {repair.isRing && <StatusChip label="Ring" hue={facelift.text3} />}
            </Box>
        </PageHeader>
    );
}

export function RepairClientCard({ repair, clientInfo }) {
    return (
        <SurfaceCard>
            <SectionLabel>Client &amp; timeline</SectionLabel>
            <Box sx={{ mt: 1.75 }}>
                <FieldList>
                    <Field label="Name" value={clientInfo?.name || repair.clientName} strong />
                    <Field label="Email" value={clientInfo?.email} mono />
                    <Field label="Phone" value={clientInfo?.phone} mono />
                    <Field label="Taken in" value={day(repair.createdAt)} />
                    <Field label="Promised" value={day(repair.promiseDate)} />
                    <Field label="Due" value={day(repair.dueDate)} />
                </FieldList>
            </Box>
        </SurfaceCard>
    );
}

export function RepairItemDetailsCard({ repair }) {
    return (
        <SurfaceCard>
            <SectionLabel>The piece</SectionLabel>

            {repair.picture && (
                <Box
                    sx={{
                        mt: 1.75,
                        position: 'relative',
                        width: '100%',
                        height: 260,
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: `1px solid ${facelift.border}`,
                        backgroundColor: facelift.surfaceQuiet,
                    }}
                >
                    <Image src={repair.picture} alt="The piece" fill style={{ objectFit: 'contain' }} />
                </Box>
            )}

            <Box sx={{ mt: 1.75 }}>
                <FieldList>
                    <Field label="Metal" value={[repair.karat, repair.metalType].filter(Boolean).join(' ')} strong />
                    {repair.isRing && <Field label="Size now" value={repair.currentRingSize} mono />}
                    {repair.isRing && <Field label="Size to" value={repair.desiredRingSize} mono />}
                </FieldList>
            </Box>

            {repair.notes && (
                <Box sx={{ mt: 2 }}>
                    <Field label="Notes" value={repair.notes} />
                </Box>
            )}
        </SurfaceCard>
    );
}

export function RepairWorkItemsCard({ repair, allWorkItems, totalCost }) {
    const rushFee = parseFloat(repair.rushJobFee) || 0;

    return (
        <SurfaceCard>
            <SectionLabel>The work</SectionLabel>

            <Box sx={{ mt: 1.75 }}>
                {allWorkItems.length === 0 && (
                    <Box sx={{ py: 2, color: facelift.text3, fontSize: 14 }}>
                        Nothing has been added to this ticket yet.
                    </Box>
                )}

                {allWorkItems.map((item, index) => (
                    <LineItem
                        key={`${item.type}-${index}`}
                        tone={item.isStullerItem ? facelift.info : undefined}
                        title={`${item.quantity || 1} × ${item.title || item.displayName || item.name || item.description}`}
                        meta={item.skillLevel ? `Skill ${item.skillLevel}` : null}
                        chips={
                            <>
                                <StatusChip label={item.type} hue={item.category === 'Material' ? facelift.info : facelift.text3} />
                                {item.isStullerItem && <StatusChip label="Stuller" hue={facelift.info} />}
                            </>
                        }
                        value={money(item.price)}
                    />
                ))}

                {rushFee > 0 && (
                    <LineItem
                        tone={facelift.error}
                        title="Rush job fee"
                        chips={<StatusChip label="Rush" hue={facelift.error} />}
                        value={money(rushFee)}
                    />
                )}
            </Box>

            <Box sx={{ mt: 2.25, pt: 2, borderTop: `1px solid ${tint(facelift.text, { fill: 0.09, stroke: 0.09 }).border}` }}>
                <Figure label="Total" value={money(totalCost)} accent />
            </Box>
        </SurfaceCard>
    );
}

export function RepairDetailBody({ repair, clientInfo, allWorkItems, totalCost }) {
    return (
        <CardGrid min={320}>
            <RepairClientCard repair={repair} clientInfo={clientInfo} />
            <RepairItemDetailsCard repair={repair} />
            <RepairWorkItemsCard repair={repair} allWorkItems={allWorkItems} totalCost={totalCost} />
        </CardGrid>
    );
}
