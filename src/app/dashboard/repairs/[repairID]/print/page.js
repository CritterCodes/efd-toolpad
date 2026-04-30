"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, ButtonGroup } from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import { useParams } from 'next/navigation';
import RepairTicketComponent from '@/components/print/RepairTicketComponent';
import RepairReceiptComponent from '@/components/print/RepairReceiptComponent';
import SideBySideLayout from '@/components/print/SideBySideLayout';
import { calculateRepairTotal, getAllWorkItems } from '@/services/pricingCalculation.service';
import { getRepairSummary, validateRepairData } from '@/services/repairDataStructure.service';

const SLIP_WIDTH = '2.9in';
const SLIP_HEIGHT = '3.9in';
const CUT_SHEET_WIDTH = '5.8in';
const CUT_SHEET_HEIGHT = SLIP_HEIGHT;

const PrintRepairTicket = () => {
    const { data: session } = useSession();
    const { repairs } = useRepairs();
    const params = useParams();
    const repairID = params.repairID;
    const [printMode, setPrintMode] = useState('both'); // 'ticket', 'receipt', or 'both'
    const [showControls, setShowControls] = useState(true);

    const repair = repairs.find((r) => r.repairID === repairID);

    const validation = useMemo(() => {
        const userRole = session?.user?.role;
        return repair ? validateRepairData(repair, userRole) : { isValid: false, errors: ['Repair not found'] };
    }, [repair, session?.user?.role]);

    const repairSummary = useMemo(() => {
        return repair ? getRepairSummary(repair) : null;
    }, [repair]);

    const allWorkItems = useMemo(() => {
        return repair ? getAllWorkItems(repair) : [];
    }, [repair]);

    const pricingData = useMemo(() => {
        return repair ? calculateRepairTotal(repair) : null;
    }, [repair]);

    const totalItems = repairSummary ? repairSummary.totalItems : 0;
    const maxItemsPerTicketPage = 8;
    const needsMultipleTicketPages = totalItems > maxItemsPerTicketPage;

    useEffect(() => {
        if (repair && validation.isValid) {
            console.log('Repair Found:', repair);
            console.log('Repair Summary:', repairSummary);
            console.log('Pricing Data:', pricingData);
            console.log(`Total items: ${totalItems}, needs multiple pages: ${needsMultipleTicketPages}`);
        } else {
            console.warn('Repair validation failed:', validation.errors);
        }
    }, [repair, validation, repairSummary, pricingData, totalItems, needsMultipleTicketPages]);

    const handlePrint = (mode) => {
        setPrintMode(mode);
        setShowControls(false);

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                setShowControls(true);
                setPrintMode('both');
            }, 1000);
        }, 100);
    };

    if (!repair || !validation.isValid) {
        return (
            <Box sx={{ padding: '20px', textAlign: 'center' }}>
                <Typography variant="h6" color="error">Error: Unable to load repair data</Typography>
                {validation.errors.map((error, index) => (
                    <Typography key={index} variant="body2" color="error" sx={{ marginTop: '8px' }}>
                        {error}
                    </Typography>
                ))}
            </Box>
        );
    }

    return (
        <Box className={`print-mode-${printMode}`}>
            <style jsx global>{`
                @media print {
                    @page {
                        size: 5.8in 3.9in;
                        margin: 0;
                    }
                    .print-mode-ticket,
                    .print-mode-receipt {
                        --print-page-width: 2.9in;
                        --print-page-height: 3.9in;
                    }
                    .print-mode-both {
                        --print-page-width: 5.8in;
                        --print-page-height: 3.9in;
                    }
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        color: #111 !important;
                    }
                    nav, header, aside,
                    .MuiDrawer-root,
                    .MuiAppBar-root,
                    .MuiBreadcrumbs-root {
                        display: none !important;
                    }
                    body > * {
                        visibility: hidden;
                    }
                    body .print-container,
                    body .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: var(--print-page-width) !important;
                        height: var(--print-page-height) !important;
                        max-width: var(--print-page-width) !important;
                        max-height: var(--print-page-height) !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        color: #111 !important;
                        page-break-after: avoid !important;
                        break-after: avoid !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .print-slip,
                    .print-slip * {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}</style>

            {showControls && (
                <Box sx={{ padding: '20px', textAlign: 'center', '@media print': { display: 'none' } }}>
                    <Typography variant="h6" sx={{ marginBottom: '16px' }}>
                        Print Options for Repair {repair.repairID}
                    </Typography>
                    <ButtonGroup variant="contained" sx={{ marginBottom: '16px' }}>
                        <Button onClick={() => handlePrint('both')} variant={printMode === 'both' ? 'contained' : 'outlined'}>
                            Print Both (Cut Page)
                        </Button>
                        <Button onClick={() => handlePrint('ticket')}>
                            Repair Ticket Only
                        </Button>
                        <Button onClick={() => handlePrint('receipt')}>
                            Item Receipt Only
                        </Button>
                    </ButtonGroup>
                    <Typography variant="body2" sx={{ marginBottom: '8px', color: '#666' }}>
                        Default: both slips on one page, cut in half after printing.
                    </Typography>
                    {needsMultipleTicketPages && printMode === 'ticket' && (
                        <Typography variant="body2" color="warning.main">
                            Repair ticket will span multiple bag slips ({Math.ceil(totalItems / maxItemsPerTicketPage)} pages)
                        </Typography>
                    )}
                </Box>
            )}

            {printMode === 'both' ? (
                <SideBySideLayoutContainer repair={repair} />
            ) : (
                <>
                    {printMode === 'ticket' && (
                        <RepairTicketContainer repair={repair} />
                    )}

                    {printMode === 'receipt' && (
                        <ClientReceiptContainer repair={repair} />
                    )}
                </>
            )}
        </Box>
    );
};

const SideBySideLayoutContainer = ({ repair }) => {
    return (
        <Box
            className="print-container"
            sx={{
                display: 'flex',
                width: CUT_SHEET_WIDTH,
                height: CUT_SHEET_HEIGHT,
                margin: '0 auto',
                overflow: 'hidden',
                '@media print': {
                    margin: '0',
                    width: CUT_SHEET_WIDTH,
                    height: CUT_SHEET_HEIGHT,
                    overflow: 'hidden',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                },
            }}
        >
            <SideBySideLayout>
                <RepairTicketComponent repair={repair} />
                <RepairReceiptComponent repair={repair} />
            </SideBySideLayout>
        </Box>
    );
};

const RepairTicketContainer = ({ repair }) => {
    return (
        <Box
            className="print-container"
            sx={{
                width: SLIP_WIDTH,
                height: SLIP_HEIGHT,
                margin: '0 auto',
                overflow: 'hidden',
                '@media print': {
                    margin: '0',
                    width: SLIP_WIDTH,
                    height: SLIP_HEIGHT,
                    overflow: 'hidden',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                }
            }}
        >
            <RepairTicketComponent repair={repair} />
        </Box>
    );
};

const ClientReceiptContainer = ({ repair }) => {
    return (
        <Box
            className="print-container"
            sx={{
                width: SLIP_WIDTH,
                height: SLIP_HEIGHT,
                margin: '0 auto',
                overflow: 'hidden',
                '@media print': {
                    margin: '0',
                    width: SLIP_WIDTH,
                    height: SLIP_HEIGHT,
                    overflow: 'hidden',
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                }
            }}
        >
            <RepairReceiptComponent repair={repair} />
        </Box>
    );
};

export default PrintRepairTicket;
