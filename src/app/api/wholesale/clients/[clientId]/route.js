import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

function sanitizeClient(client = {}) {
  return {
    userID: client.userID || client.clientID,
    clientID: client.clientID || client.userID,
    firstName: client.firstName || '',
    lastName: client.lastName || '',
    email: client.email || '',
    phoneNumber: client.phoneNumber || '',
    business: client.business || '',
    status: client.status || 'verified',
    parentWholesalerId: client.parentWholesalerId || '',
    parentWholesalerName: client.parentWholesalerName || '',
    createdAt: client.createdAt,
    updatedAt: client.updatedAt
  };
}

function canAccess(role) {
  return ['admin', 'wholesaler'].includes(role);
}

export async function GET(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { db } = await connectToDatabase();
    const clientId = String(params?.clientId || '').trim();
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const client = await db.collection('clients').findOne({
      $or: [{ userID: clientId }, { clientID: clientId }]
    });

    if (!client) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (session.user.role !== 'admin' && client.parentWholesalerId !== session.user.userID) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: sanitizeClient(client) });
  } catch (error) {
    console.error('GET /api/wholesale/clients/[clientId] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wholesale client' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const clientId = String(params?.clientId || '').trim();
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const payload = await request.json();
    const { db } = await connectToDatabase();

    const existing = await db.collection('clients').findOne({
      $or: [{ userID: clientId }, { clientID: clientId }]
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (session.user.role !== 'admin' && existing.parentWholesalerId !== session.user.userID) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const updateData = {
      firstName: String(payload.firstName ?? existing.firstName ?? '').trim(),
      lastName: String(payload.lastName ?? existing.lastName ?? '').trim(),
      email: String(payload.email ?? existing.email ?? '').trim().toLowerCase(),
      phoneNumber: String(payload.phoneNumber ?? existing.phoneNumber ?? '').trim(),
      business: String(payload.business ?? existing.business ?? '').trim(),
      updatedAt: new Date()
    };

    if (!updateData.firstName || !updateData.lastName) {
      return NextResponse.json({ success: false, error: 'firstName and lastName are required' }, { status: 400 });
    }

    await db.collection('clients').updateOne(
      { _id: existing._id },
      { $set: updateData }
    );

    const updated = await db.collection('clients').findOne({ _id: existing._id });
    return NextResponse.json({ success: true, data: sanitizeClient(updated) });
  } catch (error) {
    console.error('PUT /api/wholesale/clients/[clientId] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update wholesale client' }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (!canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const clientId = String(params?.clientId || '').trim();
    if (!clientId) {
      return NextResponse.json({ success: false, error: 'clientId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();
    const existing = await db.collection('clients').findOne({
      $or: [{ userID: clientId }, { clientID: clientId }]
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
    }

    if (session.user.role !== 'admin' && existing.parentWholesalerId !== session.user.userID) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    await db.collection('clients').deleteOne({ _id: existing._id });
    return NextResponse.json({ success: true, message: 'Client deleted successfully' });
  } catch (error) {
    console.error('DELETE /api/wholesale/clients/[clientId] error:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete wholesale client' }, { status: 500 });
  }
}