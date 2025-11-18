'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box, CircularProgress, Alert, Typography } from '@mui/material';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const STLViewer = ({ fileUrl, title = 'STL Model Viewer', style = {} }) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const meshRef = useRef(null);
  const animationFrameIdRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!containerRef.current || !fileUrl) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf5f5f5);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000);
    camera.position.z = 100;
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting setup (enhanced for STL preview)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(100, 100, 100);
    directionalLight1.castShadow = true;
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-100, -100, -100);
    scene.add(directionalLight2);

    // Load STL file
    const loader = new STLLoader();
    loader.load(
      fileUrl,
      (geometry) => {
        // Center and scale geometry
        geometry.computeBoundingBox();
        const bbox = geometry.boundingBox;
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        geometry.translate(-center.x, -center.y, -center.z);

        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 80 / maxDim;
        geometry.scale(scale, scale, scale);

        // Compute normals for proper lighting
        geometry.computeVertexNormals();

        // Create material and mesh
        const material = new THREE.MeshPhongMaterial({
          color: 0x0084ff,
          shininess: 100,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        scene.add(mesh);
        meshRef.current = mesh;

        // Position camera to view entire model (further back for better initial view)
        const distance = maxDim / 2 / Math.tan((camera.fov * Math.PI) / 180 / 2);
        camera.position.z = distance * 2.5;
        camera.updateProjectionMatrix();

        setLoading(false);
      },
      undefined,
      (error) => {
        console.error('STL Loading Error:', error);
        setLoading(false);
        setError(`Failed to load STL: ${error.message}`);
      }
    );

    // Mouse controls
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let rotation = { x: 0, y: 0 };

    const onMouseDown = (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e) => {
      if (!isDragging || !meshRef.current) return;

      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;

      rotation.y += deltaX * 0.01;
      rotation.x += deltaY * 0.01;

      // Apply rotation to mesh
      meshRef.current.rotation.order = 'YXZ';
      meshRef.current.rotation.y = rotation.y;
      meshRef.current.rotation.x = rotation.x;

      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const onMouseWheel = (e) => {
      e.preventDefault();
      const direction = e.deltaY > 0 ? 1.1 : 0.9;
      camera.position.z *= direction;
      camera.updateProjectionMatrix();
    };

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('wheel', onMouseWheel, { passive: false });

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;

      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Animation loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      // Cancel animation frame
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }

      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('mousedown', onMouseDown);
      renderer.domElement.removeEventListener('mousemove', onMouseMove);
      renderer.domElement.removeEventListener('mouseup', onMouseUp);
      renderer.domElement.removeEventListener('wheel', onMouseWheel);

      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [fileUrl]);

  return (
    <Box sx={{ position: 'relative', ...style }}>
      {title && (
        <Typography
          variant="subtitle2"
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: '4px 8px',
            borderRadius: 1,
            fontSize: '0.875rem',
            fontWeight: 600,
            zIndex: 10,
          }}
        >
          {title}
        </Typography>
      )}

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
            gap: 1,
            zIndex: 5,
          }}
        >
          <CircularProgress />
          <Typography variant="caption">Loading STL model...</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ m: 1 }}>
          {error}
        </Alert>
      )}

      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          borderRadius: 1,
          overflow: 'hidden',
          backgroundColor: '#f5f5f5',
        }}
      />

      <Typography
        variant="caption"
        sx={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          padding: '4px 8px',
          borderRadius: 1,
          fontSize: '0.75rem',
          color: '#666',
        }}
      >
        Drag to rotate • Scroll to zoom
      </Typography>
    </Box>
  );
};

export default STLViewer;
