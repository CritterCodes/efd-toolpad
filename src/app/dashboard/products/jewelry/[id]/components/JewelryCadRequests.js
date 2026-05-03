import React from 'react';
import {
    Paper, Box, Typography, Button, List, ListItem, ListItemText, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';

export default function JewelryCadRequests({ cadRequests, handleOpenCadDialog, cadDialogOpen, handleCloseCadDialog, editingCadRequest }) {
    return (
        <>
            <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 } }}>
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        gap: 1.5,
                        mb: 2,
                    }}
                >
                    <Typography variant="h6">CAD Requests</Typography>
                    <Button startIcon={<AddIcon />} onClick={() => handleOpenCadDialog()} fullWidth={false} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>
                        New Request
                    </Button>
                </Box>
                {cadRequests.length === 0 ? (
                    <Typography color="text.secondary">No CAD requests yet.</Typography>
                ) : (
                    <List>
                        {cadRequests.map((req, i) => (
                            <ListItem
                                key={i}
                                divider
                                sx={{
                                    alignItems: { xs: 'flex-start', sm: 'center' },
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    gap: { xs: 1, sm: 0 },
                                }}
                            >
                                <ListItemText 
                                    primary={`Request #${i+1} - ${req.status}`}
                                    secondary={req.mountingDetails?.styleDescription}
                                    primaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
                                    secondaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
                                />
                                <Button size="small" onClick={() => handleOpenCadDialog(req)} sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}>View</Button>
                            </ListItem>
                        ))}
                    </List>
                )}
            </Paper>

            <Dialog open={cadDialogOpen} onClose={handleCloseCadDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingCadRequest ? 'Edit CAD Request' : 'New CAD Request'}</DialogTitle>
                <DialogContent>
                    <Typography sx={{ p: 2 }}>CAD Request functionality is currently being updated.</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCadDialog}>Close</Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
