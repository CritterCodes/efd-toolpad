import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    try {
        console.log('🔑 [GENERATE TOKEN] Request received');
        
        // Get the current session to ensure user is authenticated
        const session = await auth();
        if (!session || !session.user) {
            console.log('❌ [GENERATE TOKEN] No valid session found');
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { email, callbackUrl } = await request.json();
        console.log('🔑 [GENERATE TOKEN] Generating token for:', email);
        console.log('🔑 [GENERATE TOKEN] Callback URL:', callbackUrl);

        // Verify the email matches the session
        if (session.user.email !== email) {
            console.log('❌ [GENERATE TOKEN] Email mismatch');
            return NextResponse.json({ error: 'Email mismatch' }, { status: 400 });
        }

        // Generate a temporary JWT token with user info (expires in 5 minutes)
        const token = jwt.sign(
            {
                userId: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
                exp: Math.floor(Date.now() / 1000) + (5 * 60), // 5 minutes
                callbackUrl
            },
            process.env.NEXTAUTH_SECRET
        );

        console.log('✅ [GENERATE TOKEN] Token generated successfully');
        
        return NextResponse.json({ token });
    } catch (error) {
        console.error('💥 [GENERATE TOKEN] Error:', error);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500 });
    }
}