export class FileProcessingUtil {
    /**
     * Determine the file type based on its extension
     * @param {string} fileName 
     * @returns {string} - 'stl' or 'glb'
     */
    static getFileType(fileName) {
        const fileExtension = fileName?.split('.')?.pop()?.toLowerCase();
        return fileExtension === 'stl' ? 'stl' : 'glb';
    }

    /**
     * Validate file and convert to ArrayBuffer
     * @param {File} file 
     * @param {number} maxSizeInBytes 
     * @returns {Promise<ArrayBuffer>}
     */
    static async validateAndConvertToBuffer(file, maxSizeInBytes = null) {
        if (!file || file.size === 0) {
            throw new Error('File is empty or invalid.');
        }
        
        if (maxSizeInBytes && file.size > maxSizeInBytes) {
            throw new Error(`File size exceeds the limit of ${maxSizeInBytes} bytes.`);
        }
        
        return await file.arrayBuffer();
    }
}