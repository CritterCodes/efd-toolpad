"use client";
import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, Button, ButtonGroup } from '@mui/material';
import { useRepairs } from '@/app/context/repairs.context';
import { useParams } from 'next/navigation';
import RepairTicketComponent from '@/components/print/RepairTicketComponent';
import RepairReceiptComponent from '@/components/print/RepairReceiptComponent';
import SideBySideLayout from '@/components/print/SideBySideLayout';
import { calculateRepairTotal, getAllWorkItems } from '@/services/pricingCalculation.service';
import { getRepairSummary, validateRepairData } from '@/services/repairDataStructure.service';

const PrintRepairTicket = () => {
    const { repairs } = useRepairs();
    const params = useParams();
    const repairID = params.repairID;
    const [printMode, setPrintMode] = useState('both'); // 'ticket', 'receipt', or 'both'
    const [showControls, setShowControls] = useState(true);

    console.log("Params from URL:", params);
    console.log("Repairs from Context:", repairs);
    console.log("Repair ID to Search:", repairID);

    const repair = repairs.find(r => r.repairID === repairID);

    // Memoize computations to avoid changing dependencies
    const validation = useMemo(() => {
        return repair ? validateRepairData(repair) : { isValid: false, errors: ['Repair not found'] };
    }, [repair]);

    const repairSummary = useMemo(() => {
        return repair ? getRepairSummary(repair) : null;
    }, [repair]);

    const allWorkItems = useMemo(() => {
        return repair ? getAllWorkItems(repair) : [];
    }, [repair]);

    const pricingData = useMemo(() => {
        return repair ? calculateRepairTotal(repair) : null;
    }, [repair]);

    // Calculate total items to determine if we need multiple pages for ticket
    const totalItems = repairSummary ? repairSummary.totalItems : 0;

    const maxItemsPerTicketPage = 8; // Conservative estimate for 4x6" page
    const needsMultipleTicketPages = totalItems > maxItemsPerTicketPage;

    useEffect(() => {
        if (repair && validation.isValid) {
            console.log("Repair Found:", repair);
            console.log("Repair Summary:", repairSummary);
            console.log("Pricing Data:", pricingData);
            console.log(`Total items: ${totalItems}, needs multiple pages: ${needsMultipleTicketPages}`);
        } else {
            console.warn("Repair validation failed:", validation.errors);
        }
    }, [repair, validation, repairSummary, pricingData, totalItems, needsMultipleTicketPages]);

    const handlePrint = (mode) => {
        setPrintMode(mode);
        setShowControls(false);
        
        // Small delay to ensure state updates before printing
        setTimeout(() => {
            window.print();
            // Reset after printing
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
            {/* Print-specific styles */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: landscape;
                        margin: 0.25in;
                    }
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .print-container {
                        max-width: none !important;
                        width: 100% !important;
                        transform: scale(0.85) !important;
                        transform-origin: top left !important;
                    }
                }
            `}</style>

            {/* Print Controls - Hidden during print */}
            {showControls && (
                <Box sx={{ 
                    padding: '20px', 
                    textAlign: 'center', 
                    '@media print': { display: 'none' } 
                }}>
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
                        📄 Default: Both documents on one page - cut in half after printing
                    </Typography>
                    {needsMultipleTicketPages && printMode === 'ticket' && (
                        <Typography variant="body2" color="warning.main">
                            ⚠️ Repair ticket will span multiple 4x6&quot; pages ({Math.ceil(totalItems / maxItemsPerTicketPage)} pages)
                        </Typography>
                    )}
                </Box>
            )}

            {/* Render based on print mode */}
            {printMode === 'both' ? (
                <SideBySideLayoutContainer repair={repair} maxItemsPerPage={maxItemsPerTicketPage} />
            ) : (
                <>
                    {printMode === 'ticket' && (
                        <RepairTicketContainer repair={repair} needsMultiplePages={needsMultipleTicketPages} maxItemsPerPage={maxItemsPerTicketPage} />
                    )}
                    
                    {printMode === 'receipt' && (
                        <ClientReceiptContainer repair={repair} />
                    )}
                </>
            )}
        </Box>
    );
};

// Side-by-Side Layout Wrapper - Uses modular components
const SideBySideLayoutContainer = ({ repair, maxItemsPerPage }) => {
    return (
        <Box
            className="print-container"
            sx={{
                display: 'flex',
                width: '100%',
                maxWidth: '10.5in',
                height: 'auto',
                minHeight: '7.5in',
                margin: '0 auto',
                fontSize: '0.85rem',
                '@media print': {
                    margin: '0',
                    width: '100%',
                    maxWidth: '10.5in',
                    height: 'auto',
                    fontSize: '0.8rem',
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

// Repair Ticket Container (4x6" for jeweler) - Uses modular component
const RepairTicketContainer = ({ repair, needsMultiplePages, maxItemsPerPage }) => {
    return (
        <Box sx={{ 
            width: '4in', 
            height: '6in', 
            margin: '0 auto',
            '@media print': { margin: '0' }
        }}>
            <RepairTicketComponent repair={repair} />
        </Box>
    );
};

// Client Receipt Container (8.5x11" full page) - Uses modular component  
const ClientReceiptContainer = ({ repair }) => {
    return (
        <Box sx={{ 
            width: '8.5in', 
            minHeight: '11in', 
            margin: '0 auto',
            '@media print': { margin: '0' }
        }}>
            <RepairReceiptComponent repair={repair} />
        </Box>
    );
};

export default PrintRepairTicket;
