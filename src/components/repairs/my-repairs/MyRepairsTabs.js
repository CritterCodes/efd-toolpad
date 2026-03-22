import React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Badge,
  useTheme,
  useMediaQuery
} from '@mui/material';

export default function MyRepairsTabs({
  activeTab,
  handleTabChange,
  repairsLength,
  currentRepairsCount,
  completedRepairsCount
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs 
        value={activeTab} 
        onChange={handleTabChange} 
        aria-label="repair status tabs"
        variant={isMobile ? "scrollable" : "standard"}
        scrollButtons={isMobile ? "auto" : false}
        allowScrollButtonsMobile
        sx={{
          '& .MuiTab-root': {
            minWidth: isMobile ? 120 : 'auto',
            fontSize: isMobile ? '0.875rem' : '1rem'
          }
        }}
      >
        <Tab 
          label={
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? 0.5 : 1,
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <span style={{ fontSize: isMobile ? '0.75rem' : '1rem' }}>
                {isMobile ? 'All' : 'All Repairs'}
              </span>
              <Badge 
                badgeContent={repairsLength} 
                color="primary" 
                showZero
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: isMobile ? '16px' : '18px',
                    minWidth: isMobile ? '16px' : '18px'
                  }
                }}
              >
                <Box sx={{ width: isMobile ? 4 : 8 }} />
              </Badge>
            </Box>
          } 
        />
        <Tab 
          label={
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? 0.5 : 1,
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <span style={{ fontSize: isMobile ? '0.75rem' : '1rem' }}>
                {isMobile ? 'Current' : 'Current Repairs'}
              </span>
              <Badge 
                badgeContent={currentRepairsCount} 
                color="warning" 
                showZero
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: isMobile ? '16px' : '18px',
                    minWidth: isMobile ? '16px' : '18px'
                  }
                }}
              >
                <Box sx={{ width: isMobile ? 4 : 8 }} />
              </Badge>
            </Box>
          } 
        />
        <Tab 
          label={
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: isMobile ? 0.5 : 1,
              flexDirection: isMobile ? 'column' : 'row'
            }}>
              <span style={{ fontSize: isMobile ? '0.75rem' : '1rem' }}>
                {isMobile ? 'Done' : 'Completed Repairs'}
              </span>
              <Badge 
                badgeContent={completedRepairsCount} 
                color="success" 
                showZero
                sx={{
                  '& .MuiBadge-badge': {
                    fontSize: '0.65rem',
                    height: isMobile ? '16px' : '18px',
                    minWidth: isMobile ? '16px' : '18px'
                  }
                }}
              >
                <Box sx={{ width: isMobile ? 4 : 8 }} />
              </Badge>
            </Box>
          } 
        />
      </Tabs>
    </Box>
  );
}