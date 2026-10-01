'use client';

import { Box, Button, Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

/**
 * Store jobs that are IN the shop but waiting on a quote (owner, 2026-10-01, OPEN-QUESTIONS Q8). They stay off the
 * bench until someone prices them; pricing the repair moves it to READY FOR WORK and tells the store the number.
 */
export default function NeedsQuoteList({ repairs = [] }) {
    const router = useRouter();
    if (!repairs.length) return null;
    return (
        <Box
            sx={{
                backgroundColor: REPAIRS_UI.bgPanel,
                border: '1px solid #A855F7',
                borderRadius: 3,
                p: { xs: 1.5, sm: 2.5 },
                mb: 3,
            }}
        >
            <Typography component="h2" sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader, fontSize: 18 }}>
                Checked in, needs a quote ({repairs.length})
            </Typography>
            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, mb: 1.5 }}>
                These pieces are here but off the bench. Price each one (add its tasks); it then joins the bench and the store gets the number.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {repairs.map((repair) => (
                    <Box
                        key={repair.repairID}
                        sx={{
                            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, p: 1.25,
                            backgroundColor: REPAIRS_UI.bgCard, border: `1px solid ${REPAIRS_UI.border}`, borderRadius: 2,
                        }}
                    >
                        <Box sx={{ flex: '1 1 220px', minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 600, color: REPAIRS_UI.textHeader }} noWrap>
                                {repair.wholesalerName || repair.businessName || 'Store'} · {repair.clientName || repair.repairID}
                            </Typography>
                            <Typography variant="body2" sx={{ color: REPAIRS_UI.textSecondary, overflowWrap: 'anywhere' }}>
                                {repair.description || 'No description'}
                            </Typography>
                        </Box>
                        <Button
                            size="small"
                            variant="outlined"
                            onClick={() => router.push(`/dashboard/repairs/${repair.repairID}`)}
                            sx={{ color: '#A855F7', borderColor: '#A855F7', flexShrink: 0 }}
                        >
                            Price it
                        </Button>
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
