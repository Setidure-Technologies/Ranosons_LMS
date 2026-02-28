"use client";

import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

function Box(props: any) {
    const meshRef = useRef<THREE.Mesh>(null!);
    const [hovered, setHover] = useState(false);
    const [active, setActive] = useState(false);

    useFrame((state, delta) => (meshRef.current.rotation.x += delta * 0.2));

    return (
        <mesh
            {...props}
            ref={meshRef}
            scale={active ? 1.5 : 1}
            onClick={(event) => {
                setActive(!active);
                props.onClick && props.onClick();
            }}
            onPointerOver={(event) => setHover(true)}
            onPointerOut={(event) => setHover(false)}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color={hovered ? '#FF4500' : '#4682B4'} />
        </mesh>
    );
}

const MachineExplorer = () => {
    const [selectedPart, setSelectedPart] = useState<string | null>(null);

    return (
        <div className="h-[400px] w-full bg-slate-900/50 backdrop-blur-md rounded-2xl overflow-hidden relative border border-white/5">
            <div className="absolute top-4 left-4 z-10 glass-panel px-4 py-2 rounded-xl text-white">
                <h3 className="text-lg font-bold tracking-tight">Spring Coiling Machine</h3>
                <p className="text-xs text-blue-200 mt-1">Tap 3D parts to identify</p>
            </div>

            <Canvas className="bg-transparent" gl={{ alpha: true }}>
                <ambientLight intensity={0.5} />
                <spotLight position={[10, 10, 10]} angle={0.2} penumbra={1} intensity={1.5} />
                <pointLight position={[-10, -10, -10]} intensity={0.5} />

                {/* Placeholder for "Feeder" */}
                {/* Changed colors to match theme better: Metallic/Blue */}
                <Box position={[-1.2, 0, 0]} onClick={() => setSelectedPart("Feeder Mechanism")} />
                <Text position={[-1.2, 1.3, 0]} fontSize={0.15} color="#94a3b8">Feeder</Text>

                {/* Placeholder for "Coiling Point" */}
                <Box position={[1.2, 0, 0]} onClick={() => setSelectedPart("Coiling Point")} />
                <Text position={[1.2, 1.3, 0]} fontSize={0.15} color="#94a3b8">Coiler</Text>

                <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={Math.PI / 4} maxPolarAngle={Math.PI / 1.5} />
            </Canvas>

            {selectedPart && (
                <div className="absolute bottom-0 left-0 right-0 glass-panel p-5 rounded-t-3xl border-t border-white/10 animate-fade-in-up">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="text-blue-400 font-bold uppercase text-xs tracking-widest mb-1">Selected Component</h4>
                            <p className="text-white text-2xl font-bold">{selectedPart}</p>
                        </div>
                        <button
                            onClick={() => setSelectedPart(null)}
                            className="text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    </div>
                    <button className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">
                        View Training Module
                    </button>
                </div>
            )}
        </div>
    );
};

export default MachineExplorer;
