
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

export function useGemstoneManagement(apiPath = '/api/products/gemstones') {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(apiPath);
      const data = await response.json();
      if (data.success || data.gemstones) {
        setProducts(data.gemstones || []);
      } else {
        setError('Failed to fetch products');
      }
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  }, [apiPath]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDeleteProduct = async (product) => {
    const id = product._id || product.id || product;
    if (!window.confirm('Are you sure you want to delete this gemstone?')) return;
    try {
      setLoading(true);
      const res = await fetch(`${apiPath}?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success || res.ok) {
        setSuccess('Deleted successfully');
        fetchProducts();
      } else {
        setError(data.error || 'Failed to delete');
      }
    } catch (err) {
      setError('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  return { products, setProducts, loading, error, setError, success, setSuccess, fetchProducts, handleDeleteProduct };
}
