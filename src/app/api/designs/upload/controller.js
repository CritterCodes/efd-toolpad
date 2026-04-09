import { DesignUploadService } from './service.js';
import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { FileProcessingUtil } from '@/utils/file/fileProcessing.util';

export class DesignUploadController {
    static async handleUpload(request) {
        try {
            console.log(' Design Upload API called');

            const session = await auth();
            if (!session?.user) {
                return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
            }

            if (!session.user.artisanTypes?.includes('CAD Designer') && session.user.role !== 'admin') {
                return NextResponse.json({ 
                    error: 'Access denied. CAD Designer role required.' 
                }, { status: 403 });
            }

            const formData = await request.formData();
            console.log(' Form data received');

            const requestId = formData.get('requestId');
            const designerId = formData.get('designerId');
            const title = formData.get('title');
            const description = formData.get('description') || '';
            const notes = formData.get('notes') || '';
            const uploadedFile = formData.get('glbFile');

            if (!requestId) return NextResponse.json({ error: 'Request ID is required' }, { status: 400 });
            if (!title || !title.trim()) return NextResponse.json({ error: 'Design title is required' }, { status: 400 });
            if (!uploadedFile || uploadedFile.size === 0) return NextResponse.json({ error: 'File is required' }, { status: 400 });

            const fileType = FileProcessingUtil.getFileType(uploadedFile.name);
            const fileBuffer = await FileProcessingUtil.validateAndConvertToBuffer(uploadedFile);

            const payload = {
                requestId,
                designerId,
                title: title.trim(),
                description: description.trim(),
                notes: notes.trim(),
                fileType,
                fileName: uploadedFile.name,
                fileSize: uploadedFile.size,
                fileMimeType: uploadedFile.type,
                fileBuffer,
                sessionUser: session.user
            };

            const result = await DesignUploadService.handleUpload(payload);

            return NextResponse.json({
                success: true,
                design: result,
                message: 'Design uploaded successfully'
            }, { status: 201 });
            
        } catch (error) {
            console.error(' Design Upload API error:', error);
            const statusCode = error.statusCode || 500;
            return NextResponse.json(
                { error: error.message || 'Internal server error', details: error.message },
                { status: statusCode }
            );
        }
    }
}
