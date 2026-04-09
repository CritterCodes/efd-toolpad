import React from 'react';
import { Box, Button, IconButton, Tooltip, CardActions } from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';

export function TaskCardActions({
  task,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete
}) {
  return (
    <CardActions sx={{ justifyContent: 'space-between' }}>
      <Box>
        <IconButton 
          onClick={onToggleExpand}
          sx={{
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        >
          <ExpandMoreIcon />
        </IconButton>
        
        <Tooltip title="Task pricing info">
          <IconButton size="small">
            <InfoIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Box>
        {onEdit && (
          <Button 
            size="small" 
            startIcon={<EditIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
          >
            Edit
          </Button>
        )}
        
        {onDelete && (
          <Button 
            size="small" 
            color="error"
            startIcon={<DeleteIcon />}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task);
            }}
          >
            Delete
          </Button>
        )}
      </Box>
    </CardActions>
  );
}