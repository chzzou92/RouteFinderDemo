import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import mapboxgl from "mapbox-gl";

export default function createThreeCarLayer(map, modelTransform) {
  console.log("createThreeCarLayer called:", modelTransform);
  const scene = new THREE.Scene();
  const camera = new THREE.Camera();
  let car = null;
  let mercatorPath = [];
  let progress = 0;
  let currentAngle = 0;
  let distanceAlongPath = 0;
  const speed = 0.000000002; // adjust for smoothness

  let pendingPath = null;

  const directionalLight1 = new THREE.DirectionalLight(0xffffff);
  directionalLight1.position.set(0, -70, 100).normalize();
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff);
  directionalLight2.position.set(0, 70, 100).normalize();
  scene.add(directionalLight2);

  const loader = new GLTFLoader();
  loader.load("/Car1/car1.gltf", (gltf) => {
    car = gltf.scene;
    scene.add(car);
    if (pendingPath) {
      animateCar(pendingPath);
      pendingPath = null;
    }
  });

  let totalDistance = 0;
  let cumulativeDistances = [];

  function animateCar(path) {
    if (!car) {
      pendingPath = path;
      return;
    }
    if (path.length < 2) return;

    const scaledPath = path.map(([lng, lat]) => {
      const coord = mapboxgl.MercatorCoordinate.fromLngLat([lng, lat], 2);
      return new THREE.Vector3(coord.x, coord.y, coord.z);
    });

    // Compute distances
    totalDistance = 0;
    cumulativeDistances = [0];
    for (let i = 1; i < scaledPath.length; i++) {
      const dist = scaledPath[i].distanceTo(scaledPath[i - 1]);
      totalDistance += dist;
      cumulativeDistances.push(totalDistance);
    }

    mercatorPath = scaledPath;
    console.log(totalDistance);
    progress = 0;

    startAnimationLoop();
  }

  function updateCarPosition() {
    distanceAlongPath += speed;

    if (distanceAlongPath >= totalDistance) {
      distanceAlongPath = totalDistance;
      return;
    }

    let i = 0;
    while (
      i < cumulativeDistances.length - 1 &&
      cumulativeDistances[i + 1] < distanceAlongPath
    ) {
      i++;
    }

    const start = mercatorPath[i];
    const end = mercatorPath[i + 1];
    const segmentStartDist = cumulativeDistances[i];
    const segmentEndDist = cumulativeDistances[i + 1];
    const segmentLength = segmentEndDist - segmentStartDist;

    const localT = (distanceAlongPath - segmentStartDist) / segmentLength;

    // Lerp position
    modelTransform.translateX = (1 - localT) * start.x + localT * end.x;
    modelTransform.translateY = (1 - localT) * start.y + localT * end.y;
    modelTransform.translateZ = (1 - localT) * start.z + localT * end.z;

    // Calculate target angle for rotation (direction of current segment)
    const directionX = end.x - start.x;
    const directionY = end.y - start.y;
    const targetAngle = Math.atan2(directionX, directionY);

    // Calculate shortest angular difference to avoid big jumps
    let deltaAngle = targetAngle - currentAngle;
    if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    // Smoothly update currentAngle toward targetAngle
    const rotationSpeed = 0.001; // increase this to turn faster
    currentAngle += deltaAngle * rotationSpeed;

    modelTransform.rotateY = currentAngle;

    requestAnimationFrame(updateCarPosition);
  }

  const renderer = new THREE.WebGLRenderer({
    canvas: map.getCanvas(),
    context: map.painter.context.gl,
    antialias: true,
  });
  renderer.autoClear = false;

  function startAnimationLoop() {
    function loop() {
      modelTransform.translateX;
      requestAnimationFrame(loop);
    }
    loop();
  }

  const layer = {
    id: "3d-car-model",
    type: "custom",
    renderingMode: "3d",

    render: (gl, matrix) => {
      const rotationX = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(1, 0, 0),
        modelTransform.rotateX
      );
      const rotationY = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 1, 0),
        modelTransform.rotateY
      );
      const rotationZ = new THREE.Matrix4().makeRotationAxis(
        new THREE.Vector3(0, 0, 1),
        modelTransform.rotateZ
      );
      const m = new THREE.Matrix4().fromArray(matrix);
      const l = new THREE.Matrix4()
        .makeTranslation(
          modelTransform.translateX,
          modelTransform.translateY,
          modelTransform.translateZ
        )
        .scale(
          new THREE.Vector3(
            modelTransform.scale,
            -modelTransform.scale,
            modelTransform.scale
          )
        )
        .multiply(rotationX)
        .multiply(rotationY)
        .multiply(rotationZ);
      updateCarPosition();
      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      map.triggerRepaint();
    },
  };
  return { layer, animateCar };
}
