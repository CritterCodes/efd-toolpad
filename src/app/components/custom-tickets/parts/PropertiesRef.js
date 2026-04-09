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

export const PropertiesRef = ({ ticket }) => {
    return (
        <>
{/* Properties & Status Indicators */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Status & Properties
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {ticket.requestDetails?.gemstones?.length > 0 && (
                <Chip 
                  label={`Gemstones: ${ticket.requestDetails.gemstones.join(', ')}`} 
                  color="info" 
                  size="small" 
                  variant="outlined" 
                />
              )}
              
              {ticket.priority === 'high' && (
                <Chip label="High Priority" color="error" size="small" />
              )}
              
              {ticket.assignedTo && (
                <Chip label={`Assigned: ${ticket.assignedTo}`} color="primary" size="small" variant="outlined" />
              )}

              {ticket.amountOwedToCard === 0 && (
                <Chip label="No Outstanding Balance" color="success" size="small" />
              )}

              {ticket.requestDetails?.specialRequests && ticket.requestDetails.specialRequests.trim() && (
                <Chip label="Special Requests" color="warning" size="small" variant="outlined" />
              )}

              {ticket.communications?.length === 0 && ticket.notes?.length === 0 && (
                <Chip label="No Communications" color="default" size="small" variant="outlined" />
              )}
            </Box>
          </Grid>
        
        </>
    );
};
