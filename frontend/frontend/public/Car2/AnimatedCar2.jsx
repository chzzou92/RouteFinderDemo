import React, { useEffect } from "react";
import { animated, useSpring, config } from "@react-spring/three";
import Car2 from "./Car2"

export default function AnimatedCar2(props) {
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
      scale: [2, 2, 2],
      position: [0, -1.5, 0],
      config: {
        ...config.wobbly,
        bounce: 1,
      },
    });
  }, [api]);

  return (
    <animated.group position={spring.position} {...props} scale={spring.scale}>
      <Car2 />
    </animated.group>
  );
}
