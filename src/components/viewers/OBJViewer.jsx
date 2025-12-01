'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';

/**
 * OBJ Viewer Component
 * Displays 3D OBJ files (gemstone models) with interactive controls
 * 
 * @param {string} fileUrl - S3 URL to the OBJ file
 * @param {string} mtlUrl - Optional S3 URL to the MTL file (materials)
 * @param {string} title - Title for the viewer
 * @param {object} style - Optional CSS styles
 * @param {THREE.Color} gemstoneColor - Optional color override for the gemstone
 */
export default function OBJViewer({ 
  fileUrl, 
  mtlUrl = null, 
  title = 'Gemstone Preview',
  style = {},
  gemstoneColor = null 
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
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
      camera.position.set(0, 0, 10);
      cameraRef.current = camera;

      // Renderer setup
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      containerRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // Enhanced lighting for gemstone visualization
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      scene.add(ambientLight);

      // Multiple directional lights for sparkle effect
      const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
      directionalLight1.position.set(10, 15, 10);
      directionalLight1.castShadow = true;
      scene.add(directionalLight1);

      const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
      directionalLight2.position.set(-10, 5, -10);
      scene.add(directionalLight2);

      // Add point light for extra sparkle
      const pointLight = new THREE.PointLight(0xffffff, 0.5);
      pointLight.position.set(5, 10, 15);
      scene.add(pointLight);

      // Simple orbit-like controls
      let isDragging = false;
      let previousMousePosition = { x: 0, y: 0 };
      let modelGroup = new THREE.Group();
      scene.add(modelGroup);

      renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
      });

      renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging) {
          const deltaX = e.clientX - previousMousePosition.x;
          const deltaY = e.clientY - previousMousePosition.y;

          modelGroup.rotation.y += deltaX * 0.01;
          modelGroup.rotation.x += deltaY * 0.01;

          previousMousePosition = { x: e.clientX, y: e.clientY };
        }
      });

      renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
      });

      // Zoom with scroll
      renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        cameraRef.current.position.z += e.deltaY * 0.002;
        cameraRef.current.position.z = Math.max(5, Math.min(30, cameraRef.current.position.z));
      });

      // Load OBJ file with optional MTL
      if (mtlUrl) {
        // Load with materials
        const mtlLoader = new MTLLoader();
        mtlLoader.load(mtlUrl, (materials) => {
          materials.preload();

          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(
            fileUrl,
            (object) => {
              loadAndProcessModel(object);
            },
            undefined,
            (err) => handleError(err)
          );
        });
      } else {
        // Load OBJ without materials
        const objLoader = new OBJLoader();
        objLoader.load(
          fileUrl,
          (object) => {
            loadAndProcessModel(object);
          },
          undefined,
          (err) => handleError(err)
        );
      }

      function loadAndProcessModel(object) {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(object);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 6 / maxDim;

        object.scale.multiplyScalar(scale);
        object.position.sub(center.multiplyScalar(scale));

        // Apply custom color if provided
        if (gemstoneColor) {
          object.traverse((node) => {
            if (node.isMesh) {
              node.material = new THREE.MeshPhongMaterial({
                color: gemstoneColor,
                shininess: 100,
                specular: 0x111111
              });
            }
          });
        } else {
          // Enhanced material for gemstone appearance
          object.traverse((node) => {
            if (node.isMesh) {
              if (!node.material.color) {
                node.material = new THREE.MeshPhongMaterial({
                  color: 0x4169e1, // Royal blue as default
                  shininess: 100,
                  specular: 0x222222
                });
              } else {
                // Enhance existing material
                node.material = new THREE.MeshPhongMaterial({
                  color: node.material.color,
                  shininess: 100,
                  specular: 0x222222
                });
              }
            }
          });
        }

        modelGroup.add(object);

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          renderer.render(scene, camera);
        };
        animate();

        setLoading(false);
      }

      function handleError(err) {
        console.error('OBJ Loading Error:', err);
        setError(`Failed to load OBJ file: ${err.message}`);
        setLoading(false);
      }

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
        window.removeEventListener('resize', handleResize);
        if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
          containerRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
      };
    } catch (err) {
      console.error('OBJ Viewer Error:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [fileUrl, mtlUrl, gemstoneColor]);

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
          Drag to rotate • Scroll to zoom • Interactive 3D Preview
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
              Loading gemstone model...
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
          Format: OBJ (Wavefront) • Optimized for gemstone visualization
        </Typography>
      </Box>
    </Paper>
  );
}
