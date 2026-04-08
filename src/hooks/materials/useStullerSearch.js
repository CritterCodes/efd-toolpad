import { useState } from 'react';
import stullerIntegrationService from '@/services/stuller-integration.service';

export function useStullerSearch({ onImport }) {
  const [searchParams, setSearchParams] = useState({
    category: '',
    keywords: '',
    metalTypes: [],
    karats: []
  });
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedProducts, setSelectedProducts] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const handleSearch = async () => {
    if (!searchParams.keywords && !searchParams.category) {
      setError('Please enter keywords or select a category');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await stullerIntegrationService.searchProducts(searchParams);
      if (response?.success) {
        setSearchResults(response.data || []);
        setTabValue(1);
      } else {
        setError(response?.error || 'Search failed');
      }
    } catch (err) {
      setError(err?.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId, selected) => {
    setSelectedProducts((prev) => {
      const next = { ...prev };
      if (selected) next[productId] = true;
      else delete next[productId];
      return next;
    });
  };

  const handleImport = async () => {
    const productsToImport = searchResults.filter((p) => selectedProducts[p.id]);
    if (productsToImport.length === 0) {
      setError('Please select at least one product to import');
      return;
    }

    setImporting(true);
    setError('');
    try {
      const results = await stullerIntegrationService.bulkImport(productsToImport);
      setImportResults(results);
      setTabValue(2);
      if (onImport) {
        onImport(results?.imported || []);
      }
    } catch (err) {
      setError(err?.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleClear = () => {
    setSearchParams({ category: '', keywords: '', metalTypes: [], karats: [] });
    setSearchResults([]);
    setSelectedProducts({});
    setError('');
    setImportResults(null);
    setTabValue(0);
  };

  return {
    searchParams,
    setSearchParams,
    searchResults,
    loading,
    error,
    selectedProducts,
    importing,
    importResults,
    tabValue,
    setTabValue,
    handleSearch,
    handleProductSelect,
    handleImport,
    handleClear
  };
}
