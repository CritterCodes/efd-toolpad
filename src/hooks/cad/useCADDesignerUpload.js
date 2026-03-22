import { useState } from 'react';
import { getSTLVolume, getMeshStats, parseSTL } from '@/lib/stlParser';

const MAX_FILE_SIZE = {
  stl: 50 * 1024 * 1024, // 50MB for STL
  glb: 20 * 1024 * 1024, // 20MB for GLB
};

export const useCADDesignerUpload = ({ cadRequestId, onUploadComplete }) => {
  const [files, setFiles] = useState({ stl: null, glb: null });
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const [calculatedVolume, setCalculatedVolume] = useState(null);
  const [meshStats, setMeshStats] = useState(null);
  const [errors, setErrors] = useState({});
  const [manualVolume, setManualVolume] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(false);

  const handleFileChange = async (e, fileType) => {
    const file = e.target.files[0];
    if (!file) return;

    const newErrors = { ...errors };
    delete newErrors[fileType];

    if (fileType === 'stl') {
      if (!file.name.toLowerCase().endsWith('.stl')) {
        newErrors.stl = 'File must be in .stl format';
        setErrors(newErrors);
        return;
      }
      if (file.size > MAX_FILE_SIZE.stl) {
        newErrors.stl = `File size exceeds ${MAX_FILE_SIZE.stl / (1024 * 1024)}MB limit`;
        setErrors(newErrors);
        setFiles({ ...files, stl: null });
        return;
      }

      try {
        setUploadProgress({ ...uploadProgress, stl: 'calculating' });
        const volume = await getSTLVolume(file);
        const { vertices } = await parseSTL(file);
        const stats = getMeshStats(vertices);

        setCalculatedVolume(volume);
        setMeshStats(stats);
        setUploadProgress({ ...uploadProgress, stl: 'done' });
      } catch (error) {
        newErrors.stl = `Volume calculation failed: ${error.message}`;
        setUploadProgress({ ...uploadProgress, stl: 'error' });
      }
    } else if (fileType === 'glb') {
      if (!file.name.toLowerCase().endsWith('.glb')) {
        newErrors.glb = 'File must be in .glb format';
        setErrors(newErrors);
        return;
      }

      if (file.size > MAX_FILE_SIZE.glb) {
        newErrors.glb = `File size exceeds ${MAX_FILE_SIZE.glb / (1024 * 1024)}MB limit`;
        setErrors(newErrors);
        setFiles({ ...files, glb: null });
        return;
      }
    }

    setFiles({ ...files, [fileType]: file });
    setErrors(newErrors);
  };

  const handleUpload = () => {
    if (!files.stl && !files.glb) {
      setErrors({ general: 'Please select at least one file to upload' });
      return;
    }
    if (!cadRequestId) {
      setErrors({ general: 'CAD Request ID is required' });
      return;
    }
    setConfirmDialog(true);
  };

  const uploadFileToS3 = async (file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    formData.append('cadRequestId', cadRequestId);

    const response = await fetch('/api/upload/cad-files', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  };

  const saveDesignToDB = async (designData) => {
    const response = await fetch('/api/cad/designs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cadRequestId,
        files: {
          stl: designData.stlUrl ? {
            url: designData.stlUrl,
            originalName: files.stl?.name,
            size: files.stl?.size,
            mimetype: 'application/vnd.ms-pki.stl',
          } : undefined,
          glb: designData.glbUrl ? {
            url: designData.glbUrl,
            originalName: files.glb?.name,
            size: files.glb?.size,
            mimetype: 'application/octet-stream',
          } : undefined,
        },
        printVolume: Math.round(designData.volume || 0),
        meshStats: designData.meshStats,
      }),
    });

    if (!response.ok) {
      throw new Error(`Database save failed: ${response.statusText}`);
    }

    return response.json();
  };

  const proceedWithUpload = async () => {
    setConfirmDialog(false);
    setUploading(true);
    const newErrors = {};
    const newStatus = {};

    try {
      if (files.stl) {
        try {
          setUploadProgress({ ...uploadProgress, stl: 'uploading' });
          const stlUrl = await uploadFileToS3(files.stl, 'stl');
          newStatus.stl = { success: true, url: stlUrl };
          setUploadProgress({ ...uploadProgress, stl: 'complete' });
        } catch (error) {
          newErrors.stl = error.message;
          newStatus.stl = { success: false, error: error.message };
          setUploadProgress({ ...uploadProgress, stl: 'error' });
        }
      }

      if (files.glb) {
        try {
          setUploadProgress({ ...uploadProgress, glb: 'uploading' });
          const glbUrl = await uploadFileToS3(files.glb, 'glb');
          newStatus.glb = { success: true, url: glbUrl };
          setUploadProgress({ ...uploadProgress, glb: 'complete' });
        } catch (error) {
          newErrors.glb = error.message;
          newStatus.glb = { success: false, error: error.message };
          setUploadProgress({ ...uploadProgress, glb: 'error' });
        }
      }

      setUploadStatus(newStatus);

      if (newStatus.stl?.success || newStatus.glb?.success) {
        try {
          const finalVolume = manualVolume || calculatedVolume;

          await saveDesignToDB({
            cadRequestId,
            stlUrl: newStatus.stl?.url,
            glbUrl: newStatus.glb?.url,
            volume: finalVolume,
            meshStats,
          });

          setFiles({ stl: null, glb: null });
          setCalculatedVolume(null);
          setMeshStats(null);
          setManualVolume('');
          setErrors({});
          setUploadProgress({});

          if (onUploadComplete) {
            onUploadComplete({
              stlUrl: newStatus.stl?.url,
              glbUrl: newStatus.glb?.url,
              volume: finalVolume,
            });
          }
        } catch (error) {
          newErrors.database = `Failed to save design: ${error.message}`;
        }
      }

      setErrors(newErrors);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (fileType) => {
    setFiles({ ...files, [fileType]: null });
    setUploadProgress({ ...uploadProgress, [fileType]: null });
    if (fileType === 'stl') {
      setCalculatedVolume(null);
      setMeshStats(null);
      setManualVolume('');
    }
  };

  return {
    files,
    uploading,
    uploadProgress,
    calculatedVolume,
    meshStats,
    errors,
    manualVolume,
    confirmDialog,
    setManualVolume,
    setConfirmDialog,
    handleFileChange,
    handleUpload,
    proceedWithUpload,
    removeFile,
  };
};
