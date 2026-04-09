import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export function useOBJViewer({ fileUrl, mtlUrl, gemstoneColor }) {
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

  return { containerRef, loading, error };
}
