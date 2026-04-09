import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Typography, Box, CircularProgress, Alert } from '@mui/material';

export const AssignArtisanModal = ({ open, setOpen, loading, error, availableArtisans, selectedArtisanId, setSelectedArtisanId, handleAssignArtisan }) => {
  return (
    <>
{/* Assignment Dialog */}
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Assign Artisan to Ticket</DialogTitle>
          <DialogContent>
            <FormControl fullWidth margin="normal">
              <InputLabel>Select Artisan</InputLabel>
              <Select
                value={selectedArtisan}
                onChange={(e) => setSelectedArtisan(e.target.value)}
                label="Select Artisan"
              >
                {availableArtisans.map((artisan) => (
                  <MenuItem key={artisan.userID} value={artisan.userID}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar size="small">
                        {artisan.artisanApplication?.businessName?.charAt(0) || artisan.firstName?.charAt(0) || 'A'}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="medium">
                          {artisan.artisanApplication?.businessName || `${artisan.firstName} ${artisan.lastName}` || 'Unknown Artisan'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {artisan.artisanApplication?.slug && `@${artisan.artisanApplication.slug}`}
                          {(() => {
                            const types = normalizeArtisanType(artisan.artisanApplication?.artisanType);
                            return types.length > 0 && (
                              <span style={{ marginLeft: artisan.artisanApplication?.slug ? 4 : 0 }}>
                                • {types.join(', ')}
                              </span>
                            );
                          })()}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              onClick={assignArtisan} 
              variant="contained"
              disabled={!selectedArtisan || loading}
              startIcon={loading && <CircularProgress size={16} />}
            >
              Assign
            </Button>
          </DialogActions>
        </Dialog>
      
    
    </>
  );
};
