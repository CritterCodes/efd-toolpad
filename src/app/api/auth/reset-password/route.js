import { NextResponse } from 'next/server';
import AuthService from '../[...nextauth]/service';

export async function POST(req) {
  try {
    const body = await req.json();
    const token = body?.token;
    const password = body?.password;

    const result = await AuthService.resetPasswordWithToken(token, password);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    const status = error?.message?.includes('Invalid or expired') ? 400 : 500;
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to reset password' },
      { status }
    );
  }
}
