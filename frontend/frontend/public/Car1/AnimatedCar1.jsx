// AnimatedCar1.jsx
import React, { useEffect } from "react";
import { animated, useSpring, config } from "@react-spring/three";
import Car1 from "./Car1"; 

export default function AnimatedCar1(props) {
  const [spring, api] = useSpring(() => ({
    position: [0, 3, 0],
     scale: [2, 2, 2],
    config: {
      tension: 180,
      friction: 12,
      mass: 1,
      bounce: 0.4,
    },
  }));

  useEffect(() => {
    api.start({
      scale: [2,2,2],
      position: [0, -1.5, 0 ],
      config: {
        ...config.wobbly,
        bounce: 1,
      },
    });
  }, [api]);

  return (
    <animated.group position={spring.position} {...props}>
      <Car1 />
    </animated.group>
  );
}
