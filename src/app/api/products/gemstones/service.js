import { connectToDatabase } from '@/lib/mongodb';

export default class GemstoneService {
  /**
   * Fetch gemstones for a user or all if admin
   */
  static async getGemstones(user) {
    const { db: database } = await connectToDatabase();
    
    const isAdmin = user.role === 'admin' || user.role === 'staff';
    let gemstones;

    if (isAdmin) {
      console.log(`GemstoneService.getGemstones - Admin user ${user.email} requesting all gemstones`);
      gemstones = await database.collection('products').find({ 
        productType: 'gemstone'
      }).toArray();
    } else {
      const userIdentifier = user.userID || user.email;
      gemstones = await database.collection('products').find({ 
        productType: 'gemstone',
        $or: [
          { userId: userIdentifier },
          { userId: user.email },
          { userId: user.userID }
        ]
      }).toArray();
    }
    
    // Migrate gemstones that don't have productId yet
    for (let gemstone of gemstones) {
      if (!gemstone.productId) {
        const productId = this.generateId();
        await database.collection('products').updateOne(
          { _id: gemstone._id },
          { $set: { productId: productId } }
        );
        gemstone.productId = productId;
        console.log(`Migrated gemstone ${gemstone._id} to productId: ${productId}`);
      }
    }
    
    return gemstones;
  }

  /**
   * Create a new gemstone
   */
  static async createGemstone(data, user) {
    const { 
      title, description, internalNotes, species, subspecies, carat, 
      dimensions, cut, cutStyle, treatment, color, clarity, locale, 
      naturalSynthetic, price, retailPrice, acquisitionPrice, 
      acquisitionDate, supplier, certification, tags, userId, vendor, notes
    } = data;

    if (!title || !species) {
      throw new Error('Title and species are required');
    }

    const { db: database } = await connectToDatabase();
    
    // Get user data for proper userId and vendor assignment
    const actualUserId = userId || user.userID || user.email;
    let actualVendor = vendor || user.businessName || user.name;
    
    // If we don't have businessName in session, try to get it from user profile
    if (!user.businessName && user.email) {
      try {
        const userProfile = await database.collection('users').findOne({ 
          email: user.email 
        });
        if (userProfile?.artisanApplication?.businessName) {
          actualVendor = userProfile.artisanApplication.businessName;
        }
      } catch (error) {
        console.error('Error fetching user profile for business name:', error);
      }
    }
    
    const productId = this.generateId();
    
    const gemstone = {
      productId: productId,
      productType: 'gemstone',
      title: title || '',
      description: description || '',
      internalNotes: internalNotes || notes || '',
      userId: actualUserId,
      vendor: actualVendor,
      status: 'draft',
      isPublic: false,
      featured: false,
      images: [],
      tags: Array.isArray(tags) ? tags : [],
      gemstone: {
        species: species || '',
        subspecies: subspecies || '',
        carat: Number(carat) || 0,
        dimensions: {
          length: Number(dimensions?.length) || 0,
          width: Number(dimensions?.width) || 0,
          height: Number(dimensions?.height) || 0
        },
        cut: Array.isArray(cut) ? cut : [],
        cutStyle: Array.isArray(cutStyle) ? cutStyle : [],
        treatment: Array.isArray(treatment) ? treatment : [],
        color: Array.isArray(color) ? color : [],
        clarity: clarity || '',
        locale: locale || '',
        naturalSynthetic: naturalSynthetic || 'natural',
        certification: {
          lab: certification?.lab || '',
          number: certification?.number || '',
          url: certification?.url || '',
          verified: certification?.verified || false
        },
        obj3DFile: {
          url: '', filename: '', fileSize: 0, uploadedAt: null, downloadCount: 0
        },
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        acquisitionPrice: Number(acquisitionPrice) || null,
        supplier: supplier || '',
        retailPrice: Number(retailPrice || price) || 0,
        designCoverage: {
          hasBasicBasket: false, hasBasicRing: false, customDesignCount: 0,
          lastDesignAdded: null, priorityLevel: 'critical'
        }
      },
      availableDesigns: [],
      relatedProducts: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await database.collection('products').insertOne(gemstone);
    return { ...gemstone, _id: result.insertedId };
  }

  /**
   * Update an existing gemstone
   */
  static async updateGemstone(data, user) {
    let title, description, tags, images, isPublic, status, gemstoneData, productId;
    
    if (data.gemstone) {
      ({ productId, title, description, tags = [], images = [], isPublic = true, status = 'active' } = data);
      gemstoneData = data.gemstone;
    } else {
      productId = data.productId;
      title = data.title;
      description = data.description || '';
      tags = data.tags || [];
      images = data.images || [];
      isPublic = data.isPublic !== undefined ? data.isPublic : true;
      status = data.status || 'active';
      
      gemstoneData = {
        species: data.species,
        subspecies: data.subspecies || '',
        carat: Number(data.carat) || 0,
        dimensions: data.dimensions || { length: '', width: '', height: '' },
        cut: data.cut || [],
        cutStyle: data.cutStyle || [],
        treatment: data.treatment || [],
        color: data.color || [],
        locale: data.locale || '',
        naturalSynthetic: data.naturalSynthetic || 'natural',
        retailPrice: Number(data.price || data.retailPrice) || 0,
        customMounting: data.customMounting || false,
        vendor: data.vendor || user.businessName || user.slug || user.name,
        internalNotes: data.notes || data.internalNotes || '',
        certification: data.certification || {},
        designCoverage: data.designCoverage || 'full'
      };
    }

    if (!productId || !title || !gemstoneData.species) {
      throw new Error('ProductId, title and species are required');
    }

    const { db: database } = await connectToDatabase();
    
    const updateData = {
      productType: 'gemstone',
      title,
      description: description || '',
      userId: data.userId || user.id,
      status,
      isPublic,
      images,
      tags,
      gemstone: {
        species: gemstoneData.species,
        subspecies: gemstoneData.subspecies || '',
        carat: Number(gemstoneData.carat) || 0,
        dimensions: gemstoneData.dimensions || { length: '', width: '', height: '' },
        cut: Array.isArray(gemstoneData.cut) ? gemstoneData.cut : [],
        cutStyle: Array.isArray(gemstoneData.cutStyle) ? gemstoneData.cutStyle : [],
        treatment: Array.isArray(gemstoneData.treatment) ? gemstoneData.treatment : [],
        color: Array.isArray(gemstoneData.color) ? gemstoneData.color : [],
        locale: gemstoneData.locale || '',
        naturalSynthetic: gemstoneData.naturalSynthetic || 'natural',
        retailPrice: Number(gemstoneData.retailPrice) || 0,
        customMounting: Boolean(gemstoneData.customMounting),
        vendor: gemstoneData.vendor || user.businessName || user.slug || user.name,
        internalNotes: gemstoneData.internalNotes || '',
        certification: gemstoneData.certification || {},
        designCoverage: gemstoneData.designCoverage || 'full'
      },
      ...(data.availableDesigns !== undefined && { availableDesigns: data.availableDesigns }),
      ...(data.relatedProducts !== undefined && { relatedProducts: data.relatedProducts }),
      updatedAt: new Date()
    };

    const result = await database.collection('products').updateOne(
      { productId: productId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      throw new Error('Gemstone not found');
    }
    
    return { ...updateData, productId };
  }

  /**
   * Delete a gemstone by id
   */
  static async deleteGemstone(id) {
    if (!id) {
      throw new Error('Gemstone ID is required');
    }

    const { db: database } = await connectToDatabase();
    const result = await database.collection('products').deleteOne({ productId: id });

    if (result.deletedCount === 0) {
      throw new Error('Gemstone not found');
    }
    
    return true;
  }

  static generateId() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `gem_${timestamp}_${randomStr}`;
  }
}
