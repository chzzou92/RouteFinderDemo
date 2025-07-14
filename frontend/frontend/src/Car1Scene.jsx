// CanvasScene.jsx
import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import AnimatedCar1 from "../public/Car1/AnimatedCar1";
import "./Car.css";
const Car1Scene = React.memo(() => {
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
          <AnimatedCar1 />
        </Suspense>
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
});

export default Car1Scene;
