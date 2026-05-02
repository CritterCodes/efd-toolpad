import OwnerDrawsModel from '@/app/api/ownerDraws/model';
import { db } from '@/lib/database';
import {
  OWNER_DRAW_STATUS,
  buildOwnerDrawTotals,
} from '@/services/payrollUtils';

function buildDrawFilter({ userID, startDate, endDate, status } = {}) {
  const filter = {};

  if (userID) {
    filter.userID = userID;
  }

  if (status) {
    filter.status = status;
  }

  if (startDate || endDate) {
    filter.drawDate = {};
    if (startDate) filter.drawDate.$gte = new Date(startDate);
    if (endDate) filter.drawDate.$lte = new Date(endDate);
  }

  return filter;
}

async function listOwnerOperatorUsers() {
  const dbInstance = await db.connect();
  const users = await dbInstance.collection('users').find({
    'compensationProfile.isOwnerOperator': true,
  }).project({
    _id: 0,
    userID: 1,
    firstName: 1,
    lastName: 1,
    email: 1,
    role: 1,
    compensationProfile: 1,
  }).sort({
    firstName: 1,
    lastName: 1,
  }).toArray();

  return users.map((user) => ({
    userID: user.userID,
    userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.userID,
    email: user.email || '',
    role: user.role || '',
    isOwnerOperator: true,
    compensationProfile: user.compensationProfile || {},
  }));
}

export async function listOwnerDraws({ userID, startDate, endDate, status } = {}) {
  const draws = await OwnerDrawsModel.list(buildDrawFilter({ userID, startDate, endDate, status }));
  const ownerOperators = await listOwnerOperatorUsers();
  const summary = buildOwnerDrawTotals(draws);

  return {
    draws,
    ownerOperators,
    summary,
  };
}

export async function createOwnerDraw({
  userID,
  amount,
  drawDate,
  paymentMethod,
  paymentReference,
  notes,
  createdBy,
}) {
  if (!userID) {
    throw new Error('userID is required.');
  }

  if (!(Number(amount) > 0)) {
    throw new Error('Owner draw amount must be greater than zero.');
  }

  if (!paymentMethod) {
    throw new Error('Payment method is required for owner draws.');
  }

  const ownerOperators = await listOwnerOperatorUsers();
  const owner = ownerOperators.find((user) => user.userID === userID);
  if (!owner) {
    throw new Error('Selected user is not marked as an owner/operator.');
  }

  return await OwnerDrawsModel.create({
    userID,
    userName: owner.userName,
    amount,
    drawDate,
    paymentMethod,
    paymentReference,
    notes,
    status: OWNER_DRAW_STATUS.RECORDED,
    createdBy,
  });
}

export async function updateOwnerDraw(drawID, {
  amount,
  drawDate,
  paymentMethod,
  paymentReference,
  notes,
  status,
} = {}) {
  const current = await OwnerDrawsModel.findByDrawID(drawID);
  const nextStatus = status || current.status || OWNER_DRAW_STATUS.RECORDED;

  if (nextStatus !== OWNER_DRAW_STATUS.VOID) {
    if (!(Number(amount ?? current.amount) > 0)) {
      throw new Error('Owner draw amount must be greater than zero.');
    }
    if (!(paymentMethod || current.paymentMethod)) {
      throw new Error('Payment method is required for owner draws.');
    }
  }

  return await OwnerDrawsModel.updateByDrawID(drawID, {
    amount: amount ?? current.amount,
    drawDate: drawDate ? new Date(drawDate) : current.drawDate,
    paymentMethod: paymentMethod ?? current.paymentMethod,
    paymentReference: paymentReference ?? current.paymentReference,
    notes: notes ?? current.notes,
    status: nextStatus,
  });
}

export async function setOwnerOperatorFlag({ userID, isOwnerOperator }) {
  if (!userID) {
    throw new Error('userID is required.');
  }

  const dbInstance = await db.connect();
  const user = await dbInstance.collection('users').findOne({ userID });
  if (!user) {
    throw new Error('User not found.');
  }

  const compensationProfile = {
    ...(user.compensationProfile || {}),
    isOwnerOperator: isOwnerOperator === true,
  };

  await dbInstance.collection('users').updateOne(
    { userID },
    {
      $set: {
        compensationProfile,
        updatedAt: new Date(),
      },
    }
  );

  return {
    userID,
    userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || user.userID,
    isOwnerOperator: compensationProfile.isOwnerOperator === true,
    compensationProfile,
  };
}
