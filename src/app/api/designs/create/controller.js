import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import DesignService from './service.js';

export default class DesignController {
    static async createDesign(request) {
        try {
            console.log('🎨 Design Creation API called');
            
            const session = await auth();
            if (!session?.user) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }

            // Check if user is a CAD Designer
            if (!session.user.artisanTypes?.includes('CAD Designer')) {
                return NextResponse.json({ error: 'Access denied. CAD Designer role required.' }, { status: 403 });
            }

            // Parse form data
            const formData = await request.formData();
            console.log('📋 Form data received');

            const result = await DesignService.createDesign(formData, session.user);

            if (result.error) {
                if (result.debug) {
                    return NextResponse.json({ error: result.error, debug: result.debug }, { status: result.status });
                }
                return NextResponse.json({ error: result.error }, { status: result.status });
            }

            return NextResponse.json({
                success: true,
                designId: result.designId,
                designProductId: result.designProductId,
                message: result.message
            });

        } catch (error) {
            console.error('❌ Design Creation API error:', error);
            return NextResponse.json(
                { error: 'Internal server error', details: error.message },
                { status: 500 }
            );
        }
    }
}
