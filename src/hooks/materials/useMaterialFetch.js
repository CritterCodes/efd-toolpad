'use client';

import { useState, useCallback, useEffect } from 'react';
import materialsService from '@/services/materials.service';

export const useMaterialFetch = () => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const materialsData = await materialsService.getMaterials();
      setMaterials(materialsData);
    } catch (err) {
      console.error('Error loading materials:', err);
      setError(err.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  return { materials, loading, error, setError, loadMaterials };
};