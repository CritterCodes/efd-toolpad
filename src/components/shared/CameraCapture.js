'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  IconButton,
  Alert,
  FormControl,
  Select,
  MenuItem
} from '@mui/material';
import {
  PhotoCamera as PhotoCameraIcon,
  Close as CloseIcon
} from '@mui/icons-material';

export default function CameraCapture({ onCapture, disabled = false }) {
  // Default to native file input (safe for SSR + mobile).
  // Only show webcam dialog after confirming desktop on client.
  const [useWebcamDialog, setUseWebcamDialog] = useState(false);
  useEffect(() => {
    const mobile = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    setUseWebcamDialog(!mobile && !!navigator.mediaDevices?.getUserMedia);
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Enumerate available video input devices
  const loadDevices = useCallback(async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter((d) => d.kind === 'videoinput');
      setDevices(videoDevices);
      return videoDevices;
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      return [];
    }
  }, []);

  // Start webcam stream using explicit deviceId
  const startCamera = useCallback(async (deviceId) => {
    setError('');
    try {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      const videoConstraint = deviceId
        ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
        : { width: { ideal: 1280 }, height: { ideal: 960 } };
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraint,
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      // Re-enumerate after permissions granted (labels become available)
      const videoDevices = await loadDevices();
      // If no device was explicitly chosen, auto-select the active track's device
      if (!deviceId && videoDevices.length > 0) {
        const activeTrack = mediaStream.getVideoTracks()[0];
        const activeSettings = activeTrack?.getSettings?.();
        const activeId = activeSettings?.deviceId || videoDevices[0].deviceId;
        setSelectedDeviceId(activeId);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera access denied. Please allow camera permissions.');
      } else if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
        setError('Selected camera not found. Try choosing another device.');
      } else {
        setError('Unable to access camera: ' + err.message);
      }
    }
  }, [stream, loadDevices]);

  // Stop webcam stream
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  // Open dialog and start camera (desktop)
  const handleOpenCamera = useCallback(() => {
    setPreviewUrl(null); setError(''); setDialogOpen(true);
  }, []);

  // Start camera when dialog opens
  useEffect(() => {
    if (dialogOpen && useWebcamDialog) {
      startCamera(selectedDeviceId || undefined);
    }
    return () => {
      if (!dialogOpen) stopCamera();
    };
  }, [dialogOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close dialog and clean up
  const handleClose = useCallback(() => {
    stopCamera(); setPreviewUrl(null); setError(''); setDialogOpen(false);
  }, [stopCamera]);

  const handleCapture = useCallback(() => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
    stopCamera();
  }, [stopCamera]);

  // Confirm the captured photo
  const handleConfirm = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `repair-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        onCapture(file);
      }
      handleClose();
    }, 'image/jpeg', 0.85);
  }, [onCapture, handleClose]);

  const handleRetake = useCallback(() => {
    setPreviewUrl(null); startCamera(selectedDeviceId || undefined);
  }, [startCamera, selectedDeviceId]);

  // Handle device selection change
  const handleDeviceChange = useCallback((e) => {
    setSelectedDeviceId(e.target.value); startCamera(e.target.value);
  }, [startCamera]);

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) onCapture(file);
  }, [onCapture]);

  return (
    <>
      <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap" useFlexGap>
        {/* Primary camera button — webcam dialog on desktop, native camera app on mobile */}
        {useWebcamDialog ? (
          <Button
            variant="contained"
            startIcon={<PhotoCameraIcon />}
            onClick={handleOpenCamera}
            disabled={disabled}
            size="large"
            sx={{ py: 1, fontSize: '1.1rem' }}
          >
            Take Photo
          </Button>
        ) : (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              id="mobile-camera-input"
            />
            <label htmlFor="mobile-camera-input">
              <Button variant="contained" component="span" startIcon={<PhotoCameraIcon />}
                disabled={disabled} size="medium" sx={{ py: 1.5, fontSize: '1rem' }}>Take Photo</Button>
            </label>
          </>
        )}

        {/* Upload from file/gallery */}
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          id="file-upload-input"
        />
        <label htmlFor="file-upload-input">
          <Button variant="outlined" component="span" disabled={disabled} size="large">Upload from File</Button>
        </label>
      </Stack>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Desktop webcam dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { bgcolor: '#000' } }}
      >
        <DialogTitle sx={{ color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" component="span">Capture Photo</Typography>
          <IconButton onClick={handleClose} sx={{ color: '#fff' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 0, position: 'relative', minHeight: 300 }}>
          {error && (
            <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>
          )}

          {/* Camera device selector */}
          {!previewUrl && devices.length > 1 && (
            <Box sx={{ px: 2, pt: 1.5 }}>
              <FormControl fullWidth size="small">
                <Select
                  value={selectedDeviceId}
                  onChange={handleDeviceChange}
                  displayEmpty
                  sx={{ color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' }, '.MuiSvgIcon-root': { color: '#fff' } }}
                >
                  {devices.map((d) => (
                    <MenuItem key={d.deviceId} value={d.deviceId}>
                      {d.label || `Camera ${devices.indexOf(d) + 1}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}

          {!previewUrl ? (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', bgcolor: '#000' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </Box>
          ) : (
            <Box sx={{ width: '100%', display: 'flex', justifyContent: 'center', bgcolor: '#000' }}>
              <img
                src={previewUrl}
                alt="Captured"
                style={{ width: '100%', maxHeight: '60vh', objectFit: 'contain' }}
              />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ bgcolor: '#111', justifyContent: 'center', gap: 2, py: 2 }}>
          {!previewUrl ? (
            <Button
              variant="contained"
              color="error"
              onClick={handleCapture}
              disabled={!stream}
              size="large"
              sx={{ borderRadius: '50%', width: 64, height: 64, minWidth: 0 }}
            >
              <PhotoCameraIcon fontSize="large" />
            </Button>
          ) : (
            <>
              <Button variant="outlined" onClick={handleRetake} sx={{ color: '#fff', borderColor: '#fff' }}>
                Retake
              </Button>
              <Button variant="contained" color="success" onClick={handleConfirm}>
                Use Photo
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
