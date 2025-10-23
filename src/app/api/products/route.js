import { NextRequest, NextResponse } from 'next/server';
import { ProductsController } from '../../../controllers/ProductsController.js';

/**
 * Products API Routes
 * Handles CRUD operations for artisan products (gemstones, jewelry, etc.)
 */

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'gemstone-options':
        return await ProductsController.getGemstoneOptions(request);
      
      case 'artisan-products':
        return await ProductsController.getArtisanProducts(request);
      
      case 'public-products':
        return await ProductsController.getPublicProducts(request);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Products API GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'create':
        return await ProductsController.createProduct(request);
      
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Products API POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    return await ProductsController.updateProduct(request);
  } catch (error) {
    console.error('Products API PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    return await ProductsController.deleteProduct(request);
  } catch (error) {
    console.error('Products API DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}