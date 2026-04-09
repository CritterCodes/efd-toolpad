'use client';
import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from "@mui/material/Grid";
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
export const useSimpleMetalContext = () => {
  const [metalContext, setMetalContext] = useState({
    metalType: 'yellow_gold',
    karat: '14k'
  });

  const setMetalType = (metalType) => {
    setMetalContext(prev => ({ ...prev, metalType }));
  };

  const setKarat = (karat) => {
    setMetalContext(prev => ({ ...prev, karat }));
  };

  return {
    currentMetalContext: metalContext,
    setMetalType,
    setKarat,
    error: null
  };
};

// Metal Context Selector Component
export function MetalContextSelector() {
  const { currentMetalContext, setMetalType, setKarat, error } = useSimpleMetalContext();
  
  const metalTypes = [
    { value: 'yellow_gold', label: 'Yellow Gold', color: '#FFD700' },
    { value: 'white_gold', label: 'White Gold', color: '#E8E8E8' },
    { value: 'rose_gold', label: 'Rose Gold', color: '#E8B4A0' },
    { value: 'sterling_silver', label: 'Sterling Silver', color: '#C0C0C0' },
    { value: 'fine_silver', label: 'Fine Silver', color: '#E5E5E5' },
    { value: 'platinum', label: 'Platinum', color: '#E5E4E2' },
    { value: 'mixed', label: 'Mixed Metals', color: '#A0A0A0' },
    { value: 'n_a', label: 'N/A', color: '#808080' }
  ];

  const karatOptions = ['10k', '14k', '18k', '22k', '24k', '925', '999', '950', '900', 'N/A'];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Metal Type</InputLabel>
          <Select
            value={currentMetalContext.metalType}
            onChange={(e) => setMetalType(e.target.value)}
            label="Metal Type"
          >
            {metalTypes.map((metal) => (
              <MenuItem key={metal.value} value={metal.value}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 16,
                      height: 16,
                      bgcolor: metal.color,
                      borderRadius: '50%',
                      mr: 1,
                      border: '1px solid #ccc'
                    }}
                  />
                  {metal.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} md={6}>
        <FormControl fullWidth required>
          <InputLabel>Karat/Purity</InputLabel>
          <Select
            value={currentMetalContext.karat}
            onChange={(e) => setKarat(e.target.value)}
            label="Karat/Purity"
          >
            {karatOptions.map((karat) => (
              <MenuItem key={karat} value={karat}>
                {karat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Grid>
      
      {error && (
        <Grid item xs={12}>
          <Alert severity="error">{typeof error === 'string' ? error : JSON.stringify(error, null, 2)}</Alert>
        </Grid>
      )}
    </Grid>
  );
}

