import React from 'react';
import { Box, Chip } from '@mui/material';
import { Category as CategoryIcon } from '@mui/icons-material';
import { getMetalLabel } from '@/utils/materials.util';

export default function MaterialTags({ material, isMetalDependent, variantCount }) {
  const getMetalKaratCombinations = () => {
    if (!material.stullerProducts || material.stullerProducts.length === 0) {
      return [];
    }
    return material.stullerProducts.map(product => ({
      metal: product.metalType ? getMetalLabel(product.metalType) : 'N/A',
      karat: product.karat || 'N/A'
    }));
  };

  return (
    <>
      {/* Primary info chips */}
      <Box display="flex" gap={0.5} flexWrap="wrap" mb={1.5}>
        <Chip
          label={material.category}
          variant="outlined"
          size="small"
          icon={<CategoryIcon />}
          sx={{ fontSize: '0.75rem' }}
        />
        {!isMetalDependent ? (
          <Chip
            label="Universal"
            variant="filled"
            size="small"
            color="secondary"
            sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
          />
        ) : variantCount > 0 && (
          <Chip
            label={`${variantCount} variant${variantCount > 1 ? 's' : ''}`}
            variant="filled"
            size="small"
            color="primary"
            sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
          />
        )}
      </Box>

      {/* Metal/Karat combinations for multi-variant materials */}
      {isMetalDependent && variantCount > 0 && (
        <Box mb={1}>
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {getMetalKaratCombinations().slice(0, 3).map((combo, index) => (
              <Chip
                key={index}
                label={`${combo.metal} ${combo.karat}`}
                size="small"
                variant="outlined"
                color="info"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {variantCount > 3 && (
              <Chip
                label={`+${variantCount - 3} more`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* Universal material indicator */}
      {!isMetalDependent && (
        <Box mb={1}>
          <Chip
            label="Works with all metal types"
            size="small"
            variant="outlined"
            color="secondary"
            sx={{ fontSize: '0.7rem' }}
          />
        </Box>
      )}

      {/* Legacy compatible metals */}
      {isMetalDependent && variantCount === 0 && material.compatibleMetals?.length > 0 && (
        <Box mb={1}>
          <Box display="flex" gap={0.5} flexWrap="wrap">
            {material.compatibleMetals.slice(0, 3).map((metal) => (
              <Chip
                key={metal}
                label={getMetalLabel(metal)}
                size="small"
                variant="outlined"
                color="info"
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
            {material.compatibleMetals.length > 3 && (
              <Chip
                label={`+${material.compatibleMetals.length - 3} more`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem' }}
              />
            )}
          </Box>
        </Box>
      )}
    </>
  );
}
