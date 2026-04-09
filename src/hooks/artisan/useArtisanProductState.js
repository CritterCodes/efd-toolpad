import { useState } from 'react';

const initialFormData = {
  title: '', description: '', category: 'jewelry',
  gemstone: { type: '', weight: '', caratage: '', color: '', clarity: '' },
  materials: [], price: '', images: [], tags: []
};

export function useArtisanProductState() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [uploadingImages, setUploadingImages] = useState(false);

  const resetForm = () => setFormData(initialFormData);

  const openCreateModal = () => {
    setEditingProduct(null);
    resetForm();
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
    products, setProducts,
    loading, setLoading,
    error, setError,
    selectedProduct, setSelectedProduct,
    showDetailModal, setShowDetailModal,
    showCreateModal, setShowCreateModal,
    filterStatus, setFilterStatus,
    editingProduct, setEditingProduct,
    formData, setFormData,
    uploadingImages, setUploadingImages,
    resetForm,
    openCreateModal,
    openEditModal
  };
}
