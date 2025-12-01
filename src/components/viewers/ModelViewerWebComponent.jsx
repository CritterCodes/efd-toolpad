'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

/**
 * Google Model Viewer Web Component
 * Uses the professional model-viewer from Google with built-in material handling
 * This is the same viewer used in efd-shop for optimal material rendering
 * 
 * Supports: GLB, GLTF (native)
 * Note: STL and OBJ files should use dedicated viewers (STLViewer, OBJViewer)
 */
export default function ModelViewerWebComponent({ 
  fileUrl, 
  title = 'CAD Design Preview',
  style = {},
  onLoad = null 
}) {
  const modelViewerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const containerRef = useRef(null);

  // Load the model-viewer web component script only once globally
  useEffect(() => {
    if (scriptLoaded || window.modelViewerLoaded) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js';
    script.type = 'module';
    script.async = true;
    
    script.onload = () => {
      console.log('✅ Model-viewer script loaded');
      window.modelViewerLoaded = true;
      setScriptLoaded(true);
    };
    
    script.onerror = (err) => {
      console.error('❌ Failed to load model-viewer script:', err);
      setError('Failed to load 3D viewer library');
      setLoading(false);
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Don't remove script - it's used globally
    };
  }, [scriptLoaded]);

  // Set up event listeners once script is loaded
  useEffect(() => {
    if (!scriptLoaded || !modelViewerRef.current || !fileUrl) {
      console.log('⏳ Not ready:', { scriptLoaded, hasRef: !!modelViewerRef.current, hasUrl: !!fileUrl });
      return;
    }

    const viewer = modelViewerRef.current;
    console.log('🔧 Setting up viewer for:', fileUrl);

    // Reset loading state
    setLoading(true);
    setError(null);

    const handleLoad = () => {
      console.log('✅ 3D Model loaded successfully:', fileUrl);
      setLoading(false);
      setError(null);
      onLoad?.();
    };

    const handleError = (event) => {
      console.error('❌ 3D Model loading error:', event.detail);
      setError(`Failed to load 3D model: ${event.detail}`);
      setLoading(false);
    };

    // Remove existing listeners to avoid duplicates
    viewer.removeEventListener('load', handleLoad);
    viewer.removeEventListener('error', handleError);

    // Add new listeners
    viewer.addEventListener('load', handleLoad);
    viewer.addEventListener('error', handleError);

    return () => {
      viewer.removeEventListener('load', handleLoad);
      viewer.removeEventListener('error', handleError);
    };
  }, [scriptLoaded, fileUrl, onLoad]);

  if (!scriptLoaded) {
    return (
      <Paper
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          ...style
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '600px',
          bgcolor: '#f5f5f5',
          ...style
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          ⚠️ {error}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Unable to load 3D model
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
        <Typography variant="subtitle1" fontWeight={600}>
          {title}
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Drag to rotate • Scroll to zoom
        </Typography>
      </Box>

      {/* Viewer Container */}
      <Box
        ref={containerRef}
        sx={{
          flex: 1,
          display: 'flex',
          position: 'relative',
          backgroundColor: '#ffffff',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          '& model-viewer': {
            width: '100% !important',
            height: '100% !important',
            display: 'block'
          }
        }}
      >
        <model-viewer
          ref={modelViewerRef}
          src={fileUrl}
          alt={title}
          camera-controls="true"
          auto-rotate="true"
          environment-image="neutral"
          shadow-intensity="1"
          poster
          style={{
            width: '100%',
            height: '100%',
            display: 'block'
          }}
        />

        {/* Loading Indicator */}
        {loading && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="textSecondary">
              Loading 3D model...
            </Typography>
          </Box>
        )}

        {/* Success Indicator */}
        {!loading && !error && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              padding: '6px 10px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              borderRadius: '6px',
              fontSize: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backdropFilter: 'blur(4px)',
              zIndex: 10
            }}
          >
            <Box
              sx={{
                width: '6px',
                height: '6px',
                backgroundColor: '#ffd700',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 }
                }
              }}
            />
            <span>3D READY</span>
          </Box>
        )}
      </Box>
    </Paper>
  );
}
