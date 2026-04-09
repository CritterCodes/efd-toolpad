import React from 'react';
import { Card, CardContent, Typography, List, ListItem, ListItemIcon, ListItemText, Box, Chip, Divider } from '@mui/material';
import { AccessTime as AccessTimeIcon } from '@mui/icons-material';

export default function AdminRecentActivity({ recentActivity }) {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Recent Activity
                </Typography>
                <List>
                    {recentActivity.map((activity, index) => (
                        <React.Fragment key={activity.id}>
                            <ListItem>
                                <ListItemIcon>
                                    <AccessTimeIcon color="action" />
                                </ListItemIcon>
                                <ListItemText
                                    primary={`${activity.customerName} - ${activity.type}`}
                                    secondaryTypographyProps={{ component: 'div' }}
                                    secondary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip 
                                                label={activity.status} 
                                                size="small" 
                                                variant="outlined"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {new Date(activity.updatedAt).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                            {index < recentActivity.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            </CardContent>
        </Card>
    );
}
