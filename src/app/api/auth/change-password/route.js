import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { auth } from '@/lib/auth';
import { db } from '@/lib/database';

export async function POST(req) {
    try {
        const session = await auth();
        if (!session?.user?.userID) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { error: 'Current password and new password are required.' },
                { status: 400 }
            );
        }

        if (newPassword.length < 8) {
            return NextResponse.json(
                { error: 'New password must be at least 8 characters.' },
                { status: 400 }
            );
        }

        const dbInstance = await db.connect();
        const user = await dbInstance.collection('users').findOne({ userID: session.user.userID });

        if (!user) {
            return NextResponse.json({ error: 'User not found.' }, { status: 404 });
        }

        // Verify current password
        if (!user.password || user.password === 'no password') {
            return NextResponse.json(
                { error: 'No password set. Contact administrator.' },
                { status: 400 }
            );
        }

        const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentValid) {
            return NextResponse.json(
                { error: 'Current password is incorrect.' },
                { status: 401 }
            );
        }

        // Hash and save new password, clear mustChangePassword flag
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await dbInstance.collection('users').updateOne(
            { userID: session.user.userID },
            {
                $set: {
                    password: hashedPassword,
                    mustChangePassword: false,
                    passwordChangedAt: new Date(),
                    updatedAt: new Date()
                }
            }
        );

        return NextResponse.json({
            success: true,
            message: 'Password changed successfully. Please sign in again.'
        });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { error: 'An error occurred while changing password.' },
            { status: 500 }
        );
    }
}
