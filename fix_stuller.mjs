import fs from 'fs';

let content = fs.readFileSync('stuller.txt', 'utf8');

// I am extracting the render consts from StullerSearchDialog.
let searchFormStart = content.indexOf('const renderSearchForm = () => (');
let searchFormEnd = content.indexOf('const renderSearchResults = () => (');
let searchFormBody = content.substring(searchFormStart, searchFormEnd);

let searchResStart = searchFormEnd;
let searchResEnd = content.indexOf('const renderImportResults = () => (');
let searchResBody = content.substring(searchResStart, searchResEnd);

let importStart = searchResEnd;
let importEnd = content.indexOf('return (', importStart);
let importBody = content.substring(importStart, importEnd);

// Rewrite to components
let StullerSearchFilters = `import React from 'react';
import { Box, Grid, TextField, FormControl, InputLabel, Select, MenuItem, Button, CircularProgress, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

export default function StullerSearchFilters({ searchParams, setSearchParams, handleSearch, handleClear, loading }) {
    return (${searchFormBody.substring(searchFormBody.indexOf('(') + 1, searchFormBody.lastIndexOf(')'))});
}`;

let StullerProductGrid = `import React from 'react';
import { Box, Grid, Card, CardMedia, CardContent, Typography, Checkbox, FormControlLabel, Select, MenuItem, Button } from '@mui/material';

export default function StullerProductGrid({ searchResults, selectedProducts, handleProductSelect }) {
    return (${searchResBody.substring(searchResBody.indexOf('(') + 1, searchResBody.lastIndexOf(')'))});
}`;

let StullerImportResults = `import React from 'react';
import { Box, Typography, Alert, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

export default function StullerImportResults({ importResults }) {
    return (${importBody.substring(importBody.indexOf('(') + 1, importBody.lastIndexOf(')'))});
}`;

fs.mkdirSync('src/app/components/materials/search', { recursive: true });
fs.writeFileSync('src/app/components/materials/search/StullerSearchFilters.js', StullerSearchFilters);
fs.writeFileSync('src/app/components/materials/search/StullerProductGrid.js', StullerProductGrid);
fs.writeFileSync('src/app/components/materials/search/StullerImportResults.js', StullerImportResults);

let orchestrator = `import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Tabs, Tab, Button, CircularProgress, Alert, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useStullerSearch } from '../../../hooks/materials/useStullerSearch';
import StullerSearchFilters from './search/StullerSearchFilters';
import StullerProductGrid from './search/StullerProductGrid';
import StullerImportResults from './search/StullerImportResults';

export default function StullerSearchDialog(props) {
    const hookData = useStullerSearch(props);
    const {
        searchParams, setSearchParams, searchResults, loading, error, 
        selectedProducts, importing, importResults, tabValue, setTabValue,
        handleSearch, handleProductSelect, handleImport, handleClear
    } = hookData;

    return (
        <Dialog open={props.open} onClose={props.onClose} maxWidth="lg" fullWidth PaperProps={{ sx: { height: '80vh' } }}>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={2}>
                    <SearchIcon />
                    Stuller Material Search & Import
                </Box>
            </DialogTitle>
            <DialogContent dividers>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
                    <Tab label="Search" />
                    <Tab label={\`Results (\${searchResults.length})\`} disabled={searchResults.length === 0} />
                    <Tab label="Import Results" disabled={!importResults} />
                </Tabs>
                {tabValue === 0 && <StullerSearchFilters searchParams={searchParams} setSearchParams={setSearchParams} handleSearch={handleSearch} handleClear={handleClear} loading={loading} />}
                {tabValue === 1 && <StullerProductGrid searchResults={searchResults} selectedProducts={selectedProducts} handleProductSelect={handleProductSelect} />}
                {tabValue === 2 && <StullerImportResults importResults={importResults} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={props.onClose}>Close</Button>
                {tabValue === 1 && (
                    <Button variant="contained" onClick={handleImport} disabled={Object.keys(selectedProducts).length === 0 || importing} startIcon={importing ? <CircularProgress size={20} /> : undefined}>
                        Import Selected ({Object.keys(selectedProducts).length})
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
}
`;

fs.writeFileSync('src/app/components/materials/StullerSearchDialog.js', orchestrator);
console.log('Stuller refactored!');
