import React from 'react';
import Image from 'next/image';
import styles from '@/components/artisan/ArtisanProductManager.module.css';

export default function ProductGrid({
  filteredProducts,
  setSelectedProduct,
  setShowDetailModal,
  getStatusColor,
  getStatusLabel
}) {
  return (
    <div className={styles.productGrid}>
      {filteredProducts.map(product => (
        <div
          key={product._id}
          className={styles.productCard}
          onClick={() => {
            setSelectedProduct(product);
            setShowDetailModal(true);
          }}
        >
          <div className={styles.imageContainer}>
            {product.images && product.images.length > 0 ? (
              <Image
                src={product.images[0].thumbnail || product.images[0].url}
                alt={product.title}
                fill
                className={styles.productImage}
              />
            ) : (
              <div className={styles.noImage}>No Image</div>
            )}
            <div
              className={styles.statusBadge}
              style={{ backgroundColor: getStatusColor(product.status) }}
            >
              {getStatusLabel(product.status)}
            </div>
          </div>
          <div className={styles.cardContent}>
            <h3 className={styles.productTitle}>{product.title}</h3>
            <p className={styles.productCategory}>{product.category}</p>
            <p className={styles.productPrice}>${parseFloat(product.price).toFixed(2)}</p>
            <div className={styles.cardMeta}>
              <span>{new Date(product.createdAt).toLocaleDateString()}</span>
              <span>{product.images?.length || 0} photos</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
