/**
 * Products Controller - Handle CRUD operations for products (gemstones, jewelry, etc.)
 */

import { ProductsModel } from '../models/ProductsModel.js';

export class ProductsController {
  
  /**
   * Create a new product
   */
  static async createProduct(req, res) {
    try {
      const { user } = req;
      const productData = req.body;

      // Ensure user is authenticated and is an artisan
      if (!user || user.role !== 'artisan') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Artisan role required.'
        });
      }

      // Add artisan information to product
      productData.artisanID = user._id || user.userID;
      productData.artisanName = `${user.firstName} ${user.lastName}`;
      productData.artisanEmail = user.email;
      productData.artisanType = user.artisanApplication?.artisanType || 'Unknown';

      // Validate product data
      const validation = ProductsModel.validateProduct(productData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Create product
      const product = ProductsModel.createProduct(productData);

      // TODO: Save to database
      // const savedProduct = await db.products.insertOne(product);

      // For now, return the created product structure
      return res.status(201).json({
        success: true,
        data: product,
        message: 'Product created successfully'
      });

    } catch (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get products by artisan
   */
  static async getArtisanProducts(req, res) {
    try {
      const { user } = req;
      const { status, type, page = 1, limit = 20 } = req.query;

      if (!user || user.role !== 'artisan') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Artisan role required.'
        });
      }

      // Build filter
      const filter = {
        artisanID: user._id || user.userID
      };

      if (status) filter.status = status;
      if (type) filter.type = type;

      // TODO: Implement database query
      // const products = await db.products.find(filter)
      //   .skip((page - 1) * limit)
      //   .limit(limit)
      //   .sort({ createdAt: -1 });

      // For now, return empty array
      return res.status(200).json({
        success: true,
        data: {
          products: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });

    } catch (error) {
      console.error('Error fetching artisan products:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Update product
   */
  static async updateProduct(req, res) {
    try {
      const { user } = req;
      const { productId } = req.params;
      const updateData = req.body;

      if (!user || user.role !== 'artisan') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Artisan role required.'
        });
      }

      // TODO: Implement database update
      // Verify ownership and update product

      return res.status(200).json({
        success: true,
        message: 'Product updated successfully'
      });

    } catch (error) {
      console.error('Error updating product:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Delete product
   */
  static async deleteProduct(req, res) {
    try {
      const { user } = req;
      const { productId } = req.params;

      if (!user || user.role !== 'artisan') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Artisan role required.'
        });
      }

      // TODO: Implement database deletion
      // Verify ownership and soft delete product

      return res.status(200).json({
        success: true,
        message: 'Product deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting product:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get gemstone options for dropdowns
   */
  static async getGemstoneOptions(req, res) {
    try {
      const options = ProductsModel.getGemstoneOptions();
      
      return res.status(200).json({
        success: true,
        data: options
      });

    } catch (error) {
      console.error('Error fetching gemstone options:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Upload product images
   */
  static async uploadProductImages(req, res) {
    try {
      const { user } = req;
      const { productId } = req.params;
      
      if (!user || user.role !== 'artisan') {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Artisan role required.'
        });
      }

      // TODO: Implement image upload to S3
      // Similar to artisan gallery upload functionality

      return res.status(200).json({
        success: true,
        data: {
          images: [] // Array of uploaded image URLs
        },
        message: 'Images uploaded successfully'
      });

    } catch (error) {
      console.error('Error uploading product images:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get public product listings (for jewelers/customers to browse)
   */
  static async getPublicProducts(req, res) {
    try {
      const { 
        type = 'gemstone', 
        species, 
        shape, 
        minWeight, 
        maxWeight, 
        minPrice, 
        maxPrice,
        origin,
        color,
        page = 1, 
        limit = 20 
      } = req.query;

      // Build filter for active products only
      const filter = {
        status: 'active',
        type
      };

      if (species) filter['gemstoneData.species'] = species;
      if (shape) filter['gemstoneData.shape'] = shape;
      if (origin) filter['gemstoneData.origin'] = origin;
      if (color) filter['gemstoneData.color'] = { $regex: color, $options: 'i' };
      
      if (minWeight || maxWeight) {
        filter['gemstoneData.weight'] = {};
        if (minWeight) filter['gemstoneData.weight'].$gte = parseFloat(minWeight);
        if (maxWeight) filter['gemstoneData.weight'].$lte = parseFloat(maxWeight);
      }
      
      if (minPrice || maxPrice) {
        filter.price = {};
        if (minPrice) filter.price.$gte = parseFloat(minPrice);
        if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
      }

      // TODO: Implement database query
      // const products = await db.products.find(filter)
      //   .skip((page - 1) * limit)
      //   .limit(limit)
      //   .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        data: {
          products: [],
          filters: filter,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            pages: 0
          }
        }
      });

    } catch (error) {
      console.error('Error fetching public products:', error);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default ProductsController;