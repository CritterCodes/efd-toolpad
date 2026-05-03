import React, { useState } from 'react';
import {
    Box, Typography, Grid, FormControl, InputLabel, Select, MenuItem,
    TextField, Button, List, ListItem, ListItemText, ListItemSecondaryAction,
    IconButton, Divider, Autocomplete, Paper
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const METAL_TYPES = [
  { value: 'yellow-gold', label: 'Yellow Gold', karatOptions: ['10k', '14k', '18k', '22k', '24k'] },
  { value: 'white-gold', label: 'White Gold', karatOptions: ['10k', '14k', '18k', '19k'] },
  { value: 'rose-gold', label: 'Rose Gold', karatOptions: ['10k', '14k', '18k'] },
  { value: 'sterling-silver', label: 'Sterling Silver', karatOptions: ['925'] },
  { value: 'fine-silver', label: 'Fine Silver', karatOptions: ['999'] },
  { value: 'platinum', label: 'Platinum', karatOptions: ['900', '950'] },
  { value: 'palladium', label: 'Palladium', karatOptions: ['950'] },
  { value: 'stainless', label: 'Stainless Steel', karatOptions: [] },
  { value: 'brass', label: 'Brass', karatOptions: [] },
  { value: 'copper', label: 'Copper', karatOptions: [] },
  { value: 'titanium', label: 'Titanium', karatOptions: [] },
  { value: 'other', label: 'Other', karatOptions: [] }
];

const MetalList = ({ metals, onChange }) => {
    const [newMetal, setNewMetal] = useState({ type: '', purity: '' });

    const handleAdd = () => {
        if (newMetal.type) {
            onChange([...metals, newMetal]);
            setNewMetal({ type: '', purity: '' });
        }
    };

    const selectedMetalType = METAL_TYPES.find(m => m.value === newMetal.type);

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>Metals Used</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Metal Type</InputLabel>
                        <Select
                            value={newMetal.type} label="Metal Type"
                            onChange={(e) => setNewMetal({ ...newMetal, type: e.target.value, purity: '' })}
                        >
                            {METAL_TYPES.map((metal) => (
                                <MenuItem key={metal.value} value={metal.value}>{metal.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                    {selectedMetalType?.karatOptions?.length > 0 ? (
                        <FormControl fullWidth size="small">
                            <InputLabel>Purity</InputLabel>
                            <Select
                                value={newMetal.purity} label="Purity"
                                onChange={(e) => setNewMetal({ ...newMetal, purity: e.target.value })}
                            >
                                {selectedMetalType.karatOptions.map((opt) => (
                                    <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : (
                        <TextField
                            label="Purity" size="small" fullWidth
                            value={newMetal.purity}
                            onChange={(e) => setNewMetal({ ...newMetal, purity: e.target.value })}
                            disabled={!newMetal.type}
                        />
                    )}
                </Grid>
                <Grid item xs={12} sm={2}>
                    <Button
                        variant="contained"
                        onClick={handleAdd}
                        fullWidth
                        disabled={!newMetal.type}
                        sx={{ minHeight: 40 }}
                    >
                        Add
                    </Button>
                </Grid>
            </Grid>
            <List dense>
                {metals.map((metal, index) => (
                    <ListItem
                        key={index}
                        sx={{
                            bgcolor: 'background.paper',
                            mb: 1,
                            borderRadius: 1,
                            border: '1px solid #eee',
                            pr: 7,
                        }}
                    >
                        <ListItemText
                            primary={`${metal.purity || ''} ${METAL_TYPES.find(m => m.value === metal.type)?.label || metal.type}`}
                            primaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" size="small" onClick={() => onChange(metals.filter((_, i) => i !== index))}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

const StoneList = ({ title, stones, onChange }) => {
    const [newStone, setNewStone] = useState({ type: '', count: '', size: '', weight: '' });

    const handleAdd = () => {
        if (newStone.type) {
            onChange([...stones, newStone]);
            setNewStone({ type: '', count: '', size: '', weight: '' });
        }
    };

    return (
        <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>{title}</Typography>
            <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField label="Type" size="small" fullWidth value={newStone.type} onChange={(e) => setNewStone({ ...newStone, type: e.target.value })} placeholder="e.g. Diamond" />
                </Grid>
                <Grid item xs={6} sm={3} md={2}>
                    <TextField label="Count" size="small" fullWidth type="number" value={newStone.count} onChange={(e) => setNewStone({ ...newStone, count: e.target.value })} />
                </Grid>
                <Grid item xs={6} sm={3} md={3}>
                    <TextField label="Size (mm)" size="small" fullWidth value={newStone.size} onChange={(e) => setNewStone({ ...newStone, size: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TextField label="Weight (ct)" size="small" fullWidth value={newStone.weight} onChange={(e) => setNewStone({ ...newStone, weight: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <Button variant="contained" onClick={handleAdd} fullWidth sx={{ minHeight: 40 }}>Add</Button>
                </Grid>
            </Grid>
            <List dense>
                {stones.map((stone, index) => (
                    <ListItem
                        key={index}
                        sx={{
                            bgcolor: 'background.paper',
                            mb: 1,
                            borderRadius: 1,
                            border: '1px solid #eee',
                            pr: 7,
                        }}
                    >
                        <ListItemText
                            primary={stone.type}
                            secondary={`${stone.count} pcs | ${stone.size} | ${stone.weight} ct`}
                            primaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
                            secondaryTypographyProps={{ sx: { overflowWrap: 'anywhere' } }}
                        />
                        <ListItemSecondaryAction>
                            <IconButton edge="end" size="small" onClick={() => onChange(stones.filter((_, i) => i !== index))}>
                                <DeleteIcon />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export default function JewelryMaterials({ formData, handleInputChange, availableGemstones }) {
    return (
        <Paper sx={{ mb: 3, p: { xs: 2, sm: 3 } }}>
            <Typography variant="h6" gutterBottom>Materials & Stones</Typography>
            <MetalList metals={formData.metals} onChange={(val) => handleInputChange('metals', val)} />
            <Divider sx={{ my: 3 }} />
            <StoneList title="Center Stones" stones={formData.centerStones} onChange={(val) => handleInputChange('centerStones', val)} />
            <Divider sx={{ my: 3 }} />
            <StoneList title="Accent Stones" stones={formData.accentStones} onChange={(val) => handleInputChange('accentStones', val)} />
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" gutterBottom>Linked Gemstones</Typography>
            <Autocomplete
                multiple
                options={availableGemstones}
                getOptionLabel={(option) => `${option.title} (${option.gemstone?.gemType})`}
                value={availableGemstones.filter(g => formData.gemstoneLinks.includes(g._id || g.productId))}
                onChange={(event, newValue) => {
                    handleInputChange('gemstoneLinks', newValue.map(v => v._id || v.productId));
                }}
                renderInput={(params) => (
                    <TextField {...params} label="Select Gemstones from Inventory" placeholder="Search..." />
                )}
            />
        </Paper>
    );
}
