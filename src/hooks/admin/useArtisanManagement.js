import { useState, useEffect } from 'react';

export const useArtisanManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchArtisans = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/users?role=artisan');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load artisans');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArtisans();
  }, []);

  return { data, loading, error, refetch: fetchArtisans };
};
