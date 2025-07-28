import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import AnimatedPeople from "../public/People/Man/AnimatedPeople";
import * as THREE from "three";
import "./Car.css";
const PassengerScene = React.memo(() => {
  return (
    <div className="car-canvas-wrapper">
      <Canvas>
        <ambientLight intensity={0} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={true}
          autoRotateSpeed={3.5}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
        />
        <Suspense fallback={null}>
          <AnimatedPeople />
        </Suspense>
        {/* <primitive object={new THREE.AxesHelper(2)} /> */}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
});

export default PassengerScene;
