"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Box, Typography, Button, ButtonGroup, useMediaQuery, useTheme } from '@mui/material';
import { useSession } from 'next-auth/react';
import { useRepairs } from '@/app/context/repairs.context';
import { useParams } from 'next/navigation';
import RepairTicketComponent from '@/components/print/RepairTicketComponent';
import RepairReceiptComponent from '@/components/print/RepairReceiptComponent';
import SideBySideLayout from '@/components/print/SideBySideLayout';
import { calculateRepairTotal, getAllWorkItems } from '@/services/pricingCalculation.service';
import { getRepairSummary, validateRepairData } from '@/services/repairDataStructure.service';

const PrintRepairTicket = () => {
    const { data: session } = useSession();
    const { repairs } = useRepairs();
    const params = useParams();
    const theme = useTheme();
    const isSmallViewport = useMediaQuery(theme.breakpoints.down('md'));
    const repairID = params.repairID;
    const [printMode, setPrintMode] = useState('both'); // 'ticket', 'receipt', or 'both'
    const [showControls, setShowControls] = useState(true);
    const [isMobilePrintClient, setIsMobilePrintClient] = useState(false);

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
        if (typeof window === 'undefined') return;
        const ua = window.navigator.userAgent || '';
        const touchCapable = window.matchMedia ? window.matchMedia('(pointer: coarse)').matches : false;
        const isMobileUserAgent = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
        setIsMobilePrintClient(Boolean(isSmallViewport || touchCapable || isMobileUserAgent));
    }, [isSmallViewport]);

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
        <Box>
            <style jsx global>{`
                @media print {
                    @page {
                        size: 7.5in 5.75in;
                        margin: 0;
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
                        width: 7.5in !important;
                        height: 5.75in !important;
                        max-width: 7.5in !important;
                        max-height: 5.75in !important;
                        overflow: hidden !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #fff !important;
                        color: #111 !important;
                    }
                    .print-container.mobile-separate {
                        position: static !important;
                        width: 100% !important;
                        height: auto !important;
                        max-width: none !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                    .mobile-print-page {
                        width: 3.75in !important;
                        min-height: 5.75in !important;
                        margin: 0 auto !important;
                        page-break-after: always !important;
                        break-after: page !important;
                    }
                    .mobile-print-page.receipt-page {
                        width: 8in !important;
                        min-height: 10.5in !important;
                    }
                    .mobile-print-page:last-child {
                        page-break-after: auto !important;
                        break-after: auto !important;
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
                            {isMobilePrintClient ? 'Print Both' : 'Print Both (Cut Page)'}
                        </Button>
                        <Button onClick={() => handlePrint('ticket')}>
                            Repair Ticket Only
                        </Button>
                        <Button onClick={() => handlePrint('receipt')}>
                            Item Receipt Only
                        </Button>
                    </ButtonGroup>
                    <Typography variant="body2" sx={{ marginBottom: '8px', color: '#666' }}>
                        {isMobilePrintClient
                            ? 'Mobile print uses separate ticket and receipt pages for better browser compatibility.'
                            : 'Default: Both documents on one page - cut in half after printing'}
                    </Typography>
                    {needsMultipleTicketPages && printMode === 'ticket' && (
                        <Typography variant="body2" color="warning.main">
                            Repair ticket will span multiple 4x6" pages ({Math.ceil(totalItems / maxItemsPerTicketPage)} pages)
                        </Typography>
                    )}
                </Box>
            )}

            {printMode === 'both' ? (
                <SideBySideLayoutContainer repair={repair} separatePages={isMobilePrintClient} />
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

const SideBySideLayoutContainer = ({ repair, separatePages = false }) => {
    if (separatePages) {
        return (
            <Box
                className="print-container mobile-separate"
                sx={{
                    width: '100%',
                    maxWidth: '3.75in',
                    margin: '0 auto',
                    '@media print': {
                        width: '100% !important',
                        maxWidth: 'none !important',
                        margin: '0 !important'
                    },
                }}
            >
                <Box className="mobile-print-page">
                    <RepairTicketComponent repair={repair} />
                </Box>
                <Box className="mobile-print-page receipt-page">
                    <RepairReceiptComponent repair={repair} fullPage />
                </Box>
            </Box>
        );
    }

    return (
        <Box
            className="print-container"
            sx={{
                display: 'flex',
                width: '7.5in',
                height: '5.75in',
                margin: '0 auto',
                overflow: 'hidden',
                '@media print': {
                    margin: '0',
                    width: '7.5in',
                    height: '5.75in',
                    overflow: 'hidden',
                    pageBreakInside: 'avoid',
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
        <Box sx={{ width: '3.75in', height: '5.75in', margin: '0 auto', '@media print': { margin: '0' } }}>
            <RepairTicketComponent repair={repair} />
        </Box>
    );
};

const ClientReceiptContainer = ({ repair }) => {
    return (
        <Box sx={{ width: '8in', minHeight: '10.5in', margin: '0 auto', '@media print': { margin: '0' } }}>
            <RepairReceiptComponent repair={repair} fullPage />
        </Box>
    );
};

export default PrintRepairTicket;
