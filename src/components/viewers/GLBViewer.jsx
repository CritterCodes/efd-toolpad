'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

/**
 * GLB Viewer Component
 * Displays 3D GLB files (CAD designs) with interactive controls
 * 
 * @param {string} fileUrl - S3 URL to the GLB file
 * @param {string} title - Title for the viewer
 * @param {object} style - Optional CSS styles
 */
export default function GLBViewer({ fileUrl, title = 'CAD Design Preview', style = {} }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!fileUrl || !containerRef.current) return;

    try {
      // Initialize Three.js scene
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      // Scene setup
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f5f5);
      sceneRef.current = scene;

      // Camera setup
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      camera.position.set(0, 0, 5);
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Lighting setup
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
      scene.add(ambientLight);

      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 5);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048;
      directionalLight.shadow.mapSize.height = 2048;
      scene.add(directionalLight);

      // Add grid helper for reference
      const gridHelper = new THREE.GridHelper(10, 10, 0xcccccc, 0xeeeeee);
      gridHelper.position.y = -3;
      scene.add(gridHelper);

      // Simple orbit-like controls with mouse
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };

      renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging && sceneRef.current?.children[sceneRef.current.children.length - 1]?.isGroup) {
          const deltaX = e.clientX - previousMousePosition.x;
          const deltaY = e.clientY - previousMousePosition.y;

          // Rotate the model
          const model = sceneRef.current.children[sceneRef.current.children.length - 1];
          model.rotation.y += deltaX * 0.01;
          model.rotation.x += deltaY * 0.01;

          previousMousePosition = { x: e.clientX, y: e.clientY };
        }
      });

      renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
      });

      renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraRef.current.position.z += e.deltaY * 0.001;
      });

      // Load GLB file
      const loader = new GLTFLoader();
      loader.load(
        fileUrl,
        (gltf) => {
          const model = gltf.scene;
          
          // Center and scale the model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 3 / maxDim;
          
          model.scale.multiplyScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          
          scene.add(model);

          // Animation loop
          let animationFrameId;
          const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            renderer.render(scene, camera);
          };
          animate();

          setLoading(false);
        },
        (progress) => {
          // Progress callback (optional)
          const percentComplete = (progress.loaded / progress.total) * 100;
          console.log(`Loading: ${percentComplete}%`);
        },
        (err) => {
          console.error('GLB Loading Error:', err);
          setError(`Failed to load GLB file: ${err.message}`);
          setLoading(false);
        }
      );

      // Handle window resize
      const handleResize = () => {
        const newWidth = containerRef.current?.clientWidth;
        const newHeight = containerRef.current?.clientHeight;
        if (newWidth && newHeight) {
          camera.aspect = newWidth / newHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(newWidth, newHeight);
        }
      };

      window.addEventListener('resize', handleResize);

      // Cleanup
      return () => {
        // Cancel animation frame
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }

        window.removeEventListener('resize', handleResize);
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    } catch (err) {
      console.error('GLB Viewer Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [fileUrl]);

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
          position: 'relative',
          backgroundColor: '#f5f5f5',
          minHeight: '400px'
        }}
      >
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
              gap: 2,
              zIndex: 10
            }}
          >
            <CircularProgress />
            <Typography variant="body2" color="textSecondary">
              Loading 3D model...
            </Typography>
          </Box>
        )}

        {error && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              p: 3,
              backgroundColor: '#ffebee',
              borderRadius: 1,
              maxWidth: '80%',
              zIndex: 10
            }}
          >
            <Typography variant="body2" color="error" fontWeight={600}>
              Error Loading Model
            </Typography>
            <Typography variant="caption" color="error">
              {error}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer Info */}
      <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', backgroundColor: '#fafafa' }}>
        <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
          Format: GLB (Binary glTF) • 3D Interactive Preview
        </Typography>
      </Box>
    </Paper>
  );
}
