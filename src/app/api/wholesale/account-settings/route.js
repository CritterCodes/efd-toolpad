import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { uploadFileToS3 } from '@/utils/s3.util';
import { ObjectId } from 'mongodb';
import {
  buildBusinessProfileUpdateFields,
  buildUserLookupQuery,
  normalizeWholesalerPricingSettings,
  parseSettingsPayload,
  serializeSettings,
  validateLogoFile
} from './wholesaleAccountSettings.helpers';

function buildAccountLookupQuery(accountId) {
  const normalized = String(accountId || '').trim();
  if (!normalized) return null;

  const orConditions = [{ userID: normalized }, { email: normalized }];
  if (ObjectId.isValid(normalized)) {
    orConditions.push({ _id: new ObjectId(normalized) });
  }

  return { $or: orConditions };
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!['admin', 'wholesaler'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedAccountId = searchParams.get('accountId');
    const userQuery = session.user.role === 'admin' && requestedAccountId
      ? buildAccountLookupQuery(requestedAccountId)
      : buildUserLookupQuery(session.user);
    if (!userQuery) {
      return NextResponse.json({ success: false, error: 'Could not identify user account' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection('users').findOne(userQuery, {
      projection: {
        firstName: 1,
        lastName: 1,
        email: 1,
        phoneNumber: 1,
        business: 1,
        wholesaleApplication: 1,
        wholesalerPricingSettings: 1
      }
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serializeSettings(user, session.user)
    });
  } catch (error) {
    console.error('GET /api/wholesale/account-settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to load account settings' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!['admin', 'wholesaler'].includes(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const userQuery = buildUserLookupQuery(session.user);
    if (!userQuery) {
      return NextResponse.json({ success: false, error: 'Could not identify user account' }, { status: 400 });
    }

    const parsedPayload = await parseSettingsPayload(request);
    const wholesalerPricingSettings = normalizeWholesalerPricingSettings(
      parsedPayload.wholesalerPricingSettings || {},
      parsedPayload.retailMarkups || {}
    );
    const businessProfileUpdateFields = buildBusinessProfileUpdateFields(parsedPayload.businessProfile || {});
    const removeTicketLogo = Boolean(parsedPayload.removeTicketLogo);
    const ticketLogoFile = parsedPayload.ticketLogoFile;

    validateLogoFile(ticketLogoFile);

    const { db } = await connectToDatabase();
    const now = new Date();

    const updateFields = {
      'wholesalerPricingSettings.retailMarkupMultiplier': wholesalerPricingSettings.retailMarkupMultiplier,
      'wholesalerPricingSettings.taxRate': wholesalerPricingSettings.taxRate,
      'wholesalerPricingSettings.retailMarkups': {
        tasks: wholesalerPricingSettings.retailMarkupMultiplier,
        processes: wholesalerPricingSettings.retailMarkupMultiplier,
        materials: wholesalerPricingSettings.retailMarkupMultiplier
      },
      'wholesalerPricingSettings.updatedAt': now,
      updatedAt: now
    };

    Object.assign(updateFields, businessProfileUpdateFields);

    if (removeTicketLogo) {
      updateFields['wholesalerPricingSettings.ticketLogoUrl'] = null;
    }

    if (ticketLogoFile && ticketLogoFile.size > 0) {
      const uploadedLogoUrl = await uploadFileToS3(ticketLogoFile, 'admin/wholesale/logos', 'ticket-logo-');
      updateFields['wholesalerPricingSettings.ticketLogoUrl'] = uploadedLogoUrl;
    }

    const updateResult = await db.collection('users').updateOne(
      userQuery,
      {
        $set: updateFields
      }
    );

    if (!updateResult.matchedCount) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    const user = await db.collection('users').findOne(userQuery, {
      projection: {
        firstName: 1,
        lastName: 1,
        email: 1,
        phoneNumber: 1,
        business: 1,
        wholesaleApplication: 1,
        wholesalerPricingSettings: 1
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Account settings updated successfully',
      data: serializeSettings(user || {}, session.user)
    });
  } catch (error) {
    console.error('PUT /api/wholesale/account-settings error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update account settings' }, { status: 500 });
  }
}
