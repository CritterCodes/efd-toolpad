import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import StullerItemService from './service';

async function requireAdminSession() {
  const session = await auth();
  if (!session || !session.user?.email?.includes('@')) {
    return null;
  }
  return session;
}

export async function POST(request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemNumber } = await request.json();
    const data = await StullerItemService.fetchItemData(itemNumber);

    return NextResponse.json({
      success: true,
      data,
      source: 'stuller',
    });
  } catch (error) {
    console.error('Stuller item lookup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data from Stuller' },
      { status: error.status || 500 }
    );
  }
}

export async function GET(request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemNumber = searchParams.get('itemNumber');
    if (!itemNumber) {
      return NextResponse.json({ error: 'Item number is required' }, { status: 400 });
    }

    const data = await StullerItemService.fetchItemData(itemNumber);
    return NextResponse.json({ success: true, data, source: 'stuller' });
  } catch (error) {
    console.error('Stuller item GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch data from Stuller' },
      { status: error.status || 500 }
    );
  }
}
