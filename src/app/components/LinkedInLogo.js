import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { RigidBody } from '@react-three/rapier';
import { useThree } from '@react-three/fiber';

export default function LinkedInLogo(props) {
  const { nodes, materials } = useGLTF('/scene.gltf');
  const { gl } = useThree();

  const handleClick = () => {
    window.open('https://www.linkedin.com/in/brandon-lai/', '_blank');
  };

  return (
    <RigidBody {...props} colliders="hull" restitution={0.5}>
      <group dispose={null} onClick={handleClick}>
        <group rotation={[-Math.PI / 2, 0, 0]}>
          <group position={[0, 3, 6]} scale={0.843}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_4.geometry}
              material={materials.glossy_linkedin}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_5.geometry}
              material={materials.glossy_putih}
            />
          </group>
        </group>
      </group>
    </RigidBody>
  );
}

useGLTF.preload('/scene.gltf')