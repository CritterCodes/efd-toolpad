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

const SLIP_WIDTH = '3.7in';
const SLIP_HEIGHT = '5.7in';
const CUT_SHEET_WIDTH = '7.4in';
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
    const printPageWidth = printMode === 'both' ? CUT_SHEET_WIDTH : SLIP_WIDTH;
    const printPageHeight = SLIP_HEIGHT;

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

    useEffect(() => {
        const restorePrintControls = () => {
            document.documentElement.classList.remove('efd-printing');
            setShowControls(true);
            setPrintMode('both');
        };

        const printMedia = window.matchMedia?.('print');
        const handlePrintMediaChange = (event) => {
            if (!event.matches) restorePrintControls();
        };

        window.addEventListener('afterprint', restorePrintControls);
        printMedia?.addEventListener?.('change', handlePrintMediaChange);

        return () => {
            window.removeEventListener('afterprint', restorePrintControls);
            printMedia?.removeEventListener?.('change', handlePrintMediaChange);
            document.documentElement.classList.remove('efd-printing');
        };
    }, []);

    const handlePrint = (mode) => {
        document.documentElement.classList.add('efd-printing');
        setPrintMode(mode);
        setShowControls(false);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                window.print();
            });
        });
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
        <Box className={`print-root print-mode-${printMode}`}>
            <style jsx global>{`
                @media print {
                    @page {
                        size: letter portrait;
                        margin: 0;
                    }
                    .print-mode-ticket,
                    .print-mode-receipt {
                        --print-page-width: ${SLIP_WIDTH};
                        --print-page-height: ${SLIP_HEIGHT};
                    }
                    .print-mode-both {
                        --print-page-width: ${CUT_SHEET_WIDTH};
                        --print-page-height: ${CUT_SHEET_HEIGHT};
                    }
                    html,
                    body {
                        width: ${printPageWidth} !important;
                        height: ${printPageHeight} !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        background: #fff !important;
                        color: #111 !important;
                    }
                    html *,
                    body * {
                        box-sizing: border-box !important;
                    }
                    nav, header, aside,
                    .MuiDrawer-root,
                    .MuiAppBar-root,
                    .MuiBreadcrumbs-root {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    body > :not(.print-root):not(:has(.print-root)) {
                        display: none !important;
                    }
                    body > :has(.print-root) {
                        display: block !important;
                        height: ${printPageHeight} !important;
                        min-height: 0 !important;
                        max-height: ${printPageHeight} !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-root,
                    .print-mode-ticket,
                    .print-mode-receipt,
                    .print-mode-both {
                        display: block !important;
                        visibility: visible !important;
                        position: fixed !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: ${printPageWidth} !important;
                        height: ${printPageHeight} !important;
                        min-height: 0 !important;
                        max-height: ${printPageHeight} !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .print-root,
                    .print-root * {
                        visibility: visible !important;
                    }
                    .print-root > :not(.print-container) {
                        display: none !important;
                    }
                    body .print-container,
                    body .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        display: block !important;
                        position: static !important;
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
