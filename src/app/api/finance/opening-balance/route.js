import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import {
  DEFAULT_FINANCIAL_OPENING_BALANCE,
  normalizeFinancialOpeningBalance,
} from '@/services/repairAnalytics';

const SETTINGS_ID = 'repair_task_admin_settings';

function serializeOpeningBalance(openingBalance) {
  if (!openingBalance) return null;
  return {
    ...openingBalance,
    asOfDate: openingBalance.asOfDate,
    updatedAt: openingBalance.updatedAt,
  };
}

function buildOpeningBalancePayload(body = {}) {
  const normalized = normalizeFinancialOpeningBalance({
    asOfDate: body.asOfDate,
    bankBalance: body.bankBalance,
    cashDrawerBalance: body.cashDrawerBalance,
    notes: body.notes,
    updatedAt: new Date(),
  });

  if (!normalized) {
    throw new Error('Opening date is required.');
  }
  if (normalized.bankBalance < 0 || normalized.cashDrawerBalance < 0) {
    throw new Error('Opening balances cannot be negative.');
  }

  return normalized;
}

export const GET = async () => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const dbInstance = db._instance || await db.connect();
    const settings = await dbInstance.collection('adminSettings').findOne({ _id: SETTINGS_ID });
    const openingBalance = normalizeFinancialOpeningBalance(settings?.financial?.openingBalance);

    return NextResponse.json({
      openingBalance: serializeOpeningBalance(openingBalance),
      defaults: DEFAULT_FINANCIAL_OPENING_BALANCE,
    }, { status: 200 });
  } catch (error) {
    console.error('Error in opening balance GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PUT = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const openingBalance = buildOpeningBalancePayload(body);
    const dbInstance = db._instance || await db.connect();
    const currentSettings = await dbInstance.collection('adminSettings').findOne({ _id: SETTINGS_ID });
    const currentFinancial = currentSettings?.financial
      && typeof currentSettings.financial === 'object'
      && !Array.isArray(currentSettings.financial)
      ? currentSettings.financial
      : {};

    await dbInstance.collection('adminSettings').updateOne(
      { _id: SETTINGS_ID },
      {
        $set: {
          financial: {
            ...currentFinancial,
            openingBalance,
          },
          updatedAt: new Date(),
          updatedBy: session.user.userID || session.user.email,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      openingBalance: serializeOpeningBalance(openingBalance),
    }, { status: 200 });
  } catch (error) {
    const status = error.message.includes('required') || error.message.includes('negative') ? 400 : 500;
    console.error('Error in opening balance PUT:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
