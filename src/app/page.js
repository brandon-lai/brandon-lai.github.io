'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber'
import { Preload, Lightformer, Environment, CameraControls, ContactShadows } from '@react-three/drei'
import { Physics, CuboidCollider } from '@react-three/rapier'
import Letter from './components/Letter'
import LinkedInLogo from './components/LinkedInLogo'

export default function Home() {
  // State for camera properties
  const [cameraPosition, setCameraPosition] = useState([-20, 40, 30]);
  const [cameraFov, setCameraFov] = useState(45);

  // Reference to store base camera values
  const baseCamera = useRef({
    position: [-20, 40, 30],
    fov: 45
  });

  // Update camera based on screen size
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // Base width for standard desktop (adjust as needed)
      const baseWidth = 1440;
      
      // Calculate zoom factor based on screen width
      // Smaller screens get a larger factor (camera moves further back)
      let zoomFactor;
      
      if (width < 480) { // Mobile phones
        zoomFactor = 1.8;
      } else if (width < 768) { // Tablets
        zoomFactor = 1.5;
      } else if (width < 1024) { // Small laptops
        zoomFactor = 1.3;
      } else if (width < baseWidth) { // Medium screens
        zoomFactor = 1.1;
      } else { // Large screens
        zoomFactor = 1;
      }
      
      // Adjust FOV for extreme aspect ratios
      const aspectRatio = width / height;
      let newFov = baseCamera.current.fov;
      
      if (aspectRatio < 0.7) { // Very tall screens (mobile portrait)
        newFov = 98;
      } else if (aspectRatio > 2) { // Very wide screens
        newFov = 40;
      }
      
      // Apply zoom factor to base camera position
      const newPosition = baseCamera.current.position.map(coord => coord * zoomFactor);
      
      setCameraPosition(newPosition);
      setCameraFov(newFov);
    };
    
    // Set initial camera properties
    handleResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
      <Canvas dpr={[1.5, 2]} camera={{ 
        position: cameraPosition, 
        fov: cameraFov, 
        near: 1, 
        far: 300 
      }}>
        <Physics gravity={[0, -60, 0]}>
          <Letter char="B" position={[-30, 50, 0]} rotation={[0, 0, 0]} />
          <Letter char="R" position={[-17, 55, 0]} rotation={[0, 0, 0]} />
          <Letter char="A" position={[-4, 60, 0]} rotation={[0, 0, 0]} />
          <Letter char="N" position={[9, 65, 0]} rotation={[0, 0, 0]} />
          <Letter char="D" position={[22, 70, 0]} rotation={[0, 0, 0]} />
          <Letter char="O" position={[35, 75, 0]} rotation={[0, 0, 0]} />
          <Letter char="N" position={[48, 80, 0]} rotation={[0, 0, 0]} />

          <LinkedInLogo position={[10, 100, 20]} rotation={[50, 0, 0]} scale={5} />

          <CuboidCollider position={[0, -6, 0]} type="fixed" args={[100, 1, 100]} />
          <CuboidCollider position={[0, 0, 22]} type="fixed" args={[30, 100, 1]} />
          {/* <CuboidCollider position={[-30, 0, 0]} type="fixed" args={[1, 100, 30]} />
          <CuboidCollider position={[30, 0, 0]} type="fixed" args={[1, 100, 30]} /> */}
        </Physics>

        <Environment files="https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/dancing_hall_1k.hdr" resolution={1024}>

          <group rotation={[-Math.PI / 3, 0, 0]}>
            <Lightformer intensity={4} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={[10, 10, 1]} />
            {[2, 0, 2, 0, 2, 0, 2, 0].map((x, i) => (
              <Lightformer key={i} form="circle" intensity={4} rotation={[Math.PI / 2, 0, 0]} position={[x, 4, i * 4]} scale={[4, 1, 1]} />
            ))}
            <Lightformer intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={[50, 2, 1]} />
            <Lightformer intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={[50, 2, 1]} />
          </group>
        </Environment>

        <ContactShadows smooth={false} scale={100} position={[0, -5.05, 0]} blur={0.5} opacity={0.75} />

        <CameraControls makeDefault dollyToCursor minPolarAngle={0} maxPolarAngle={Math.PI / 2} />

        <Preload all />
      </Canvas>
    </div>
  );
}
