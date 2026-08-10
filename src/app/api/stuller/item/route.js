import { NextResponse } from 'next/server';
import { auth } from "@/lib/auth";
import StullerItemService from './service';
import { canReadPricingCatalog } from '@/lib/repairAccess';
// STAFF-ONLY. Every gate in this file was `session.user?.email?.includes('@')` — i.e. ANY
// authenticated user with a plausible email, including an artisan or a client, passed it. These
// endpoints carry pricing/catalog/credential data. The idiom appeared at 24 sites across 12 files;
// swept together rather than one at a time, which is how the last round's fix landed on the wrong
// sibling of this very file.

async function requireAdminSession() {
  const session = await auth();
  // Repair intake looks up a Stuller part to add as a material (NewRepairForm), so the person
  // writing up the job must be able to run the lookup. Read-only: it fetches catalog data.
  if (!session?.user || !canReadPricingCatalog(session)) {
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
