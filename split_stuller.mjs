import fs from 'fs';

const txt = fs.readFileSync('dump_stuller.txt', 'utf8');

const tableStart = txt.indexOf('<TableContainer component={Paper}>');
const tableEnd = txt.indexOf('</TableContainer>') + '</TableContainer>'.length;

const dialogStart = txt.indexOf('{/* Add Product Dialog */}');
// dialog ends before </Box>
const dialogEnd = txt.lastIndexOf('</Box>');

const tableContent = txt.substring(tableStart, tableEnd);
const dialogContent = txt.substring(dialogStart, dialogEnd);

fs.mkdirSync('src/app/components/materials/stuller-parts', { recursive: true });

const tableComp = `import React from 'react';
import { TableContainer, Paper, Table, TableHead, TableRow, TableCell, TableBody, Typography, Chip, IconButton } from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon } from '@mui/icons-material';

export const StullerProductsTable = ({ stullerProducts, adminSettings, formatCurrency, getPriceWithMarkup, setStullerProducts, formData }) => {
  return (
    <>
${tableContent}
    </>
  );
};
`;

const dialogComp = `import React from 'react';
import { Dialog, DialogTitle, DialogContent, Box, TextField, DialogActions, Button } from '@mui/material';

export const StullerProductDialog = ({ addDialogOpen, setAddDialogOpen, newProduct, handleNewProductChange, handleAddProduct }) => {
  return (
    <>
${dialogContent}
    </>
  );
};
`;

fs.writeFileSync('src/app/components/materials/stuller-parts/StullerProductsTable.js', tableComp);
fs.writeFileSync('src/app/components/materials/stuller-parts/StullerProductDialog.js', dialogComp);

const prefix = txt.substring(0, tableStart);
const mid = txt.substring(tableEnd, dialogStart);

const newMain = prefix.replace(
  "import React, { useState } from 'react';", 
  "import React, { useState } from 'react';\nimport { StullerProductsTable } from './stuller-parts/StullerProductsTable';\nimport { StullerProductDialog } from './stuller-parts/StullerProductDialog';"
) + `
        <StullerProductsTable 
          stullerProducts={stullerProducts} 
          adminSettings={adminSettings}
          formatCurrency={formatCurrency}
          getPriceWithMarkup={getPriceWithMarkup}
          setStullerProducts={setStullerProducts}
          formData={formData}
        />
${mid}
        <StullerProductDialog 
          addDialogOpen={addDialogOpen}
          setAddDialogOpen={setAddDialogOpen}
          newProduct={newProduct}
          handleNewProductChange={handleNewProductChange}
          handleAddProduct={handleAddProduct}
        />
      </Box>
  );
}
`;

fs.writeFileSync('src/app/components/materials/StullerProductsManager.js', newMain);
console.log('StullerProductsManager split correctly.');
