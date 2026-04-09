import fs from 'fs';

const txt = fs.readFileSync('dump_jewelry.txt', 'utf8');

const filterStart = txt.indexOf('{/* Filters */}');
const gridStart = txt.indexOf('{/* Grid */}');
const paginationStart = txt.indexOf('{/* Pagination */}');

const filtersContent = txt.substring(filterStart, gridStart);
const gridContent = txt.substring(gridStart, paginationStart);

fs.mkdirSync('src/app/dashboard/products/jewelry/components', { recursive: true });

const filtersComp = `import React from 'react';
import { Paper, Grid, TextField, InputAdornment, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export const JewelryFilters = ({ searchTerm, setSearchTerm, filterStatus, setFilterStatus, filterType, setFilterType, typeOptions, sortBy, setSortBy }) => {
  return (
    <>
${filtersContent}
    </>
  );
};
`;

const gridComp = `import React from 'react';
import { Grid, Paper, Typography, Card, CardMedia, CardContent, Chip, Box, IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StorefrontIcon from '@mui/icons-material/Storefront';
import VisibilityIcon from '@mui/icons-material/Visibility';
import Link from 'next/link';

export const JewelryGrid = ({ paginatedJewelry, handleDelete }) => {
  return (
    <>
${gridContent}
    </>
  );
};
`;

fs.writeFileSync('src/app/dashboard/products/jewelry/components/JewelryFilters.js', filtersComp);
fs.writeFileSync('src/app/dashboard/products/jewelry/components/JewelryGrid.js', gridComp);

const prefix = txt.substring(0, filterStart);
const suffix = txt.substring(paginationStart);

const newMain = prefix.replace(
  "import {", 
  "import { JewelryFilters } from './components/JewelryFilters';\nimport { JewelryGrid } from './components/JewelryGrid';\nimport {"
) + `
            <JewelryFilters 
                searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                filterStatus={filterStatus} setFilterStatus={setFilterStatus}
                filterType={filterType} setFilterType={setFilterType}
                typeOptions={typeOptions}
                sortBy={sortBy} setSortBy={setSortBy} 
            />
            
            <JewelryGrid 
                paginatedJewelry={paginatedJewelry} 
                handleDelete={handleDelete} 
            />
            
` + suffix;

fs.writeFileSync('src/app/dashboard/products/jewelry/page.js', newMain);
console.log('Jewelry Page split correctly.');

