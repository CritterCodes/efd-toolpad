"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { ThreeDRotation as ViewModelIcon } from '@mui/icons-material';

function GLBViewer({ src, alt = '3D model', className = '', height = 400 }) {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelError, setModelError] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [viewerKey, setViewerKey] = useState(0);
  const modelViewerRef = useRef(null);

  // Load model-viewer script
  useEffect(() => {
    if (!scriptLoaded) {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = 'https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js';
      script.onload = () => {
        console.log('✅ Model-viewer script loaded');
        setScriptLoaded(true);
      };
      script.onerror = (e) => {
        console.error('❌ Error loading model-viewer script:', e);
        setModelError(true);
      };
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [scriptLoaded]);

  // Setup model viewer when script is loaded
  useEffect(() => {
    if (scriptLoaded && modelViewerRef.current && src) {
      const modelViewer = modelViewerRef.current;

      const handleLoad = () => {
        console.log('✅ 3D model loaded successfully');
        setModelLoaded(true);
        setModelError(false);
        
        // Setup optimal camera settings for jewelry/designs
        if (modelViewer.getCameraTarget) {
          try {
            modelViewer.cameraOrbit = "45deg 75deg auto";
            modelViewer.fieldOfView = "30deg";
            
            if (modelViewer.environmentImage) {
              modelViewer.environmentImage = "neutral";
            }
          } catch (error) {
            console.warn('Camera setup error:', error);
          }
        }
      };

      const handleError = (event) => {
        console.error('❌ 3D model loading error:', event);
        setModelError(true);
        setModelLoaded(false);
      };

      const handleProgress = (event) => {
        const progress = event.detail.totalProgress * 100;
        setLoadingProgress(progress);
        console.log(`📊 Loading progress: ${progress.toFixed(1)}%`);
      };

      // Add event listeners
      modelViewer.addEventListener('load', handleLoad);
      modelViewer.addEventListener('error', handleError);
      modelViewer.addEventListener('progress', handleProgress);

      // Cleanup
      return () => {
        modelViewer.removeEventListener('load', handleLoad);
        modelViewer.removeEventListener('error', handleError);
        modelViewer.removeEventListener('progress', handleProgress);
      };
    }
  }, [scriptLoaded, src, viewerKey]);

  // Force re-mount when src changes
  useEffect(() => {
    setModelLoaded(false);
    setModelError(false);
    setLoadingProgress(0);
    setViewerKey(prev => prev + 1);
  }, [src]);

  if (!src) {
    return (
      <Box
        className={className}
        sx={{
          height: height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          borderRadius: 1
        }}
      >
        <Box textAlign="center" p={2}>
          <ViewModelIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
          <Typography variant="body2">No 3D model available</Typography>
          <Typography variant="caption" color="text.secondary">
            Upload a GLB or GLTF file to view
          </Typography>
        </Box>
      </Box>
    );
  }

  if (modelError) {
    return (
      <Box
        className={className}
        sx={{
          height: height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#1a1a1a',
          color: 'white',
          borderRadius: 1
        }}
      >
        <Box textAlign="center" p={2} maxWidth="sm">
          <Alert severity="error" sx={{ mb: 2 }}>
            3D Model Failed to Load
          </Alert>
          <Typography variant="body2" color="text.secondary">
            The 3D model file could not be displayed. Please check the file format and try again.
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block', fontFamily: 'monospace', wordBreak: 'break-all' }}>
            File: {src}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <>
      {/* Conditionally include the model-viewer script */}
      {!scriptLoaded && (
        <script
          type="module"
          src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"
        />
      )}
      
      <Box
        className={className}
        sx={{
          height: height,
          position: 'relative',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: '#1a1a1a'
        }}
      >
        {scriptLoaded ? (
          <model-viewer
            key={viewerKey}
            ref={modelViewerRef}
            src={src}
            alt={alt}
            camera-controls
            touch-action="pan-y"
            auto-rotate
            auto-rotate-delay="3000"
            rotation-per-second="30deg"
            environment-image="neutral"
            exposure="1"
            shadow-intensity="1"
            tone-mapping="aces"
            interaction-prompt="auto"
            camera-orbit="45deg 75deg auto"
            field-of-view="30deg"
            min-camera-orbit="auto auto auto"
            max-camera-orbit="auto auto auto"
            min-field-of-view="10deg"
            max-field-of-view="90deg"
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: '#1a1a1a'
            }}
            loading="eager"
            reveal="auto"
          >
            {/* Loading Progress */}
            {!modelLoaded && (
              <Box
                slot="progress-bar"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#1a1a1a',
                  color: 'white',
                  flexDirection: 'column',
                  padding: 3
                }}
              >
                <CircularProgress 
                  variant="determinate" 
                  value={loadingProgress} 
                  size={60}
                  sx={{ mb: 2, color: 'primary.main' }}
                />
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Loading 3D Model...
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {loadingProgress.toFixed(1)}%
                </Typography>
              </Box>
            )}

            {/* Model Controls Info */}
            {modelLoaded && (
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: 1,
                  fontSize: '0.75rem'
                }}
              >
                Drag to rotate • Scroll to zoom
              </Box>
            )}
          </model-viewer>
        ) : (
          <Box
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#1a1a1a',
              color: 'white'
            }}
          >
            <Box textAlign="center" p={2}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="body2">Loading 3D Viewer...</Typography>
            </Box>
          </Box>
        )}
      </Box>
    </>
  );
}

export default GLBViewer;