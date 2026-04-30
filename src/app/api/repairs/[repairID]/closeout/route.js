import { NextResponse } from 'next/server';
import RepairsModel from '../../model';
import { uploadRepairImage } from '@/utils/s3.util';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { createRepairInvoice } from '@/app/api/repair-invoices/service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const { repairID } = params;
    if (!repairID) {
      return NextResponse.json({ error: 'Repair ID is required.' }, { status: 400 });
    }

    const repair = await RepairsModel.findById(repairID);
    if (repair.status !== 'COMPLETED') {
      return NextResponse.json({ error: 'Repair must be COMPLETED before closeout can be edited.' }, { status: 400 });
    }
    const contentType = req.headers.get('content-type') || '';

    let nextAfterPhotos = Array.isArray(repair.afterPhotos) ? [...repair.afterPhotos] : [];
    let closeoutNotes = repair.closeoutNotes || '';
    const closeoutUpdate = {};

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const noteValue = formData.get('closeoutNotes');
      if (typeof noteValue === 'string') closeoutNotes = noteValue;

      const files = formData.getAll('afterPhotos').filter((value) => value && typeof value === 'object' && typeof value.arrayBuffer === 'function');
      for (const file of files) {
        const url = await uploadRepairImage(file, `${repairID}/after`);
        nextAfterPhotos.push(url);
      }
    } else {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.afterPhotos)) {
        nextAfterPhotos = body.afterPhotos.filter(Boolean);
      }
      if (typeof body.closeoutNotes === 'string') {
        closeoutNotes = body.closeoutNotes;
      }

      [
        'tasks',
        'materials',
        'customLineItems',
        'subtotal',
        'rushFee',
        'deliveryFee',
        'taxAmount',
        'taxRate',
        'includeTax',
        'includeDelivery',
        'totalCost',
        'status',
      ].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
          closeoutUpdate[field] = body[field];
        }
      });
    }

    let updated = await RepairsModel.updateById(repairID, {
      afterPhotos: nextAfterPhotos,
      closeoutNotes,
      ...closeoutUpdate,
      closeoutStatus: nextAfterPhotos.length > 0 ? 'in_review' : 'pending',
      closeoutBy: session.user.name || session.user.email || '',
      closeoutAt: new Date(),
      updatedAt: new Date(),
    });

    let autoInvoice = null;
    let autoInvoiceError = '';
    if (nextAfterPhotos.length > 0 && !updated.invoiceID) {
      try {
        autoInvoice = await createRepairInvoice({
          repairIDs: [repairID],
          deliveryMethod: 'pickup',
          closeoutNotes,
          createdBy: session.user.name || session.user.email || '',
          appendToOpen: true,
        });
        updated = await RepairsModel.findById(repairID);
      } catch (invoiceError) {
        autoInvoiceError = invoiceError.message;
      }
    }

    if (autoInvoice || autoInvoiceError) {
      return NextResponse.json({
        ...updated,
        autoInvoice: autoInvoice
          ? {
              invoiceID: autoInvoice.invoiceID,
              status: autoInvoice.status,
              repairCount: Array.isArray(autoInvoice.repairIDs) ? autoInvoice.repairIDs.length : 0,
            }
          : null,
        autoInvoiceError,
      }, { status: 200 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error saving repair closeout:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
