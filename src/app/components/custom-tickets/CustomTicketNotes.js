/**
 * Custom Ticket Notes Component
 * Displays and manages ticket notes - Constitutional Architecture
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon
} from '@mui/icons-material';

export function CustomTicketNotes({ 
  ticket,
  notes = [],
  noteModal,
  newNote,
  saving,
  onNewNoteChange,
  onOpenNoteModal,
  onCloseNoteModal,
  onAddNote,
  onDeleteNote
}) {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getAuthorIcon = (note) => {
    const isAdmin = note.author?.includes('Admin') || note.type === 'internal';
    return isAdmin ? <AdminIcon /> : <PersonIcon />;
  };

  const getAuthorColor = (note) => {
    const isAdmin = note.author?.includes('Admin') || note.type === 'internal';
    return isAdmin ? 'primary' : 'default';
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Notes ({notes.length})
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={onOpenNoteModal}
              size="small"
            >
              Add Note
            </Button>
          </Box>

          {notes.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: 4, 
              color: 'text.secondary',
              bgcolor: 'grey.50',
              borderRadius: 1
            }}>
              <Typography variant="body2">
                No notes yet. Add a note to keep track of important information.
              </Typography>
            </Box>
          ) : (
            <List sx={{ maxHeight: 400, overflowY: 'auto' }}>
              {notes.map((note, index) => (
                <React.Fragment key={note.id || index}>
                  <ListItem alignItems="flex-start">
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: getAuthorColor(note) + '.main',
                          mr: 2,
                          width: 32,
                          height: 32
                        }}
                      >
                        {getAuthorIcon(note)}
                      </Avatar>
                      
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" fontWeight="medium">
                              {note.author || 'Unknown User'}
                            </Typography>
                            
                            {note.type === 'internal' && (
                              <Chip label="Internal" size="small" color="primary" variant="outlined" />
                            )}
                            
                            {note.type === 'client' && (
                              <Chip label="Client Visible" size="small" color="info" variant="outlined" />
                            )}
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(note.timestamp)}
                            </Typography>
                            
                            {onDeleteNote && (
                              <IconButton
                                size="small"
                                onClick={() => onDeleteNote(note.id)}
                                color="error"
                                sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>
                        
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {note.text}
                        </Typography>
                        
                        {note.tags && note.tags.length > 0 && (
                          <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {note.tags.map((tag, tagIndex) => (
                              <Chip 
                                key={tagIndex}
                                label={tag}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                              />
                            ))}
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </ListItem>
                  
                  {index < notes.length - 1 && (
                    <Divider variant="inset" component="li" sx={{ ml: 6 }} />
                  )}
                </React.Fragment>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Add Note Dialog */}
      <Dialog 
        open={noteModal.open} 
        onClose={onCloseNoteModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Note</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            label="Note"
            variant="outlined"
            value={newNote}
            onChange={(e) => onNewNoteChange(e.target.value)}
            placeholder="Enter your note here..."
            sx={{ mt: 1 }}
          />
          
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            This note will be marked as internal and visible only to admin users.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={onCloseNoteModal}>
            Cancel
          </Button>
          <Button 
            onClick={onAddNote} 
            variant="contained"
            disabled={!newNote.trim() || saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? 'Adding...' : 'Add Note'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default CustomTicketNotes;