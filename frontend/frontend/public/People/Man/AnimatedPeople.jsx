import React, { useEffect } from "react";
import { animated, useSpring, config } from "@react-spring/three";
import Man from "./Man";

export default function AnimatedPeople(props) {
  const [spring, api] = useSpring(() => ({
    position: [0, 30, 0],
    config: {
      tension: 180,
      friction: 12,
      mass: 1,
      bounce: 0.4,
    },
  }));

  useEffect(() => {
    api.start({
      position: [0, -1.55, 0],
      config: {
        ...config.wobbly,
        bounce: 1.5,
      },
    });
  }, [api]);

  return (
    <animated.group position={spring.position} {...props} >
      <Man />
    </animated.group>
  );
}
