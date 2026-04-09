import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { COLLECTION_TYPES, canUserDoAction } from '@/constants/roles';

export function useCollectionManager() {
  const { data: session } = useSession();
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: COLLECTION_TYPES.ARTISAN,
    visibility: 'public'
  });

  // Fetch collections and products
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch collections
        const collRes = await fetch('/api/collections');
        if (!collRes.ok) throw new Error('Failed to fetch collections');
        const collData = await collRes.json();
        setCollections(collData.collections || []);

        // Fetch available products
        const prodRes = await fetch('/api/products?status=published');
        if (!prodRes.ok) throw new Error('Failed to fetch products');
        const prodData = await prodRes.json();
        setProducts(prodData.products || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchData();
    }
  }, [session]);

  const getVisibleCollections = () => {
    let filtered = collections;

    if (session?.user?.role === 'artisan' || session?.user?.role === 'senior-artisan') {
      filtered = filtered.filter(c => c.createdBy === session?.user?.userID);
    } else if (session?.user?.role === 'wholesaler') {
      filtered = filtered.filter(c => c.visibility === 'public');
    }

    if (filter !== 'all') {
      filtered = filtered.filter(c => c.type === filter);
    }

    return filtered;
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Failed to create collection');
      const newCollection = await response.json();
      setCollections([...collections, newCollection.collection]);
      setFormData({
        name: '',
        description: '',
        type: COLLECTION_TYPES.ARTISAN,
        visibility: 'public'
      });
      setShowForm(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('Are you sure you want to delete this collection?')) return;
    try {
      const response = await fetch(`/api/collections/${collectionId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete collection');
      setCollections(collections.filter(c => c._id !== collectionId));
      setSelectedCollection(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePublishCollection = async (collectionId) => {
    try {
      const response = await fetch(`/api/collections/${collectionId}/publish`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to publish collection');
      const updated = await response.json();
      setCollections(collections.map(c => 
        c._id === collectionId ? updated.collection : c
      ));
    } catch (err) {
      setError(err.message);
    }
  };

  const canCreate = canUserDoAction(session?.user?.role, 'canCreateCollections');
  const canDeleteAll = canUserDoAction(session?.user?.role, 'canDeleteCollections');
  const visibleCollections = getVisibleCollections();

  return {
    session,
    collections,
    products,
    loading,
    error,
    showForm,
    setShowForm,
    selectedCollection,
    setSelectedCollection,
    filter,
    setFilter,
    formData,
    setFormData,
    visibleCollections,
    canCreate,
    canDeleteAll,
    handleCreateCollection,
    handleDeleteCollection,
    handlePublishCollection
  };
}