import fs from 'fs';

const txt = fs.readFileSync('dump_artisan.txt', 'utf8');

const listStart = txt.indexOf('{/* Assigned Artisans List */}');
const dialogStart = txt.indexOf('{/* Assignment Dialog */}');
const dialogEnd = txt.lastIndexOf('</Card>');

const listContent = txt.substring(listStart, dialogStart);
const dialogContent = txt.substring(dialogStart, dialogEnd);

fs.mkdirSync('src/app/components/custom-tickets/parts', { recursive: true });

// We write the list component
const listComp = `import React from 'react';
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
${listContent}
    </>
  );
};
`;

const fixedListComp = listComp.replace(/\{assignedArtisans\.length === 0 \? \(/g, '{assignedArtisans.length === 0 ? (')
                              .replace(/getRoleIcon/g, 'getRoleIcon');

// Write the Modal component
const modalComp = `import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Typography, Box, CircularProgress, Alert } from '@mui/material';

export const AssignArtisanModal = ({ open, setOpen, loading, error, availableArtisans, selectedArtisanId, setSelectedArtisanId, handleAssignArtisan }) => {
  return (
    <>
${dialogContent}
    </>
  );
};
`;

fs.writeFileSync('src/app/components/custom-tickets/parts/AssignedArtisansList.js', fixedListComp);
fs.writeFileSync('src/app/components/custom-tickets/parts/AssignArtisanModal.js', modalComp);

// Reconstruct main file
const prefix = txt.substring(0, listStart);
const suffix = txt.substring(dialogEnd);

const newMain = prefix.replace(
  "import {", 
  "import { AssignedArtisansList } from './parts/AssignedArtisansList';\nimport { AssignArtisanModal } from './parts/AssignArtisanModal';\nimport {"
) + `
        <AssignedArtisansList 
          assignedArtisans={assignedArtisans} 
          handleRemoveArtisan={handleRemoveArtisan} 
        />
        <AssignArtisanModal 
          open={open}
          setOpen={setOpen}
          loading={loading}
          error={error}
          availableArtisans={availableArtisans}
          selectedArtisanId={selectedArtisanId}
          setSelectedArtisanId={setSelectedArtisanId}
          handleAssignArtisan={handleAssignArtisan}
        />
    ` + suffix;

fs.writeFileSync('src/app/components/custom-tickets/ArtisanAssignment.js', newMain);
console.log('ArtisanAssignment split correctly.');

