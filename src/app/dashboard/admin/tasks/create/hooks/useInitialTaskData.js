import { useState, useEffect } from 'react';

export function useInitialTaskData() {
  const [availableProcesses, setAvailableProcesses] = useState([]);
  const [availableMaterials, setAvailableMaterials] = useState([]);
  const [adminSettings, setAdminSettings] = useState(null);
  const [dataLoadErrors, setDataLoadErrors] = useState({
    processes: false,
    materials: false,
    settings: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadInitialData = async () => {
    try {
      const timestamp = new Date().getTime();
      const [processesRes, materialsRes, settingsRes] = await Promise.all([
        fetch(`/api/processes?_t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/materials?_t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        }),
        fetch(`/api/admin/settings?_t=${timestamp}`, {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);

      if (processesRes.ok) {
        const processesData = await processesRes.json();
        let processArray = [];
        if (Array.isArray(processesData)) {
            processArray = processesData;
        } else if (processesData && Array.isArray(processesData.processes)) {
            processArray = processesData.processes;
        } else if (processesData && Array.isArray(processesData.data)) {
            processArray = processesData.data;
        }

        const cleanProcesses = processArray.map(process => {
          const id = process._id || process.id || String(Math.random());
          const name = process.displayName || process.name || process.title || process.sku || `Process (${process.category || 'Unknown'})`;
          return {
            ...process,
            _id: id,
            name: name,
            category: process.category || 'uncategorized',
            laborHours: process.laborHours || 0,
            pricing: process.pricing || { totalCost: 0 }
          };
        });
        
        setAvailableProcesses(cleanProcesses);
      } else {
        const errorData = await processesRes.text();
        console.error('Failed to load processes:', errorData);
        throw new Error('Failed to load processes. Check server logs.');
      }

      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        const cleanMaterials = (materialsData.materials || []).map(material => ({
          _id: material._id,
          name: material.name,
          type: material.type || material.category,
          stullerProducts: material.stullerProducts || [],
          portionsPerUnit: material.portionsPerUnit || 1,
          cost: material.cost || 0
        }));
        setAvailableMaterials(cleanMaterials);
      } else {
        console.warn('Failed to load materials, continuing anyway');
        setDataLoadErrors(prev => ({ ...prev, materials: true }));
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const settings = settingsData.settings || settingsData;
        setAdminSettings(settings);
      } else {
        console.warn('Failed to load admin settings, checking authentication');
        setDataLoadErrors(prev => ({ ...prev, settings: true }));
      }

    } catch (error) {
      console.error(' Error loading initial data:', error);
      const errorMessage = typeof error === 'string' ? error : (error.message || 'Failed to load essential data.');
      setError(errorMessage);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  return {
    availableProcesses,
    availableMaterials,
    adminSettings,
    dataLoadErrors,
    loading,
    setLoading,
    error,
    setError,
    loadInitialData
  };
}
