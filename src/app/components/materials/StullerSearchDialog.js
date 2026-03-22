import React from 'react';
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
                    <Tab label={`Results (${searchResults.length})`} disabled={searchResults.length === 0} />
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
