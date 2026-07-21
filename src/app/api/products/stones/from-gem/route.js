import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { StonesModel, stoneFromGemCandidate } from '../model';

/**
 * POST /api/products/stones/from-gem  { candidate }
 * Persist a loose-stone SEARCH candidate (from /api/products/stones/match → `stuller[]`) into the
 * reorderable stone catalog and return the record, so the variant row can link it. Deduped by the
 * stone's Stuller serial number.
 */
export const POST = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { candidate } = await req.json().catch(() => ({}));
  if (!candidate || typeof candidate !== 'object') {
    return NextResponse.json({ error: 'A stone candidate is required.' }, { status: 400 });
  }

  try {
    const mapped = stoneFromGemCandidate(candidate);
    if (!mapped.stullerSku) {
      // No serial → can't dedup/track it; make it a fresh manual-style record.
      mapped.stullerSku = '';
    }
    const stone = await StonesModel.upsertBySku(mapped);
    return NextResponse.json({ success: true, stone }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to save the stone.' },
      { status: error.status || 502 },
    );
  }
};
