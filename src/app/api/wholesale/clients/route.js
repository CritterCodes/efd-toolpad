import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { auth } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';

function buildClientName(user = {}) {
  const first = String(user.firstName || '').trim();
  const last = String(user.lastName || '').trim();
  const combined = `${first} ${last}`.trim();
  return combined || user.business || 'Unnamed Client';
}

function sanitizeClient(user = {}) {
  return {
    userID: user.userID || user.clientID,
    clientID: user.clientID || user.userID,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    fullName: buildClientName(user),
    email: user.email || '',
    phoneNumber: user.phoneNumber || '',
    business: user.business || '',
    role: user.role,
    status: user.status || 'verified',
    parentWholesalerId: user.parentWholesalerId || '',
    parentWholesalerName: user.parentWholesalerName || '',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const role = session.user.role;
    if (!['admin', 'wholesaler'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const requestedWholesalerId = searchParams.get('wholesalerId');
    const ownerWholesalerId = role === 'admin'
      ? (requestedWholesalerId || '')
      : session.user.userID;

    const { db } = await connectToDatabase();
    const query = {};
    if (ownerWholesalerId) {
      query.parentWholesalerId = ownerWholesalerId;
    }

    const clients = await db
      .collection('clients')
      .find(query)
      .sort({ firstName: 1, lastName: 1, createdAt: -1 })
      .toArray();

    return NextResponse.json({
      success: true,
      data: clients.map(sanitizeClient)
    });
  } catch (error) {
    console.error('GET /api/wholesale/clients error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch wholesale clients' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const role = session.user.role;
    if (!['admin', 'wholesaler'].includes(role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const payload = await request.json();
    const firstName = String(payload.firstName || '').trim();
    const lastName = String(payload.lastName || '').trim();
    const email = String(payload.email || '').trim().toLowerCase();
    const phoneNumber = String(payload.phoneNumber || '').trim();
    const business = String(payload.business || '').trim();

    if (!firstName || !lastName) {
      return NextResponse.json({ success: false, error: 'firstName and lastName are required' }, { status: 400 });
    }

    const ownerWholesalerId = role === 'admin'
      ? String(payload.wholesalerId || '').trim()
      : session.user.userID;

    const ownerWholesalerName = role === 'admin'
      ? String(payload.wholesalerName || '').trim()
      : (session.user.name || 'Wholesale Store');

    if (!ownerWholesalerId) {
      return NextResponse.json({ success: false, error: 'wholesalerId is required' }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    if (email) {
      const existingByEmailInClients = await db.collection('clients').findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') }
      });

      if (existingByEmailInClients) {
        return NextResponse.json({ success: false, error: 'A client with this email already exists for this workspace' }, { status: 409 });
      }

      const existingByEmailInUsers = await db.collection('users').findOne({
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i') }
      });

      if (existingByEmailInUsers) {
        return NextResponse.json({ success: false, error: 'That email is already used by a login account' }, { status: 409 });
      }
    }

    const now = new Date();
    const clientID = `client-${uuidv4().slice(0, 8)}`;
    const newClient = {
      clientID,
      userID: clientID,
      firstName,
      lastName,
      email,
      phoneNumber,
      business,
      accountType: 'client',
      status: 'verified',
      parentWholesalerId: ownerWholesalerId,
      parentWholesalerName: ownerWholesalerName,
      createdBy: session.user.userID,
      createdAt: now,
      updatedAt: now
    };

    await db.collection('clients').insertOne(newClient);

    return NextResponse.json({
      success: true,
      message: 'Wholesale client created successfully',
      data: sanitizeClient(newClient)
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/wholesale/clients error:', error);
    return NextResponse.json({ success: false, error: 'Failed to create wholesale client' }, { status: 500 });
  }
}
