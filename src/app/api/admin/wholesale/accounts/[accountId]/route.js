import { ObjectId } from 'mongodb';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import {
  buildCanonicalWholesaleApplication,
  summarizeWholesaleUser,
} from '@/lib/wholesaleReconciliationService';

const PROFILE_FIELDS = [
  'businessName',
  'businessAddress',
  'businessCity',
  'businessState',
  'businessZip',
  'businessCountry',
  'contactFirstName',
  'contactLastName',
  'contactTitle',
  'contactEmail',
  'contactPhone',
];

function sanitizeText(value) {
  return String(value ?? '').trim();
}

function buildLookup(accountId) {
  const normalized = sanitizeText(accountId);
  const conditions = [{ userID: normalized }];

  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }

  return { $or: conditions };
}

function pickProfileFields(payload = {}) {
  return PROFILE_FIELDS.reduce((profile, field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      profile[field] = sanitizeText(payload[field]);
    }
    return profile;
  }, {});
}

export async function PUT(request, { params }) {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { accountId } = await params;
    if (!accountId) {
      return Response.json({ success: false, error: 'Wholesaler account ID is required' }, { status: 400 });
    }

    const payload = await request.json().catch(() => ({}));
    const profileUpdates = pickProfileFields(payload.wholesaleApplication || payload);
    const users = await db.dbUsers();
    const existingUser = await users.findOne(buildLookup(accountId));

    if (!existingUser || existingUser.role !== 'wholesaler') {
      return Response.json({ success: false, error: 'Wholesaler account not found' }, { status: 404 });
    }

    const now = new Date();
    const wholesaleApplication = buildCanonicalWholesaleApplication(existingUser, {
      ...profileUpdates,
      updatedAt: now,
    });

    const updateFields = {
      wholesaleApplication,
      updatedAt: now,
    };

    if (Object.prototype.hasOwnProperty.call(profileUpdates, 'businessName')) {
      updateFields.business = profileUpdates.businessName;
    }
    if (Object.prototype.hasOwnProperty.call(profileUpdates, 'contactFirstName')) {
      updateFields.firstName = profileUpdates.contactFirstName;
    }
    if (Object.prototype.hasOwnProperty.call(profileUpdates, 'contactLastName')) {
      updateFields.lastName = profileUpdates.contactLastName;
    }
    if (Object.prototype.hasOwnProperty.call(profileUpdates, 'contactEmail')) {
      updateFields.email = profileUpdates.contactEmail;
    }
    if (Object.prototype.hasOwnProperty.call(profileUpdates, 'contactPhone')) {
      updateFields.phoneNumber = profileUpdates.contactPhone;
    }

    await users.updateOne({ _id: existingUser._id }, { $set: updateFields });

    const updatedUser = await users.findOne({ _id: existingUser._id });
    return Response.json({
      success: true,
      data: summarizeWholesaleUser(updatedUser),
      message: 'Wholesaler updated successfully',
    });
  } catch (error) {
    console.error('Error updating wholesale account:', error);
    return Response.json({ success: false, error: 'Failed to update wholesaler account' }, { status: 500 });
  }
}
