import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { requireRepairOps } from '@/lib/apiAuth';

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMaterial(material = {}) {
  const quantity = Math.max(toNumber(material.quantity, 1), 0);
  const price = Math.max(toNumber(material.price ?? material.retailPrice ?? material.unitCost, 0), 0);
  const name = String(material.name || material.displayName || material.description || '').trim();

  if (!name) throw new Error('Material name is required.');
  if (quantity <= 0) throw new Error('Material quantity must be greater than zero.');

  return {
    ...material,
    id: material.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    displayName: material.displayName || name,
    description: material.description || name,
    quantity,
    price,
    retailPrice: toNumber(material.retailPrice ?? price, price),
  };
}

function sumLineItems(items = []) {
  return items.reduce((sum, item) => sum + (toNumber(item.price, 0) * Math.max(toNumber(item.quantity, 1), 0)), 0);
}

function calculateRepairTotals(repair, materials) {
  const subtotal = sumLineItems(repair.tasks || [])
    + sumLineItems(materials)
    + sumLineItems(repair.customLineItems || []);
  const rushFee = toNumber(repair.rushFee, 0);
  const deliveryFee = repair.includeDelivery ? toNumber(repair.deliveryFee, 0) : 0;
  const taxRate = toNumber(repair.taxRate, 0);
  const taxAmount = repair.includeTax ? Math.round(subtotal * taxRate * 100) / 100 : 0;
  const totalCost = Math.round((subtotal + rushFee + deliveryFee + taxAmount) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    rushFee,
    deliveryFee,
    taxAmount,
    totalCost,
  };
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const material = normalizeMaterial(body.material || {});
    const repair = await RepairsModel.findById(repairID);
    const materials = [...(Array.isArray(repair.materials) ? repair.materials : []), material];
    const totals = calculateRepairTotals(repair, materials);

    const updated = await RepairsModel.updateById(repairID, {
      status: 'NEEDS PARTS',
      benchStatus: 'WAITING_PARTS',
      materials,
      ...totals,
      partsOrderedBy: session.user.name,
      partsOrderedDate: body.partsOrderedDate ? new Date(body.partsOrderedDate) : new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('❌ Error in mark-waiting-parts route:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
