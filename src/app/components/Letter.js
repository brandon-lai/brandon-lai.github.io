import React, { useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Center, Text3D, MeshTransmissionMaterial, RenderTexture, Preload } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

export default function Letter({ char, children, stencilBuffer = false, ...props }) {
    const main = useRef()
    const contents = useRef()
    const events = useThree((state) => state.events)
    const controls = useThree((state) => state.controls)

    useFrame(() => contents.current.matrix.copy(main.current.matrixWorld))
    return (
      <RigidBody restitution={0.1} colliders="cuboid" {...props}>
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
    )
  }
