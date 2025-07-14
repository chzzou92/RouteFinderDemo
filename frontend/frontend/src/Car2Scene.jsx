import React, { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import AnimatedCar2 from "../public/Car2/AnimatedCar2";
import "./Car.css";
const Car2Scene = React.memo(() => {
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
          <AnimatedCar2 />
        </Suspense>
        <Environment preset="studio" />
      </Canvas>
    </div>
  );
});

export default Car2Scene;
