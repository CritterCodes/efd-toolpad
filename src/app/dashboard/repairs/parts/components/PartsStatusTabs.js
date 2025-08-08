import React from 'react';
import { Tabs, Tab, Box, Typography } from '@mui/material';
import { PARTS_TABS } from '../constants';

const PartsStatusTabs = ({ activeTab, onChange }) => {
    return (
        <Box sx={{ mb: 3 }}>
            <Tabs 
                value={activeTab} 
                onChange={onChange}
                variant="fullWidth"
                sx={{ 
                    borderBottom: 1, 
                    borderColor: 'divider',
                    '& .MuiTab-root': {
                        textTransform: 'none',
                        fontSize: '1rem',
                        fontWeight: 500
                    }
                }}
            >
                {PARTS_TABS.map((tab) => (
                    <Tab 
                        key={tab.value}
                        label={
                            <Box>
                                <Typography variant="body1" fontWeight={500}>
                                    {tab.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {tab.description}
                                </Typography>
                            </Box>
                        }
                        value={tab.value}
                    />
                ))}
            </Tabs>
        </Box>
    );
};

export default PartsStatusTabs;
