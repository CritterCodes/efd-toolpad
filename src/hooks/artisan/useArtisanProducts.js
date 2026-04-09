'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export function useArtisanProducts() {
  const { data: session } = useSession();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'jewelry',
    gemstone: {
      type: '',
      weight: '',
      caratage: '',
      color: '',
      clarity: ''
    },
    materials: [],
    price: '',
    images: [],
    tags: []
  });
  const [uploadingImages, setUploadingImages] = useState(false);

  // Fetch artisan's products
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchProducts();
  }, [session]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/artisan/products?userId=${session.user.id}`);
      if (!res.ok) throw new Error(`Failed to fetch products: ${res.statusText}`);
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (files) => {
    try {
      setUploadingImages(true);
      const uploadedImages = [];

      for (const file of files) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);

        const data = await res.json();
        uploadedImages.push({
          url: data.url,
          thumbnail: data.thumbnail,
          filename: data.filename
        });
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }));
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.description) {
      setError('Title and description are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = editingProduct
        ? `/api/artisan/products/${editingProduct._id}`
        : '/api/artisan/products/submit';

      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        ...formData,
        userId: session.user.id,
        artisanId: session.user.artisanId
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Save failed: ${res.statusText}`);

      const data = await res.json();

      if (editingProduct) {
        setProducts(products.map(p => p._id === editingProduct._id ? data.product : p));
      } else {
        setProducts([...products, data.product]);
      }

      // Reset form
      setFormData({
        title: '', description: '', category: 'jewelry',
        gemstone: { type: '', weight: '', caratage: '', color: '', clarity: '' },
        materials: [], price: '', images: [], tags: []
      });
      setEditingProduct(null);
      setShowCreateModal(false);
    } catch (err) {
      console.error('Error saving product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/artisan/products/${productId}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error(`Delete failed: ${res.statusText}`);

      setProducts(products.filter(p => p._id !== productId));
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error deleting product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResubmitProduct = async (productId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/artisan/products/${productId}/resubmit`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error(`Resubmit failed: ${res.statusText}`);

      const data = await res.json();
      setProducts(products.map(p => p._id === productId ? data.product : p));
      setShowDetailModal(false);
    } catch (err) {
      console.error('Error resubmitting product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitProduct = async (productId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/submit`, {
        method: 'POST'
      });

      if (!res.ok) throw new Error(`Submit failed: ${res.statusText}`);

      const data = await res.json();
      setProducts(products.map(p => p._id === productId ? data.product : p));
      setSelectedProduct(data.product);
    } catch (err) {
      console.error('Error submitting product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnpublishProduct = async (productId, targetStatus = 'draft') => {
    try {
      setLoading(true);
      const res = await fetch(`/api/products/${productId}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetStatus })
      });

      if (!res.ok) throw new Error(`Unpublish failed: ${res.statusText}`);

      const data = await res.json();
      setProducts(products.map(p => p._id === productId ? data.product : p));
      setSelectedProduct(data.product);
    } catch (err) {
      console.error('Error unpublishing product:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = filterStatus === 'all'
    ? products
    : products.filter(p => p.status === filterStatus);

  const getStatusColor = (status) => {
    const colors = {
      'draft': '#94a3b8',
      'pending-approval': '#eab308',
      'approved': '#22c55e',
      'published': '#0ea5e9',
      'revision-requested': '#f97316',
      'rejected': '#ef4444',
      'archived': '#6b7280'
    };
    return colors[status] || '#6b7280';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'draft': 'Draft',
      'pending-approval': 'Pending Review',
      'approved': 'Approved',
      'published': 'Published',
      'revision-requested': 'Revision Needed',
      'rejected': 'Rejected',
      'archived': 'Archived'
    };
    return labels[status] || status;
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      title: '', description: '', category: 'jewelry',
      gemstone: { type: '', weight: '', caratage: '', color: '', clarity: '' },
      materials: [], price: '', images: [], tags: []
    });
    setShowCreateModal(true);
  };

  const openEditModal = (productToEdit) => {
    setEditingProduct(productToEdit);
    setFormData({
      title: productToEdit.title,
      description: productToEdit.description,
      category: productToEdit.category,
      gemstone: productToEdit.gemstone || { type: '', weight: '', caratage: '', color: '', clarity: '' },
      materials: productToEdit.materials || [],
      price: productToEdit.price,
      images: productToEdit.images || [],
      tags: productToEdit.tags || []
    });
    setShowDetailModal(false);
    setShowCreateModal(true);
  };

  return {
    session,
    products,
    loading,
    error,
    setError,
    selectedProduct,
    setSelectedProduct,
    showDetailModal,
    setShowDetailModal,
    showCreateModal,
    setShowCreateModal,
    filterStatus,
    setFilterStatus,
    editingProduct,
    setEditingProduct,
    formData,
    setFormData,
    uploadingImages,
    handleImageUpload,
    removeImage,
    handleSaveProduct,
    handleDeleteProduct,
    handleResubmitProduct,
    handleSubmitProduct,
    handleUnpublishProduct,
    filteredProducts,
    getStatusColor,
    getStatusLabel,
    openCreateModal,
    openEditModal
  };
}
