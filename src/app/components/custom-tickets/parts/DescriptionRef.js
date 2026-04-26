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

export const DescriptionRef = ({ ticket }) => {
    return (
        <>
{/* Description and Special Requests */}
          {(ticket.description || ticket.requestDetails?.specialRequests) && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Additional Details
              </Typography>
              
              {ticket.description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Description:
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                    {ticket.description}
                  </Typography>
                </Box>
              )}
              
              {ticket.requestDetails?.specialRequests && ticket.requestDetails.specialRequests.trim() && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Special Requests:
                  </Typography>
                  <Typography variant="body2" sx={{ p: 2, bgcolor: 'warning.50', borderRadius: 1, whiteSpace: 'pre-wrap' }}>
                    {ticket.requestDetails.specialRequests}
                  </Typography>
                </Box>
              )}
            </Grid>
          )}

          
        </>
    );
};
