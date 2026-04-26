import React from 'react';
import { Grid, Box, Typography, Avatar, Chip, Tooltip } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import CategoryIcon from '@mui/icons-material/Category';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SellIcon from '@mui/icons-material/Sell';
import { formatCurrency, formatDate } from '@/utils/formatters';

export const FinancialOverviewRef = ({ ticket }) => {
    return (
        <>
{/* Financial Overview */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Financial Summary
            </Typography>
            
            <Grid container spacing={2}>
              {ticket.quoteTotal && (
                <Grid item xs={6} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Quote Total
                    </Typography>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(ticket.quoteTotal)}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {ticket.amountOwedToCard !== undefined && (
                <Grid item xs={6} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Owed to Card
                    </Typography>
                    <Typography variant="h6" color={ticket.amountOwedToCard > 0 ? 'warning.main' : 'success.main'}>
                      {formatCurrency(ticket.amountOwedToCard)}
                    </Typography>
                  </Box>
                </Grid>
              )}

              {ticket.requestDetails?.timeline && (
                <Grid item xs={6} sm={4}>
                  <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Timeline
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {ticket.requestDetails.timeline}
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
          </Grid>

          
        </>
    );
};
