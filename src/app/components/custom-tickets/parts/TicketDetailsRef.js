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

export const TicketDetailsRef = ({ ticket }) => {
    return (
        <>
{/* Ticket Details */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Ticket Details
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Type:</Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatJewelryType(ticket.type)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Priority:</Typography>
                <Chip 
                  label={ticket.priority?.toUpperCase() || 'NORMAL'} 
                  size="small" 
                  color={ticket.priority === 'high' ? 'error' : 'default'}
                />
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Created:</Typography>
                <Typography variant="body2">
                  {formatDate(ticket.createdAt)}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Updated:</Typography>
                <Typography variant="body2">
                  {formatDate(ticket.updatedAt)}
                </Typography>
              </Box>

              {ticket.requestDetails?.jewelryType && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Jewelry Type:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.jewelryType}
                  </Typography>
                </Box>
              )}

              {ticket.requestDetails?.metalType && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Metal:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.metalType}
                  </Typography>
                </Box>
              )}

              {ticket.requestDetails?.size && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Size:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.size}
                  </Typography>
                </Box>
              )}

              {ticket.requestDetails?.budget && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Budget:</Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {ticket.requestDetails.budget}
                  </Typography>
                </Box>
              )}

              {ticket.dueDate && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Due Date:</Typography>
                  <Typography variant="body2">
                    {formatDate(ticket.dueDate)}
                  </Typography>
                </Box>
              )}

              {ticket.estimatedCompletion && (
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Est. Completion:</Typography>
                  <Typography variant="body2">
                    {formatDate(ticket.estimatedCompletion)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>

          
        </>
    );
};
