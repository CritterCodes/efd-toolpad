import React from 'react';
import { Typography } from '@mui/material';
import { Business as BusinessIcon } from '@mui/icons-material';

export default function MaterialSupplierInfo({ material, isMetalDependent, variantCount }) {
  if (!material.supplier) return null;

  return (
    <Typography variant="caption" color="text.secondary" display="block">
      <BusinessIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
      {material.supplier}
      {!isMetalDependent ? (
        <> (Universal material)</>
      ) : variantCount > 0 ? (
        <> ({variantCount} Stuller product{variantCount > 1 ? 's' : ''})</>
      ) : material.stuller_item_number ? (
        <> (#{material.stuller_item_number})</>
      ) : null}
    </Typography>
  );
}
