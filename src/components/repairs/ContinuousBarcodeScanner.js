"use client";

import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  FlashlightOn as FlashlightIcon,
  QrCodeScanner as ScanIcon,
} from '@mui/icons-material';
import { REPAIRS_UI } from '@/app/dashboard/repairs/components/repairsUi';

const SCAN_COOLDOWN_MS = 900;
const CLEAR_FRAMES_REQUIRED = 8;
const BARCODE_FORMATS = ['code_39', 'code_128', 'qr_code'];

function cleanScanValue(value) {
  return String(value || '')
    .trim()
    .replace(/^\*/, '')
    .replace(/\*$/, '');
}

export default function ContinuousBarcodeScanner({
  open,
  title = 'Scan Repairs',
  queuedCount = 0,
  actionLabel = 'Done',
  actionDisabled = false,
  onClose,
  onScan,
  onAction,
  children,
}) {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const onScanRef = useRef(onScan);
  const lastScanRef = useRef({ value: '', at: 0 });
  const lockedScanRef = useRef('');
  const clearFramesRef = useRef(0);
  const [cameraError, setCameraError] = useState('');
  const [lastScan, setLastScan] = useState('');
  const [manualValue, setManualValue] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scannerSupported, setScannerSupported] = useState(true);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!open) return undefined;

    let cancelled = false;

    const stopStream = () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      setTorchOn(false);
      setTorchSupported(false);
    };

    const handleDetectedValue = (rawValue) => {
      const value = cleanScanValue(rawValue);
      if (!value) return;

      clearFramesRef.current = 0;
      if (lockedScanRef.current === value) return;

      const now = Date.now();
      if (now - lastScanRef.current.at < SCAN_COOLDOWN_MS) return;

      lockedScanRef.current = value;
      lastScanRef.current = { value, at: now };
      setLastScan(value);
      onScanRef.current?.(value);

      if (window.navigator?.vibrate) {
        window.navigator.vibrate(60);
      }
    };

    const scanFrame = async () => {
      if (cancelled || !detectorRef.current || !videoRef.current) return;

      const video = videoRef.current;
      if (video.readyState >= 2) {
        try {
          const barcodes = await detectorRef.current.detect(video);
          if (barcodes?.length > 0) {
            handleDetectedValue(barcodes[0].rawValue);
          } else if (lockedScanRef.current) {
            clearFramesRef.current += 1;
            if (clearFramesRef.current >= CLEAR_FRAMES_REQUIRED) {
              lockedScanRef.current = '';
              clearFramesRef.current = 0;
            }
          }
        } catch {
          // Camera frames can fail transiently while focus/exposure settles.
        }
      }

      frameRef.current = requestAnimationFrame(scanFrame);
    };

    const startCamera = async () => {
      setCameraError('');
      setLastScan('');
      lockedScanRef.current = '';
      clearFramesRef.current = 0;

      if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setScannerSupported(false);
        setCameraError('Camera scanning is not available in this browser. Use manual entry below.');
        return;
      }

      if (!('BarcodeDetector' in window)) {
        setScannerSupported(false);
        setCameraError('This browser does not support continuous barcode scanning. Use manual entry below.');
        return;
      }

      try {
        detectorRef.current = new window.BarcodeDetector({ formats: BARCODE_FORMATS });
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const [track] = stream.getVideoTracks();
        const capabilities = track?.getCapabilities?.() || {};
        setTorchSupported(Boolean(capabilities.torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          scanFrame();
        }
      } catch (error) {
        setCameraError(error?.message || 'Unable to start camera. Use manual entry below.');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open]);

  const handleManualSubmit = (event) => {
    event.preventDefault();
    const value = cleanScanValue(manualValue);
    if (!value) return;
    setLastScan(value);
    onScanRef.current?.(value);
    setManualValue('');
  };

  const handleToggleTorch = async () => {
    const [track] = streamRef.current?.getVideoTracks?.() || [];
    if (!track) return;

    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn }] });
      setTorchOn((value) => !value);
    } catch {
      setTorchSupported(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          bgcolor: REPAIRS_UI.bgPrimary,
          color: REPAIRS_UI.textPrimary,
          backgroundImage: 'none',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: `1px solid ${REPAIRS_UI.border}`, px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: REPAIRS_UI.textHeader }}>{title}</Typography>
            <Typography variant="caption" sx={{ color: REPAIRS_UI.textSecondary }}>
              Camera stays open while each repair is added to the batch.
            </Typography>
          </Box>
          <Button
            onClick={onClose}
            startIcon={<CloseIcon />}
            sx={{ color: REPAIRS_UI.textSecondary, borderColor: REPAIRS_UI.border, flexShrink: 0 }}
            variant="outlined"
            size="small"
          >
            Close
          </Button>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              aspectRatio: '4 / 3',
              maxHeight: '58vh',
              bgcolor: '#05070A',
              border: `1px solid ${REPAIRS_UI.border}`,
              borderRadius: 2,
              overflow: 'hidden',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: scannerSupported && !cameraError ? 'block' : 'none',
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                inset: '28% 10%',
                border: `2px solid ${REPAIRS_UI.accent}`,
                borderRadius: 2,
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.28)',
                pointerEvents: 'none',
              }}
            />
            {cameraError && (
              <Alert
                severity="warning"
                sx={{
                  mx: 2,
                  bgcolor: REPAIRS_UI.bgCard,
                  color: REPAIRS_UI.textPrimary,
                  border: `1px solid ${REPAIRS_UI.border}`,
                }}
              >
                {cameraError}
              </Alert>
            )}
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip
              icon={<ScanIcon sx={{ color: `${REPAIRS_UI.accent} !important` }} />}
              label={`${queuedCount} queued`}
              sx={{ bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}
            />
            {lastScan && (
              <Chip
                label={`Last: ${lastScan}`}
                sx={{ bgcolor: REPAIRS_UI.bgCard, color: REPAIRS_UI.textPrimary, border: `1px solid ${REPAIRS_UI.border}` }}
              />
            )}
            {torchSupported && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<FlashlightIcon />}
                onClick={handleToggleTorch}
                sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
              >
                {torchOn ? 'Torch Off' : 'Torch On'}
              </Button>
            )}
          </Box>

          <Box component="form" onSubmit={handleManualSubmit} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField
              value={manualValue}
              onChange={(event) => setManualValue(event.target.value)}
              label="Manual repair ID"
              size="small"
              autoComplete="off"
              sx={{
                flex: '1 1 220px',
                '& .MuiOutlinedInput-root': {
                  bgcolor: REPAIRS_UI.bgCard,
                  color: REPAIRS_UI.textPrimary,
                },
                '& .MuiInputLabel-root': { color: REPAIRS_UI.textMuted },
              }}
            />
            <Button
              type="submit"
              variant="outlined"
              disabled={!manualValue.trim()}
              sx={{ color: REPAIRS_UI.textPrimary, borderColor: REPAIRS_UI.border }}
            >
              Add
            </Button>
          </Box>

          {children}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: `1px solid ${REPAIRS_UI.border}` }}>
        <Button
          fullWidth
          variant="contained"
          disabled={actionDisabled}
          onClick={onAction}
          sx={{
            bgcolor: REPAIRS_UI.accent,
            color: '#000',
            fontWeight: 700,
            '&:hover': { bgcolor: '#c9a227' },
          }}
        >
          {actionLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
