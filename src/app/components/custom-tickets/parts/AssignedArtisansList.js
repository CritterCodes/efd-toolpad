import React from 'react';
import { Box, Typography, List, ListItem, ListItemAvatar, Avatar, ListItemText, ListItemSecondaryAction, IconButton, Chip } from '@mui/material';
import { Person, Remove, Engineering, Diamond, Hardware } from '@mui/icons-material';

export const AssignedArtisansList = ({ assignedArtisans, handleRemoveArtisan }) => {
  const getRoleIcon = (role) => {
    switch (role) {
      case 'CAD Designer': return <Engineering />;
      case 'Diamond Setter': return <Diamond />;
      case 'Metal Worker': return <Hardware />;
      default: return <Person />;
    }
  };

  return (
    <>
{/* Assigned Artisans List */}
        {assignedArtisans.length === 0 ? (
          <Box textAlign="center" py={2}>
            <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              No artisans assigned to this ticket
            </Typography>
          </Box>
        ) : (
          <List>
            {assignedArtisans.map((artisan, index) => (
              <ListItem key={index} divider={index < assignedArtisans.length - 1}>
                <ListItemAvatar>
                  <Avatar>
                    {getArtisanIcon(artisan.artisanType)}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={artisan.userName}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {artisan.artisanType}
                      </Typography>
                      {artisan.assignedAt && (
                        <Typography variant="caption" color="text.secondary">
                          Assigned: {new Date(artisan.assignedAt).toLocaleDateString()}
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    onClick={() => removeArtisan(artisan.userId)}
                    disabled={loading}
                    color="error"
                    size="small"
                  >
                    <Remove />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}

        
    </>
  );
};
