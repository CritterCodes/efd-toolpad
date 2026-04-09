'use client';

import { useEffect } from 'react';

export function useArtisanProductMutations({ session, state }) {
  const {
    products, setProducts,
    setLoading, setError,
    editingProduct, setEditingProduct,
    formData, setFormData,
    setUploadingImages,
    resetForm,
    setShowCreateModal,
    setShowDetailModal,
    setSelectedProduct
  } = state;

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
        const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload });
        if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
        const data = await res.json();
        uploadedImages.push({ url: data.url, thumbnail: data.thumbnail, filename: data.filename });
      }
      setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedImages] }));
    } catch (err) {
      console.error('Error uploading images:', err);
      setError(`Image upload failed: ${err.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  const removeImage = (index) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
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
      const url = editingProduct ? `/api/artisan/products/${editingProduct._id}` : '/api/artisan/products/submit';
      const method = editingProduct ? 'PUT' : 'POST';
      const payload = { ...formData, userId: session.user.id, artisanId: session.user.artisanId };
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
      resetForm();
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
      const res = await fetch(`/api/artisan/products/${productId}`, { method: 'DELETE' });
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
      const res = await fetch(`/api/artisan/products/${productId}/resubmit`, { method: 'POST' });
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
      const res = await fetch(`/api/products/${productId}/submit`, { method: 'POST' });
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

  return {
    fetchProducts,
    handleImageUpload,
    removeImage,
    handleSaveProduct,
    handleDeleteProduct,
    handleResubmitProduct,
    handleSubmitProduct,
    handleUnpublishProduct
  };
}
