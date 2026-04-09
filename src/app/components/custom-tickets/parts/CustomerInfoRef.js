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

export const CustomerInfoRef = ({ ticket }) => {
    return (
        <>
{/* Customer Information */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Customer Information
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="body1" fontWeight="medium">
                  {ticket.customerName || 'Unknown Customer'}
                </Typography>
                {ticket.customerEmail && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {ticket.customerEmail}
                    </Typography>
                  </Box>
                )}
                {ticket.customerPhone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <PhoneIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {ticket.customerPhone}
                    </Typography>
                  </Box>
                )}
                {ticket.userID && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    User ID: {ticket.userID}
                  </Typography>
                )}
              </Box>
            </Box>
          </Grid>

          
        </>
    );
};
