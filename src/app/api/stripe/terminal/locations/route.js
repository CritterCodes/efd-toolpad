import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { createTerminalLocation, listTerminalLocations } from '@/app/api/repair-invoices/stripe';

const EFD_LOCATION = {
  displayName: 'Engel Fine Design',
  address: {
    line1: '115 N 10th St #A107',
    city: 'Fort Smith',
    state: 'AR',
    country: 'US',
    postalCode: '72901',
  },
};

async function requireTerminalAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const GET = async () => {
  try {
    const { errorResponse } = await requireTerminalAccess();
    if (errorResponse) return errorResponse;

    const locations = await listTerminalLocations();
    return NextResponse.json(locations, { status: 200 });
  } catch (error) {
    console.error('Error listing Stripe Terminal locations:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};

export const POST = async () => {
  try {
    const { errorResponse } = await requireTerminalAccess();
    if (errorResponse) return errorResponse;

    const existing = await listTerminalLocations();
    const match = (existing.data || []).find((location) =>
      String(location.display_name || '').toLowerCase() === EFD_LOCATION.displayName.toLowerCase()
    );

    if (match) {
      return NextResponse.json(match, { status: 200 });
    }

    const location = await createTerminalLocation(EFD_LOCATION);
    return NextResponse.json(location, { status: 201 });
  } catch (error) {
    console.error('Error creating Stripe Terminal location:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
