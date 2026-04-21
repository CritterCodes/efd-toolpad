import { NextResponse } from 'next/server';
import { runMaterialPriceSync } from './service';

export async function POST(request) {
  try {
    let adminSettings;
    try {
      const body = await request.json();
      adminSettings = body?.adminSettings || null;
    } catch {
      // empty body — service will fetch settings from DB
    }

    const { status, payload } = await runMaterialPriceSync(adminSettings);
    return NextResponse.json(payload, { status });
  } catch (error) {
    console.error('❌ Error updating material pricing:', error);
    return NextResponse.json({ error: 'Failed to update material pricing' }, { status: 500 });
  }
}
