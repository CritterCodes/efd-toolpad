import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import { setupShopifyWebhooks } from '@/utils/shopifyConfig';

export async function POST(request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔧 Setting up Shopify webhooks...');

    // Get the base URL from the request
    const { origin } = new URL(request.url);
    console.log('📍 Base URL:', origin);

    // Setup webhooks
    const webhooks = await setupShopifyWebhooks(origin);

    return NextResponse.json({
      success: true,
      message: `Successfully registered ${webhooks.length} webhooks`,
      webhooks: webhooks.map(webhook => ({
        id: webhook.id,
        topic: webhook.topic,
        address: webhook.address
      }))
    });

  } catch (error) {
    console.error('❌ Error setting up webhooks:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup webhooks',
        message: error.message
      },
      { status: 500 }
    );
  }
}