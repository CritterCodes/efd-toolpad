import React from 'react';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Stack,
  Button
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon 
} from '@mui/icons-material';
import RepairCustomItem from './RepairCustomItem';

export default function RepairCustomItemsAccordion({
  expanded,
  onExpand,
  customLineItems = [],
  addCustomLineItem,
  updateItem,
  removeItem
}) {
  return (
    <Accordion 
      expanded={expanded}
      onChange={onExpand}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>
          Custom Items ({customLineItems.length})
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={2}>
          <Button 
            startIcon={<AddIcon />}
            onClick={addCustomLineItem}
            variant="outlined"
          >
            Add Custom Item
          </Button>
          
          {customLineItems.map(item => (
            <RepairCustomItem
              key={item.id}
              item={item}
              onDescriptionChange={(desc) => updateItem('customLineItems', item.id, 'description', desc)}
              onQuantityChange={(qty) => updateItem('customLineItems', item.id, 'quantity', qty)}
              onPriceChange={(price) => updateItem('customLineItems', item.id, 'price', price)}
              onRemove={() => removeItem('customLineItems', item.id)}
            />
          ))}
        </Stack>
      </AccordionDetails>
    </Accordion>
  );
}
