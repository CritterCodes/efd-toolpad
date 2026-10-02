import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Box, Button, CircularProgress, Alert } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useStullerSearch } from '../../../hooks/materials/useStullerSearch';
import StullerSearchFilters from './search/StullerSearchFilters';
import StullerProductGrid from './search/StullerProductGrid';
import StullerImportResults from './search/StullerImportResults';
import { TabRail } from '@/components/facelift';

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
                <TabRail
                    ariaLabel="Stuller import steps"
                    value={tabValue}
                    onChange={setTabValue}
                    items={[
                        { key: 0, label: 'Search' },
                        ...(searchResults.length ? [{ key: 1, label: 'Results', count: searchResults.length }] : []),
                        ...(importResults ? [{ key: 2, label: 'Import Results' }] : []),
                    ]}
                />
                {tabValue === 0 && <StullerSearchFilters searchParams={searchParams} setSearchParams={setSearchParams} handleSearch={handleSearch} handleClear={handleClear} loading={loading} suggestions={{ categories: [], metalTypes: [] }} />}
                {tabValue === 1 && <StullerProductGrid searchResults={searchResults} selectedProducts={selectedProducts} handleProductSelect={handleProductSelect} handleImport={handleImport} importing={importing} />}
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
