import React, { useRef, useEffect, useState } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Center, Text3D, MeshTransmissionMaterial, RenderTexture, Preload } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export default function Letter({ char, children, stencilBuffer = false, ...props }) {
    const main = useRef();
    const contents = useRef();
    const rigidBodyRef = useRef();
    const audioContextRef = useRef(null);
    const [hasPlayedSound, setHasPlayedSound] = useState(false); // Track if sound has played for this instance
    const events = useThree((state) => state.events);
    const controls = useThree((state) => state.controls);

    // Attempt to initialize audio context immediately
    useEffect(() => {
      if (!audioContextRef.current && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
        try {
          audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          console.warn("Could not initialize AudioContext automatically:", e);
          // Fallback: Initialize on first click if automatic initialization fails
          const initAudioOnClick = () => {
            if (!audioContextRef.current) {
              try {
                audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
                console.log("AudioContext initialized on user interaction.");
              } catch (err) {
                console.error("Failed to initialize AudioContext on click:", err);
              }
            }
            document.removeEventListener('click', initAudioOnClick);
          };
          document.addEventListener('click', initAudioOnClick);
          return () => document.removeEventListener('click', initAudioOnClick);
        }
      }
    }, []);

    // Function to generate a collision sound
    const playCollisionSound = () => {
      if (!audioContextRef.current) {
        console.warn("AudioContext not available to play sound.");
        return;
      }
      
      try {
        const ctx = audioContextRef.current;
        // Ensure context is running (might be suspended initially)
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        const charCode = char.charCodeAt(0);
        const baseFrequency = 200 + (charCode % 10) * 30;
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(baseFrequency, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.5, ctx.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.1);
      } catch (err) {
        console.error('Error playing collision sound:', err);
      }
    };

    // Collision handler function to be passed as a prop
    const handleCollision = (payload) => {
      // Only play if sound hasn't been played yet for this instance
      if (!hasPlayedSound) {
        const totalForceMagnitude = payload.totalForceMagnitude;
        
        // Play sound for significant impacts
        if (totalForceMagnitude > 10) { 
          playCollisionSound();
          setHasPlayedSound(true); // Set flag to true after playing once
        }
      }
    };

    useFrame(() => contents.current.matrix.copy(main.current.matrixWorld));
    
    return (
      <RigidBody 
        ref={rigidBodyRef} 
        restitution={0.1} 
        colliders="cuboid" 
        onContactForce={handleCollision} // Pass the handler as a prop
        contactForceEventThreshold={10} // Set threshold via prop
        {...props}
      >
        <Center ref={main}>
          <Text3D
            bevelEnabled
            onDoubleClick={(e) => (e.stopPropagation(), controls.fitToBox(main.current, true))}
            font="/bold.blob"
            smooth={1}
            scale={0.125}
            size={80}
            height={4}
            curveSegments={10}
            bevelThickness={10}
            bevelSize={2}
            bevelOffset={0}
            bevelSegments={5}>
            {char}
            <MeshTransmissionMaterial clearcoat={1} samples={3} thickness={40} chromaticAberration={0.25} anisotropy={0.4}>
              <RenderTexture attach="buffer" stencilBuffer={stencilBuffer} width={512} height={512} compute={events.compute}>
                <color attach="background" args={['#4682B4']} />
                <meshStandardMaterial color="#4682B4" emissive="#4682B4" emissiveIntensity={0.5} />
                <group ref={contents} matrixAutoUpdate={false}>
                  {children}
                </group>
                <Preload all />
              </RenderTexture>
            </MeshTransmissionMaterial>
          </Text3D>
        </Center>
      </RigidBody>
    );
}
