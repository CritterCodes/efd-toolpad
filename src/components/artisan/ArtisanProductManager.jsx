'use client';

import React from 'react';
import styles from './ArtisanProductManager.module.css';
import { useArtisanProducts } from '@/hooks/artisan/useArtisanProducts';
import ProductHeader from '@/components/business/artisan/ProductHeader';
import ProductFilterBar from '@/components/business/artisan/ProductFilterBar';
import ProductGrid from '@/components/business/artisan/ProductGrid';
import ProductDetailModal from '@/components/business/artisan/ProductDetailModal';
import ProductCreateModal from '@/components/business/artisan/ProductCreateModal';

export default function ArtisanProductManager() {
  const {
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
  } = useArtisanProducts();

  if (!session?.user?.id) {
    return (
      <div className={styles.container}>
        <div className={styles.errorBox}>
          <p>Please log in to manage your products</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <ProductHeader openCreateModal={openCreateModal} />

      {error && (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      <ProductFilterBar
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        products={products}
        getStatusLabel={getStatusLabel}
      />

      {loading && <div className={styles.loading}>Loading products...</div>}

      {!loading && filteredProducts.length === 0 && (
        <div className={styles.emptyState}>
          <p>No products {filterStatus !== 'all' ? `with status "${getStatusLabel(filterStatus)}"` : 'yet'}</p>
          <button className={styles.createButton} onClick={openCreateModal}>
            Create Your First Product
          </button>
        </div>
      )}

      {!loading && filteredProducts.length > 0 && (
        <ProductGrid
          filteredProducts={filteredProducts}
          setSelectedProduct={setSelectedProduct}
          setShowDetailModal={setShowDetailModal}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
        />
      )}

      {showDetailModal && (
        <ProductDetailModal
          selectedProduct={selectedProduct}
          setShowDetailModal={setShowDetailModal}
          getStatusColor={getStatusColor}
          getStatusLabel={getStatusLabel}
          handleSubmitProduct={handleSubmitProduct}
          openEditModal={openEditModal}
          handleDeleteProduct={handleDeleteProduct}
          handleUnpublishProduct={handleUnpublishProduct}
          handleResubmitProduct={handleResubmitProduct}
        />
      )}

      {showCreateModal && (
        <ProductCreateModal
          setShowCreateModal={setShowCreateModal}
          editingProduct={editingProduct}
          formData={formData}
          setFormData={setFormData}
          handleSaveProduct={handleSaveProduct}
          handleImageUpload={handleImageUpload}
          uploadingImages={uploadingImages}
          removeImage={removeImage}
          loading={loading}
        />
      )}
    </div>
  );
}
