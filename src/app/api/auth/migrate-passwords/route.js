import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import AuthService from '../[...nextauth]/service';

export async function POST(req) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const sendEmails = Boolean(body?.sendEmails);

    const result = await AuthService.runPasswordMigration({ sendEmails });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('POST /api/auth/migrate-passwords error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run password migration' },
      { status: 500 }
    );
  }
}
