import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * 3D Gyro-Responsive UI Overlay (Step 4: Interactive Mobile Background Engine)
 * Renders a dark geometric matrix wireframe grid that smoothly responds to hardware
 * accelerometer tilt (DeviceOrientationEvent) with cursor/touch fallback.
 */
export const OmniVoidBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvasElement = canvasRef.current;
    if (!canvasElement) return;

    let animId: number;
    let targetX = 0;
    let targetY = 0;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030303, 0.015);

    // 2. Camera Setup
    const width = window.innerWidth;
    const height = window.innerHeight;
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 1000);
    camera.position.z = 100;

    // 3. Dark Geometric Matrix Wireframe Grid
    const geometry = new THREE.PlaneGeometry(240, 240, 28, 28);
    const material = new THREE.MeshBasicMaterial({
      color: 0x00f2fe, // Neon cyan matrix grid with subtle glow
      wireframe: true,
      transparent: true,
      opacity: 0.14,
    });

    const meshGrid = new THREE.Mesh(geometry, material);
    meshGrid.rotation.x = -Math.PI / 2.5;
    scene.add(meshGrid);

    // Secondary subtle violet floor grid for depth
    const subGeometry = new THREE.PlaneGeometry(260, 260, 14, 14);
    const subMaterial = new THREE.MeshBasicMaterial({
      color: 0x7f00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const subGrid = new THREE.Mesh(subGeometry, subMaterial);
    subGrid.position.z = -15;
    subGrid.rotation.x = -Math.PI / 2.5;
    scene.add(subGrid);

    // 4. Renderer with pixelRatio cap to preserve mobile battery
    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvasElement,
        alpha: true,
        antialias: false,
        powerPreference: 'low-power',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    } catch (err) {
      console.warn('WebGL init notice:', err);
      return;
    }

    // 5. Hardware Accelerometer & Tilt Listener
    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma !== null && event.beta !== null) {
        // Normalize tilt input vectors (-1 to 1 range)
        targetX = Math.max(-1, Math.min(1, event.gamma / 45));
        targetY = Math.max(-1, Math.min(1, (event.beta - 45) / 45));
      }
    };

    // Desktop mouse fallback for responsive tilt
    const handleMouseMove = (event: MouseEvent) => {
      targetX = (event.clientX / window.innerWidth) * 2 - 1;
      targetY = (event.clientY / window.innerHeight) * 2 - 1;
    };

    if (typeof window !== 'undefined') {
      if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation, true);
      }
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
    }

    // 6. Window Resize Handler
    const handleResize = () => {
      if (!renderer) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // 7. Render Loop with Smooth Spring Interpolation
    const run3DRenderLoop = () => {
      animId = requestAnimationFrame(run3DRenderLoop);

      // Rotate grid slowly for kinetic background energy
      meshGrid.rotation.z += 0.001;
      subGrid.rotation.z -= 0.0006;

      // Smooth out interpolation for natural movement responses
      meshGrid.position.x += (targetX * 18 - meshGrid.position.x) * 0.05;
      meshGrid.position.y += (-targetY * 18 - meshGrid.position.y) * 0.05;

      subGrid.position.x += (targetX * 8 - subGrid.position.x) * 0.03;
      subGrid.position.y += (-targetY * 8 - subGrid.position.y) * 0.03;

      renderer?.render(scene, camera);
    };

    run3DRenderLoop();

    // 8. Cleanup on unmount
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('deviceorientation', handleOrientation);
      window.removeEventListener('mousemove', handleMouseMove);
      geometry.dispose();
      material.dispose();
      subGeometry.dispose();
      subMaterial.dispose();
      renderer?.dispose();
    };
  }, []);

  return (
    <canvas
      id="omni-void-canvas"
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      style={{ opacity: 0.75 }}
      aria-hidden="true"
    />
  );
};
